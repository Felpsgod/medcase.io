import secrets

from werkzeug.security import check_password_hash, generate_password_hash

from . import agora_utc, db


class Usuario(db.Model):
    """Conta + perfil + preferências (antes: contas_medcase + <usuario>/perfil + localStorage)."""

    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)  # sempre minúsculo
    nome = db.Column(db.String(120), nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)  # antes ficava em texto puro
    telefone = db.Column(db.String(30), default="")

    # Dados de saúde (card "Resumo de Saúde")
    tipo_sanguineo = db.Column(db.String(5), default="")
    alergias = db.Column(db.String(255), default="")
    emergencia_nome = db.Column(db.String(120), default="")
    emergencia_telefone = db.Column(db.String(30), default="")
    foto = db.Column(db.Text, default="")  # data URI base64

    # Preferências (modal Preferências)
    pref_push = db.Column(db.Boolean, default=True, nullable=False)
    pref_som = db.Column(db.Boolean, default=True, nullable=False)

    criado_em = db.Column(db.DateTime, default=agora_utc, nullable=False)

    sessoes = db.relationship("Sessao", backref="usuario", cascade="all, delete-orphan", passive_deletes=True)
    medicamentos = db.relationship("Medicamento", backref="usuario", cascade="all, delete-orphan", passive_deletes=True)
    contatos = db.relationship("Contato", backref="usuario", cascade="all, delete-orphan", passive_deletes=True)
    notificacoes = db.relationship("Notificacao", backref="usuario", cascade="all, delete-orphan", passive_deletes=True)

    def definir_senha(self, senha):
        self.senha_hash = generate_password_hash(senha)

    def conferir_senha(self, senha):
        return check_password_hash(self.senha_hash, senha)

    def to_dict(self, incluir_foto=True):
        dados = {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "telefone": self.telefone or "",
            "tipo_sanguineo": self.tipo_sanguineo or "",
            "alergias": self.alergias or "",
            "emergencia_nome": self.emergencia_nome or "",
            "emergencia_telefone": self.emergencia_telefone or "",
            "preferencias": {"push": self.pref_push, "som": self.pref_som},
        }
        if incluir_foto:
            dados["foto"] = self.foto or ""
        return dados


class Sessao(db.Model):
    """Token de acesso gerado no login (enviado no header Authorization: Bearer <token>)."""

    __tablename__ = "sessoes"

    token = db.Column(db.String(64), primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    criado_em = db.Column(db.DateTime, default=agora_utc, nullable=False)

    @staticmethod
    def criar(usuario):
        sessao = Sessao(token=secrets.token_hex(32), usuario_id=usuario.id)
        db.session.add(sessao)
        return sessao
