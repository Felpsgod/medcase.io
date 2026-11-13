"""
Configuração do gunicorn para a API MedCase.

Tudo vem de variáveis de ambiente, que o systemd carrega de /opt/medcase/.env
(ver medcase-api.service). Assim a porta e os workers são ajustados editando
UM arquivo na VM, sem tocar na unit nem na linha de comando.
"""
import multiprocessing
import os

# Porta: mesma variável que o init.py usa quando rodado direto (python init.py),
# então o comportamento é idêntico em dev e em produção.
_porta = os.environ.get("PORT", "5000")
_host = os.environ.get("HOST", "0.0.0.0")
bind = f"{_host}:{_porta}"

# A fórmula clássica do gunicorn — (2 x núcleos) + 1 — daria 9 nesta VM de
# 4 vCPU, o que não serve aqui por dois motivos:
#   - são 3,4 GB de RAM, e o Chromium do WhatsApp roda no mesmo host;
#   - o banco é SQLite: escrita é serializada por lock, então workers extras
#     só geram contenção, não vazão.
# 3 workers x 2 threads atendem bem o padrão de uso (polling de 3s do app).
# Suba via WEB_CONCURRENCY se migrar para PostgreSQL.
workers = int(os.environ.get("WEB_CONCURRENCY", min(multiprocessing.cpu_count(), 3)))
threads = int(os.environ.get("WEB_THREADS", 2))

# O app faz chamadas externas (WhatsApp, OneSignal); sem folga o worker morreria
# no meio de um envio.
timeout = int(os.environ.get("WEB_TIMEOUT", 120))
graceful_timeout = 30
keepalive = 5

# Logs vão para stdout/stderr, que o systemd entrega ao journald.
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info")

proc_name = "medcase-api"
forwarded_allow_ips = os.environ.get("FORWARDED_ALLOW_IPS", "127.0.0.1")
