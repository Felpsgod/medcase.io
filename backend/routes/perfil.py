"""
Perfil e preferências do usuário logado

GET /api/perfil                                 -> {usuario}
PUT /api/perfil               {nome, telefone, tipo_sanguineo, alergias,
                               emergencia_nome, emergencia_telefone, foto}  -> {usuario}
PUT /api/perfil/preferencias  {push, som}       -> {usuario}
"""
from flask import Blueprint, g, jsonify

from models import Notificacao, db
from .utils import corpo, erro, login_obrigatorio, texto

bp = Blueprint("perfil", __name__)

TIPOS_SANGUE = ("", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
CAMPOS_TEXTO = ("telefone", "alergias", "emergencia_nome", "emergencia_telefone")


@bp.get("/perfil")
@login_obrigatorio
def obter_perfil():
    return jsonify({"usuario": g.usuario.to_dict()})


@bp.put("/perfil")
@login_obrigatorio
def atualizar_perfil():
    dados, usuario = corpo(), g.usuario

    if "nome" in dados:
        nome = texto(dados, "nome")
        if not nome:
            return erro("O nome não pode ficar vazio.")
        usuario.nome = nome
    for campo in CAMPOS_TEXTO:
        if campo in dados:
            setattr(usuario, campo, texto(dados, campo))
    if "tipo_sanguineo" in dados:
        tipo = texto(dados, "tipo_sanguineo")
        if tipo not in TIPOS_SANGUE:
            return erro("Tipo sanguíneo inválido.")
        usuario.tipo_sanguineo = tipo
    if "foto" in dados:
        foto = dados.get("foto") or ""
        if foto and not str(foto).startswith("data:image/"):
            return erro("A foto deve ser uma imagem em base64 (data URI).")
        usuario.foto = foto

    Notificacao.criar(usuario.id, "Perfil", "Os dados do seu perfil foram atualizados.")
    db.session.commit()
    return jsonify({"usuario": usuario.to_dict()})


@bp.put("/perfil/preferencias")
@login_obrigatorio
def atualizar_preferencias():
    dados, usuario = corpo(), g.usuario
    if "push" in dados:
        usuario.pref_push = bool(dados["push"])
    if "som" in dados:
        usuario.pref_som = bool(dados["som"])
    db.session.commit()
    return jsonify({"usuario": usuario.to_dict()})
