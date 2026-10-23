"""
Autenticação (antes: login.html lendo contas_medcase no Firebase)

POST /api/auth/register       {nome, email, telefone, senha}  -> {token, usuario}
POST /api/auth/login          {email, senha}                  -> {token, usuario}
POST /api/auth/logout                                         -> {ok}
GET  /api/auth/me                                             -> {usuario}
POST /api/auth/esqueci-senha  {email}                         -> {mensagem}  (envia pelo WhatsApp)
"""
import secrets
import string

from flask import Blueprint, current_app, g, jsonify

from models import MensagemWhatsapp, Sessao, Usuario, db
from .utils import corpo, enviar_whatsapp, erro, login_obrigatorio, texto

bp = Blueprint("auth", __name__)


def _email(dados):
    return texto(dados, "email").lower()


@bp.post("/auth/register")
def register():
    dados = corpo()
    nome, email, telefone, senha = texto(dados, "nome"), _email(dados), texto(dados, "telefone"), dados.get("senha") or ""

    if not nome or "@" not in email or len(senha) < 4:
        return erro("Preencha todos os campos corretamente (senha com 4+ caracteres).")
    if Usuario.query.filter_by(email=email).first():
        return erro("Já existe uma conta com este e-mail. Faça login.", 409)

    usuario = Usuario(nome=nome, email=email, telefone=telefone)
    usuario.definir_senha(senha)
    db.session.add(usuario)
    db.session.flush()  # gera o id
    sessao = Sessao.criar(usuario)
    db.session.commit()
    return jsonify({"token": sessao.token, "usuario": usuario.to_dict()}), 201


@bp.post("/auth/login")
def login():
    dados = corpo()
    email, senha = _email(dados), dados.get("senha") or ""
    if not email or not senha:
        return erro("Informe e-mail e senha.")

    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario or not usuario.conferir_senha(senha):
        return erro("E-mail ou senha incorretos.", 401)

    sessao = Sessao.criar(usuario)
    db.session.commit()
    return jsonify({"token": sessao.token, "usuario": usuario.to_dict()})


@bp.post("/auth/logout")
@login_obrigatorio
def logout():
    db.session.delete(g.sessao)
    db.session.commit()
    return jsonify({"ok": True})


@bp.get("/auth/me")
@login_obrigatorio
def me():
    return jsonify({"usuario": g.usuario.to_dict()})


@bp.post("/auth/esqueci-senha")
def esqueci_senha():
    """Gera uma senha temporária e envia pelo WhatsApp (API da pasta whatsapp/).

    A senha só é trocada se o envio der certo; se a API estiver fora do ar,
    a senha antiga continua valendo (antes ela era trocada mesmo sem envio).
    """
    email = _email(corpo())
    if not email:
        return erro("Digite o e-mail da sua conta.")

    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario:
        return erro("Não encontramos nenhuma conta com este e-mail.", 404)
    if not usuario.telefone:
        return erro(
            "Esta conta não tem um WhatsApp cadastrado, então não é possível enviar a nova senha. "
            "Cadastre seu telefone no perfil."
        )

    nova_senha = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    mensagem = (
        "🔐 *MedCase — Recuperação de senha*\n\n"
        f"Olá, {usuario.nome}! Sua nova senha de acesso é:\n\n*{nova_senha}*\n\n"
        "Entre com ela e, se quiser, troque depois em Perfil."
    )

    ok, motivo = enviar_whatsapp(usuario.telefone, mensagem, current_app.config["WHATSAPP_API_URL"])

    # Histórico sem a senha
    db.session.add(
        MensagemWhatsapp(
            usuario_id=usuario.id,
            tipo="reset_senha",
            telefone=usuario.telefone,
            mensagem=mensagem.replace(nova_senha, "******"),
            enviado=ok,
            erro=motivo,
        )
    )
    if not ok:
        db.session.commit()
        if motivo == "Número não possui WhatsApp":
            return erro("O telefone cadastrado nesta conta não tem WhatsApp. Sua senha não foi alterada.")
        if motivo == "Telefone inválido":
            return erro("O telefone cadastrado nesta conta é inválido (use DDD + número). Sua senha não foi alterada.")
        return erro(
            f"Não foi possível enviar a mensagem pelo WhatsApp agora ({motivo}). "
            "Sua senha não foi alterada; tente novamente em alguns minutos.",
            503,
        )

    usuario.definir_senha(nova_senha)
    db.session.commit()
    return jsonify({"mensagem": "Pronto! Enviamos uma nova senha para o seu WhatsApp."})
