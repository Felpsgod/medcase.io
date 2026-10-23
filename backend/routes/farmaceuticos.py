"""
Marketplace de farmacêuticos (prévia)

GET  /api/farmaceuticos              ?busca=&especialidade=  -> {farmaceuticos: [...]}
POST /api/farmaceuticos/<id>/agendamentos   {data, periodo, motivo} -> {agendamento}
GET  /api/agendamentos               -> {agendamentos: [...]} do usuário logado
"""
from flask import Blueprint, g, jsonify, request

from models import Agendamento, Farmaceutico, Notificacao, db
from models.farmaceutico import PERIODOS
from .utils import corpo, data_valida, erro, login_obrigatorio, texto

bp = Blueprint("farmaceuticos", __name__)


@bp.get("/farmaceuticos")
@login_obrigatorio
def listar():
    busca = (request.args.get("busca") or "").strip().lower()
    especialidade = (request.args.get("especialidade") or "").strip()

    query = Farmaceutico.query.filter_by(ativo=True)
    if especialidade:
        query = query.filter_by(especialidade=especialidade)
    lista = query.order_by(Farmaceutico.id).all()
    if busca:  # filtro em Python: o lower() do SQLite não trata acentos
        lista = [f for f in lista if busca in f.nome.lower() or busca in f.especialidade.lower()]
    return jsonify({"farmaceuticos": [f.to_dict() for f in lista]})


@bp.post("/farmaceuticos/<int:farmaceutico_id>/agendamentos")
@login_obrigatorio
def agendar(farmaceutico_id):
    farma = db.session.get(Farmaceutico, farmaceutico_id)
    if not farma or not farma.ativo:
        return erro("Farmacêutico não encontrado.", 404)

    dados = corpo()
    data_pref, periodo = texto(dados, "data"), texto(dados, "periodo", "Manhã")
    if data_pref and not data_valida(data_pref):
        return erro("Data deve estar no formato AAAA-MM-DD.")
    if periodo not in PERIODOS:
        return erro("Período inválido (Manhã, Tarde ou Noite).")

    ag = Agendamento(
        usuario_id=g.usuario.id, farmaceutico_id=farma.id, data=data_pref, periodo=periodo, motivo=texto(dados, "motivo")
    )
    db.session.add(ag)
    Notificacao.criar(g.usuario.id, "Consulta solicitada", f"Pedido de consulta com {farma.nome} enviado.")
    db.session.commit()
    return jsonify({"agendamento": ag.to_dict()}), 201


@bp.get("/agendamentos")
@login_obrigatorio
def meus_agendamentos():
    ags = Agendamento.query.filter_by(usuario_id=g.usuario.id).order_by(Agendamento.criado_em.desc()).all()
    return jsonify({"agendamentos": [a.to_dict() for a in ags]})
