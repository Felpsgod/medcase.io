"""
Notificações internas (sino + tela de Alertas)

GET  /api/notificacoes              -> {notificacoes: [...]} (mais recentes primeiro)
POST /api/notificacoes              {titulo, mensagem} -> {notificacao}
PUT  /api/notificacoes/lidas        marca todas como lidas
"""
from flask import Blueprint, g, jsonify

from models import Notificacao, db
from .utils import corpo, erro, login_obrigatorio, texto

bp = Blueprint("notificacoes", __name__)


@bp.get("/notificacoes")
@login_obrigatorio
def listar():
    notifs = (
        Notificacao.query.filter_by(usuario_id=g.usuario.id)
        .order_by(Notificacao.data.desc(), Notificacao.id.desc())
        .all()
    )
    return jsonify({"notificacoes": [n.to_dict() for n in notifs]})


@bp.post("/notificacoes")
@login_obrigatorio
def criar():
    """Usado pelo app para eventos que acontecem só no aparelho (ex.: permissão de push concedida)."""
    dados = corpo()
    titulo, mensagem = texto(dados, "titulo"), texto(dados, "mensagem")
    if not titulo or not mensagem:
        return erro("Informe título e mensagem.")
    notif = Notificacao.criar(g.usuario.id, titulo, mensagem)
    db.session.commit()
    return jsonify({"notificacao": notif.to_dict()}), 201


@bp.put("/notificacoes/lidas")
@login_obrigatorio
def marcar_lidas():
    Notificacao.query.filter_by(usuario_id=g.usuario.id, lida=False).update({"lida": True})
    db.session.commit()
    return jsonify({"ok": True})
