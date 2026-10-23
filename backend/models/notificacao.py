from . import agora_utc, db, iso


class Notificacao(db.Model):
    """Alerta interno exibido no sino e na tela de Alertas."""

    __tablename__ = "notificacoes"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    titulo = db.Column(db.String(120), nullable=False)
    mensagem = db.Column(db.Text, nullable=False)
    data = db.Column(db.DateTime, default=agora_utc, nullable=False, index=True)
    lida = db.Column(db.Boolean, default=False, nullable=False)

    @staticmethod
    def criar(usuario_id, titulo, mensagem):
        notif = Notificacao(usuario_id=usuario_id, titulo=titulo, mensagem=mensagem)
        db.session.add(notif)
        return notif

    def to_dict(self):
        return {"id": self.id, "titulo": self.titulo, "mensagem": self.mensagem, "data": iso(self.data), "lida": self.lida}
