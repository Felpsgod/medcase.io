from datetime import timedelta

from . import agora_utc, db, iso

# Sem sinal do ESP32 por mais que isso -> considerado offline
TEMPO_OFFLINE = timedelta(minutes=5)


class DispositivoESP(db.Model):
    """ESP32 vinculado a um usuário (antes: vinculos_esp/<id> + <usuario>/dispositivos/<id>)."""

    __tablename__ = "dispositivos_esp"

    id = db.Column(db.Integer, primary_key=True)
    esp_id = db.Column(db.String(64), unique=True, nullable=False, index=True)  # ID digitado no app
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    nome = db.Column(db.String(120), default="Dispositivo MedCase")
    status = db.Column(db.String(20), default="ativo")  # 'ativo' ao vincular; o firmware envia 'online'/'offline'
    data_vinculo = db.Column(db.DateTime, default=agora_utc, nullable=False)
    ultimo_contato = db.Column(db.DateTime)

    logs = db.relationship("LogESP", backref="dispositivo", cascade="all, delete-orphan", passive_deletes=True)

    def status_atual(self):
        # Se o firmware parou de falar, não mostra "online" para sempre
        if self.status == "online" and (not self.ultimo_contato or agora_utc() - self.ultimo_contato > TEMPO_OFFLINE):
            return "offline"
        return self.status

    def to_dict(self):
        return {
            "dispositivo_id": self.esp_id,
            "nome": self.nome,
            "status": self.status_atual(),
            "data_vinculo": iso(self.data_vinculo),
            "ultimo_contato": iso(self.ultimo_contato),
        }


class LogESP(db.Model):
    """Linha de log enviada pelo ESP32."""

    __tablename__ = "logs_esp"

    id = db.Column(db.Integer, primary_key=True)
    dispositivo_id = db.Column(db.Integer, db.ForeignKey("dispositivos_esp.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = db.Column(db.String(20), default="INFO")  # SISTEMA | ALERTA | ERRO | SUCESSO | INFO
    mensagem = db.Column(db.Text, default="")
    timestamp = db.Column(db.String(40))  # como o firmware mandou (ou a hora do servidor)
    recebido_em = db.Column(db.DateTime, default=agora_utc, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "tipo": self.tipo,
            "mensagem": self.mensagem,
            "timestamp": self.timestamp or iso(self.recebido_em),
        }
