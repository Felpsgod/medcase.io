#!/usr/bin/env bash
# Provisiona o MedCase (API Flask + API WhatsApp) no Oracle Linux 9.
#
#   sudo bash setup-vm.sh
#
# Idempotente: pode rodar de novo sem quebrar nada.
#
# A configuração (porta inclusive) NÃO fica aqui: fica em /opt/medcase/.env,
# criado por este script na primeira execução e nunca sobrescrito depois.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/medcase}"
APP_USER="${APP_USER:-case}"
REPO_URL="${REPO_URL:-https://github.com/Felpsgod/medcase.io.git}"
NODE_STREAM="${NODE_STREAM:-22}"
COM_WHATSAPP="${COM_WHATSAPP:-1}"   # 0 = instala só a API Flask

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!   %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mERRO: %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "rode com sudo."
id "$APP_USER" &>/dev/null || die "usuário '$APP_USER' não existe nesta VM."

source /etc/os-release
log "Sistema: ${PRETTY_NAME:-desconhecido}"
[[ "${VERSION_ID%%.*}" == "9" ]] || warn "script escrito para a família EL9; detectado ${VERSION_ID:-?}."

# ------------------------------------------------------------------- base + git
log "Instalando pacotes base"
dnf install -y git python3 python3-pip python3-devel gcc

# O OL9 traz Python 3.9 de fábrica, que é exatamente o mínimo do Flask 3.1.
PYTHON_BIN="$(command -v python3)"
"$PYTHON_BIN" -c 'import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)' \
    || die "python3 é $("$PYTHON_BIN" -V 2>&1), mas Flask 3.1 exige >= 3.9."
log "Python: $("$PYTHON_BIN" -V 2>&1)"

# ----------------------------------------------------------------- código fonte
log "Preparando $APP_DIR"
mkdir -p "$APP_DIR" "$APP_DIR/data"
if [[ -d "$APP_DIR/.git" ]]; then
    runuser -u "$APP_USER" -- git -C "$APP_DIR" pull --ff-only
else
    tmp_clone="$(mktemp -d)"
    git clone --depth 1 "$REPO_URL" "$tmp_clone/repo"
    shopt -s dotglob; mv "$tmp_clone/repo"/* "$APP_DIR"/; shopt -u dotglob
    rm -rf "$tmp_clone"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ------------------------------------------------------------------------ .env
# Fonte única de configuração. Criado uma vez; rodar o script de novo não o toca,
# para não apagar chaves que você já tenha colocado aqui.
if [[ ! -f "$APP_DIR/.env" ]]; then
    log "Criando $APP_DIR/.env (edite-o para mudar a porta e as chaves)"
    cat > "$APP_DIR/.env" <<'ENVFILE'
# Configuração do MedCase. Após editar:
#   sudo systemctl restart medcase-api
# Sintaxe: CHAVE=valor, uma por linha, sem 'export' e sem aspas.

# --- porta da API Flask ---
PORT=5000

# --- API de WhatsApp (whatsapp/api.js) ---
WHATSAPP_API_URL=http://127.0.0.1:3005
# 0 = não avisa os contatos a cada dose registrada
WHATSAPP_AVISAR_CONTATOS=1

# --- push (OneSignal); vazio = não envia ---
ONESIGNAL_REST_API_KEY=

# --- gunicorn (opcionais) ---
# WEB_CONCURRENCY=3
# WEB_TIMEOUT=120
# LOG_LEVEL=info
ENVFILE
    chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"   # contém chave de API
else
    log "$APP_DIR/.env já existe — preservado"
fi
# shellcheck disable=SC1091
PORT="$(grep -E '^\s*PORT=' "$APP_DIR/.env" | tail -1 | cut -d= -f2 | tr -d '[:space:]' || true)"
PORT="${PORT:-5000}"
log "Porta da API lida do .env: $PORT"

# ------------------------------------------------------------------ venv Flask
log "Criando virtualenv e instalando dependências"
runuser -u "$APP_USER" -- "$PYTHON_BIN" -m venv "$APP_DIR/.venv"
runuser -u "$APP_USER" -- "$APP_DIR/.venv/bin/pip" install --upgrade pip wheel
runuser -u "$APP_USER" -- "$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/deploy/requirements-prod.txt"

# -------------------------------------------------------------------- whatsapp
if [[ "$COM_WHATSAPP" == "1" ]]; then
    log "Instalando Node $NODE_STREAM e as dependências do Chromium"
    dnf module reset -y nodejs 2>/dev/null || true
    dnf module enable -y "nodejs:$NODE_STREAM" 2>/dev/null \
        || warn "módulo nodejs:$NODE_STREAM indisponível; usando o nodejs do AppStream."
    # No EL9 o npm e um RPM separado: 'dnf install nodejs' NAO o traz junto.
    dnf install -y nodejs npm

    node -e 'process.exit(parseInt(process.versions.node) >= 18 ? 0 : 1)' \
        || die "Node é $(node -v), mas express@5 e whatsapp-web.js exigem >= 18."
    log "Node: $(node -v)"

    # O Chromium que o puppeteer baixa é dinamicamente ligado a estas libs.
    dnf install -y \
        nss atk at-spi2-atk cups-libs libdrm libxkbcommon libXcomposite \
        libXdamage libXrandr libXScrnSaver libgbm pango alsa-lib \
        at-spi2-core mesa-libgbm 2>/dev/null \
        || warn "algum pacote do Chromium não foi encontrado; veja o log se o QR não aparecer."

    mkdir -p "$APP_DIR/data/puppeteer"
    chown -R "$APP_USER:$APP_USER" "$APP_DIR/data"

    log "Instalando pacotes npm (baixa o Chromium, pode demorar)"
    runuser -u "$APP_USER" -- env PUPPETEER_CACHE_DIR="$APP_DIR/data/puppeteer" \
        npm --prefix "$APP_DIR/whatsapp" ci || \
    runuser -u "$APP_USER" -- env PUPPETEER_CACHE_DIR="$APP_DIR/data/puppeteer" \
        npm --prefix "$APP_DIR/whatsapp" install
fi

# ---------------------------------------------------------------------- systemd
log "Instalando os serviços systemd"
# As units tem __APP_USER__ como placeholder, para o repositorio nao ficar
# amarrado a um nome de usuario.
instalar_unit() {
    sed "s/__APP_USER__/$APP_USER/g" "$APP_DIR/deploy/$1" > "/etc/systemd/system/$1"
    chmod 0644 "/etc/systemd/system/$1"
}
instalar_unit medcase-api.service
if [[ "$COM_WHATSAPP" == "1" ]]; then
    instalar_unit medcase-whatsapp.service
fi
systemctl daemon-reload
if [[ "$COM_WHATSAPP" == "1" ]]; then
    systemctl enable --now medcase-whatsapp
fi
systemctl enable --now medcase-api
systemctl restart medcase-api   # garante que pegou um .env recém-editado

# --------------------------------------------------------------------- firewall
# A porta 3005 fica DE FORA de propósito: a API de WhatsApp não tem
# autenticação nenhuma. Só o backend, no mesmo host, deve alcançá-la.
log "Liberando a porta $PORT no firewalld"
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-port="$PORT/tcp" >/dev/null
    firewall-cmd --reload >/dev/null
    echo "aberta: $PORT/tcp"
else
    warn "firewalld não está ativo — nada a fazer."
fi

# ----------------------------------------------------------------------- health
log "Verificando"
sleep 4
systemctl --no-pager --lines=15 status medcase-api || true
echo
if curl -fsS "http://127.0.0.1:$PORT/api/health"; then
    ip="$(hostname -I | awk '{print $1}')"
    echo -e "\n\n✅ API no ar em http://$ip:$PORT/api"
    echo "   Configuração: $APP_DIR/.env    (depois de editar: systemctl restart medcase-api)"
    if [[ "$COM_WHATSAPP" == "1" ]]; then
        echo -e "\n📱 WhatsApp: pareie escaneando o QR code em"
        echo "   ssh -L 3005:127.0.0.1:3005 $APP_USER@$ip   e abra http://localhost:3005/qr"
        echo "   (ou veja no terminal: journalctl -u medcase-whatsapp -f)"
    fi
else
    die "o /api/health não respondeu — veja: journalctl -u medcase-api -n 50"
fi
