# Deploy na VM

Alvo: **192.168.2.127** — Oracle Linux Server 9.8 (`srv-case`), usuário `case`.

| Serviço | Unit | Porta | Exposta na rede |
|---|---|---|---|
| API Flask (gunicorn) | `medcase-api.service` | 5000 (configurável) | sim |
| API WhatsApp (Node) | `medcase-whatsapp.service` | 3005 | **não**, só localhost |

A 3005 fica fechada no firewall de propósito: `whatsapp/api.js` não tem
autenticação nenhuma. Só o backend, no mesmo host, precisa alcançá-la.

## Onde se configura a porta

Num único arquivo na VM: **`/opt/medcase/.env`**.

```bash
sudo -u case nano /opt/medcase/.env     # PORT=8080
sudo systemctl restart medcase-api
sudo firewall-cmd --permanent --add-port=8080/tcp && sudo firewall-cmd --reload
```

A cadeia é: o systemd lê o `.env` via `EnvironmentFile`, e
[`gunicorn.conf.py`](gunicorn.conf.py) monta o `bind` a partir de `PORT`. Nem a
unit nem a linha de comando têm a porta fixa. É a mesma variável `PORT` que o
`init.py` usa em desenvolvimento, então o comportamento é idêntico nos dois casos.

O `.env` é criado na primeira execução do `setup-vm.sh` e **nunca sobrescrito**
depois — rodar o script de novo não apaga as chaves que você colocou lá.

### Definir a porta ANTES do primeiro deploy

Como o script preserva um `.env` existente, dá para escrever a porta na VM antes
de rodá-lo — assim ela nunca passa pela linha de comando nem por um chat:

```bash
ssh medcase-vm
sudo install -d -o case -g case /opt/medcase
sudo -u case tee /opt/medcase/.env >/dev/null <<'EOF'
PORT=SUA_PORTA
WHATSAPP_API_URL=http://127.0.0.1:3005
WHATSAPP_AVISAR_CONTATOS=1
ONESIGNAL_REST_API_KEY=
EOF
sudo chmod 600 /opt/medcase/.env
```

O `setup-vm.sh` vai detectar esse arquivo, respeitá-lo, e abrir **essa** porta no
firewalld — ele lê o `PORT` do `.env` em vez de assumir 5000.

Variáveis reconhecidas: `PORT`, `WHATSAPP_API_URL`, `WHATSAPP_AVISAR_CONTATOS`,
`ONESIGNAL_REST_API_KEY`, `DATABASE_URL`, e as do gunicorn (`WEB_CONCURRENCY`,
`WEB_TIMEOUT`, `LOG_LEVEL`).

## Pré-requisito: SSH

A porta 22 da .127 recusava conexão. Duas causas possíveis:

**(a) O SSH está numa porta não padrão.** Então só o `~/.ssh/config` da sua
máquina precisa saber disso — já existe um bloco `Host medcase-vm` lá, basta
preencher a `Port` e descomentar:

```sshconfig
Host medcase-vm
  HostName 192.168.2.127
  User case
  Port 2222          # <- a sua porta
```

Daí em diante tudo usa o apelido `medcase-vm`, e a porta não aparece em nenhum
comando. Confira com `ssh -G medcase-vm | grep ^port`.

**(b) O `sshd` não está rodando.** No console do VMware, como root:

```bash
systemctl enable --now sshd
firewall-cmd --permanent --add-service=ssh && firewall-cmd --reload
```

## Deploy

```bash
scp deploy/setup-vm.sh medcase-vm:/tmp/
ssh medcase-vm 'sudo bash /tmp/setup-vm.sh'
```

Idempotente. Instala Python 3.9 + Node 22, clona o repositório em `/opt/medcase`,
cria o virtualenv, instala as units, abre a porta da API no firewalld e checa o
`/api/health`.

Para subir **só** a API Flask, sem o WhatsApp: `sudo COM_WHATSAPP=0 bash /tmp/setup-vm.sh`.

## Por que o OL9 simplifica

- **Python**: o OL9 traz 3.9 de fábrica, que é exatamente o mínimo do `Flask>=3.1`.
  Nada a compilar. (No OL7 seria 3.6, e a 3.9 teria que vir do fonte.)
- **Node e Chromium**: o OL9 tem glibc 2.34, então Node 22 e o Chromium do
  puppeteer rodam nativamente. No OL7 (glibc 2.17) nenhum dos dois carregava, e a
  API de WhatsApp só funcionaria em container.

## Pareamento do WhatsApp

O `LocalAuth` grava a sessão em `/opt/medcase/data/puppeteer`, fora da árvore do
git, para que um `git pull` não derrube o pareamento e exija novo QR code. Na
primeira vez:

```bash
ssh -L 3005:127.0.0.1:3005 medcase-vm
# e abra http://localhost:3005/qr no navegador local
```

O túnel SSH evita abrir a 3005 na rede. Alternativa pelo terminal:
`journalctl -u medcase-whatsapp -f` (o QR é desenhado em ASCII).

## Operação

```bash
systemctl status medcase-api medcase-whatsapp
journalctl -u medcase-api -f
curl http://192.168.2.127:5000/api/health
```

Atualizar o código:

```bash
cd /opt/medcase && sudo -u case git pull && sudo systemctl restart medcase-api
```

O banco fica em `/opt/medcase/data/medcase.db`, fora da árvore do git — um
`git pull` nunca o toca. É criado vazio, e os farmacêuticos são populados na
primeira execução.
