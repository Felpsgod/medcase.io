from . import agora_utc, db

TIPOS_CONTATO = ("Familiar", "Médico")


class Contato(db.Model):
    """Pessoa de acompanhamento (familiar/cuidador ou médico)."""

    __tablename__ = "contatos"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = db.Column(db.String(20), nullable=False, default="Familiar")
    nome = db.Column(db.String(120), nullable=False)
    telefone = db.Column(db.String(30), nullable=False)
    criado_em = db.Column(db.DateTime, default=agora_utc, nullable=False)

    def to_dict(self):
        return {"id": self.id, "tipo": self.tipo, "nome": self.nome, "telefone": self.telefone}
