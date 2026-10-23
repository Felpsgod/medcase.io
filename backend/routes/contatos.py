"""
Contatos de acompanhamento (familiares / médicos)

GET    /api/contatos            -> {contatos: [...]}
POST   /api/contatos            {tipo, nome, telefone} -> {contato}
PUT    /api/contatos/<id>       {tipo, nome, telefone} -> {contato}
DELETE /api/contatos/<id>       -> {ok}
"""
from flask import Blueprint, g, jsonify

from models import Contato, Notificacao, db
from models.contato import TIPOS_CONTATO
from .utils import corpo, erro, login_obrigatorio, texto

bp = Blueprint("contatos", __name__)


def _ler_dados():
    dados = corpo()
    tipo, nome, telefone = texto(dados, "tipo", "Familiar"), texto(dados, "nome"), texto(dados, "telefone")
    if tipo not in TIPOS_CONTATO:
        return None, erro("Tipo de contato inválido (Familiar ou Médico).")
    if not nome or not telefone:
        return None, erro("Preencha nome e telefone.")
    return {"tipo": tipo, "nome": nome, "telefone": telefone}, None


def _buscar(contato_id):
    return Contato.query.filter_by(id=contato_id, usuario_id=g.usuario.id).first()


@bp.get("/contatos")
@login_obrigatorio
def listar():
    contatos = Contato.query.filter_by(usuario_id=g.usuario.id).order_by(Contato.id).all()
    return jsonify({"contatos": [c.to_dict() for c in contatos]})


@bp.post("/contatos")
@login_obrigatorio
def criar():
    dados, falha = _ler_dados()
    if falha:
        return falha
    contato = Contato(usuario_id=g.usuario.id, **dados)
    db.session.add(contato)
    Notificacao.criar(g.usuario.id, "Acompanhamento", f"{contato.nome} foi adicionado aos contatos.")
    db.session.commit()
    return jsonify({"contato": contato.to_dict()}), 201


@bp.put("/contatos/<int:contato_id>")
@login_obrigatorio
def atualizar(contato_id):
    contato = _buscar(contato_id)
    if not contato:
        return erro("Contato não encontrado.", 404)
    dados, falha = _ler_dados()
    if falha:
        return falha
    for campo, valor in dados.items():
        setattr(contato, campo, valor)
    Notificacao.criar(g.usuario.id, "Acompanhamento", f"{contato.nome} teve o contato atualizado.")
    db.session.commit()
    return jsonify({"contato": contato.to_dict()})


@bp.delete("/contatos/<int:contato_id>")
@login_obrigatorio
def remover(contato_id):
    contato = _buscar(contato_id)
    if not contato:
        return erro("Contato não encontrado.", 404)
    db.session.delete(contato)
    Notificacao.criar(g.usuario.id, "Contato Removido", "O acompanhamento foi excluído com sucesso.")
    db.session.commit()
    return jsonify({"ok": True})
