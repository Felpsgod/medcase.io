from . import agora_utc, db, iso

TIPOS_MENSAGEM = ("reset_senha", "aviso_dose")


class MensagemWhatsapp(db.Model):
    """Histórico das mensagens enviadas pela API de WhatsApp (pasta whatsapp/).

    Antes era uma fila (reset_whatsapp) que um robô lia; agora o backend envia
    na hora e só registra o resultado. Senhas nunca são gravadas aqui.
    """

    __tablename__ = "mensagens_whatsapp"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = db.Column(db.String(20), nullable=False)  # 'reset_senha' | 'aviso_dose'
    telefone = db.Column(db.String(30), nullable=False)
    mensagem = db.Column(db.Text, nullable=False)
    enviado = db.Column(db.Boolean, default=False, nullable=False)
    erro = db.Column(db.String(255))  # motivo da falha, se houver
    criado_em = db.Column(db.DateTime, default=agora_utc, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "tipo": self.tipo,
            "telefone": self.telefone,
            "mensagem": self.mensagem,
            "enviado": self.enviado,
            "erro": self.erro,
            "criado_em": iso(self.criado_em),
        }
