"""
Dados agregados do usuário — chamado pelo app a cada 3s (carregarDados).
Devolve o MESMO formato que o app lia do Firebase, para a lógica de doses
do front continuar igual:

GET /api/dados -> {
    "slots_maleta":  {"slot_1": {...medicamento, historico_tomadas}},
    "tags_pulseira": {"tag_1":  {...}},
    "contatos":      {"<id>": {...}},
    "notificacoes":  {"<id>": {...}}   (últimas 100)
}
"""
from flask import Blueprint, g, jsonify
from sqlalchemy.orm import selectinload

from models import Contato, Medicamento, Notificacao
from .utils import login_obrigatorio

bp = Blueprint("dados", __name__)

LIMITE_NOTIFICACOES = 100


@bp.get("/dados")
@login_obrigatorio
def dados():
    uid = g.usuario.id
    # selectinload: carrega o histórico de todos os remédios numa query só
    meds = Medicamento.query.filter_by(usuario_id=uid).options(selectinload(Medicamento.tomadas)).all()
    contatos = Contato.query.filter_by(usuario_id=uid).order_by(Contato.id).all()
    notifs = (
        Notificacao.query.filter_by(usuario_id=uid)
        .order_by(Notificacao.data.desc(), Notificacao.id.desc())
        .limit(LIMITE_NOTIFICACOES)
        .all()
    )
    return jsonify(
        {
            "slots_maleta": {m.chave: m.to_dict() for m in meds if m.dispositivo == "maleta"},
            "tags_pulseira": {m.chave: m.to_dict() for m in meds if m.dispositivo == "tag"},
            "contatos": {str(c.id): c.to_dict() for c in contatos},
            "notificacoes": {str(n.id): n.to_dict() for n in notifs},
        }
    )
