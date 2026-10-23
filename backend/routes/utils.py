"""Funções compartilhadas pelas rotas."""
import json
import re
import threading
import urllib.error
import urllib.request
from functools import wraps

from flask import current_app, g, jsonify, request

from models import MensagemWhatsapp, Sessao, Usuario, db

HORA_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DATA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def erro(mensagem, status=400):
    """Resposta de erro padrão: {"erro": "..."}"""
    return jsonify({"erro": mensagem}), status


def corpo():
    """JSON do corpo da requisição (ou {} se vazio/inválido)."""
    dados = request.get_json(silent=True)
    return dados if isinstance(dados, dict) else {}


def texto(dados, campo, padrao=""):
    valor = dados.get(campo, padrao)
    return str(valor).strip() if valor is not None else padrao


def hora_valida(valor):
    return bool(valor) and bool(HORA_RE.match(valor))


def data_valida(valor):
    return bool(valor) and bool(DATA_RE.match(valor))


# ----------------------------------------------------------------------
# Autenticação
# ----------------------------------------------------------------------
def token_da_requisicao():
    cabecalho = request.headers.get("Authorization", "")
    return cabecalho[7:].strip() if cabecalho.startswith("Bearer ") else None


def login_obrigatorio(func):
    """Exige header Authorization: Bearer <token>. Disponibiliza g.usuario e g.sessao."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        token = token_da_requisicao()
        sessao = db.session.get(Sessao, token) if token else None
        if not sessao:
            return erro("Sessão inválida ou expirada. Faça login novamente.", 401)
        g.sessao = sessao
        g.usuario = db.session.get(Usuario, sessao.usuario_id)
        return func(*args, **kwargs)

    return wrapper


# ----------------------------------------------------------------------
# WhatsApp — API Node da pasta whatsapp/ (whatsapp-web.js, porta 3005)
#   POST {WHATSAPP_API_URL}/enviar  {numero, mensagem}
#   200 {success} | 400 {error: "Número não possui WhatsApp"} | 503 {error: "WhatsApp não conectado"}
# ----------------------------------------------------------------------
# Abaixo do timeout do app (15s), para o servidor responder antes do app desistir
WHATSAPP_TIMEOUT = 12


def normalizar_numero(telefone):
    """'(55) 99999-9999' -> '5555999999999'.

    A API do WhatsApp só adiciona o 55 quando o número não começa com 55, e
    isso quebraria DDD 55 (RS). Por isso o DDI é posto aqui: número
    brasileiro com DDD tem 10 ou 11 dígitos.
    """
    digitos = re.sub(r"\D", "", telefone or "")
    if len(digitos) in (10, 11):
        digitos = "55" + digitos
    return digitos


def enviar_whatsapp(telefone, mensagem, base_url):
    """Envia uma mensagem pela API de WhatsApp. Retorna (ok, motivo_da_falha)."""
    numero = normalizar_numero(telefone)
    if len(numero) < 12:
        return False, "Telefone inválido"
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/enviar",
        data=json.dumps({"numero": numero, "mensagem": mensagem}).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=WHATSAPP_TIMEOUT) as resp:
            resp.read()
        return True, None
    except urllib.error.HTTPError as exc:  # 400 / 503 / 500 da API
        try:
            motivo = json.loads(exc.read().decode("utf-8")).get("error")
        except ValueError:
            motivo = None
        return False, motivo or f"Erro {exc.code} na API do WhatsApp"
    except (urllib.error.URLError, TimeoutError, OSError):
        return False, "API do WhatsApp fora do ar"


def avisar_contatos(usuario, mensagem):
    """Manda a mensagem para todos os contatos de acompanhamento do usuário,
    em segundo plano (cada envio leva alguns segundos no whatsapp-web.js).
    Retorna quantos contatos serão avisados."""
    destinos = [c.telefone for c in usuario.contatos if c.telefone]
    if not destinos or not current_app.config.get("WHATSAPP_AVISAR_CONTATOS"):
        return 0
    app = current_app._get_current_object()
    usuario_id = usuario.id

    def _enviar_todos():
        with app.app_context():
            for telefone in destinos:
                ok, motivo = enviar_whatsapp(telefone, mensagem, app.config["WHATSAPP_API_URL"])
                if not ok:
                    print(f"[whatsapp] falha ao avisar {telefone}: {motivo}")
                db.session.add(
                    MensagemWhatsapp(
                        usuario_id=usuario_id, tipo="aviso_dose", telefone=telefone, mensagem=mensagem, enviado=ok, erro=motivo
                    )
                )
            db.session.commit()

    threading.Thread(target=_enviar_todos, daemon=True).start()
    return len(destinos)


# ----------------------------------------------------------------------
# Push (OneSignal) — antes era disparado pelo próprio app com a REST key
# embutida; agora o servidor envia, e só para o usuário certo.
# ----------------------------------------------------------------------
def enviar_push(usuario, titulo, mensagem):
    chave = current_app.config.get("ONESIGNAL_REST_API_KEY")
    if not chave or not usuario.pref_push:
        return
    payload = {
        "app_id": current_app.config["ONESIGNAL_APP_ID"],
        # O app faz OneSignal.login(String(usuario.id)) -> external_id
        "include_aliases": {"external_id": [str(usuario.id)]},
        "target_channel": "push",
        "headings": {"en": titulo, "pt": titulo},
        "contents": {"en": mensagem, "pt": mensagem},
    }
    req = urllib.request.Request(
        "https://api.onesignal.com/notifications",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8", "Authorization": f"Key {chave}"},
        method="POST",
    )

    def _enviar():
        try:
            urllib.request.urlopen(req, timeout=10).read()
        except Exception as exc:  # noqa: BLE001 - push nunca deve derrubar a requisição
            print(f"[push] falha ao enviar para OneSignal: {exc}")

    # Em thread para não atrasar a resposta da API
    threading.Thread(target=_enviar, daemon=True).start()
