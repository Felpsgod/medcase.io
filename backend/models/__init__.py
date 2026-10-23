"""
Models do MedCase (SQLAlchemy + SQLite).

Tabelas:
    usuarios, sessoes                -> contas e login (substitui contas_medcase)
    medicamentos, tomadas            -> slots da maleta / tags + histórico de doses
    contatos                         -> acompanhamento (familiares e médicos)
    notificacoes                     -> alertas internos
    dispositivos_esp, logs_esp       -> integração ESP32 (substitui vinculos_esp)
    farmaceuticos, agendamentos      -> marketplace de farmacêuticos
    mensagens_whatsapp               -> histórico de envios pela API de WhatsApp
"""
import sqlite3
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine

db = SQLAlchemy()


@event.listens_for(Engine, "connect")
def _ativar_foreign_keys(dbapi_connection, _record):
    """O SQLite só respeita ON DELETE CASCADE com esse PRAGMA ligado."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def agora_utc():
    """datetime UTC "ingênuo" (o SQLite não guarda fuso)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt):
    """datetime UTC -> '2026-10-22T13:00:00Z' (o JavaScript converte para o fuso local)."""
    return dt.isoformat(timespec="seconds") + "Z" if dt else None


# Importados depois de `db` existir (evita import circular)
from .usuario import Usuario, Sessao  # noqa: E402,F401
from .medicamento import Medicamento, Tomada  # noqa: E402,F401
from .contato import Contato  # noqa: E402,F401
from .notificacao import Notificacao  # noqa: E402,F401
from .dispositivo import DispositivoESP, LogESP  # noqa: E402,F401
from .farmaceutico import Farmaceutico, Agendamento  # noqa: E402,F401
from .whatsapp import MensagemWhatsapp  # noqa: E402,F401
