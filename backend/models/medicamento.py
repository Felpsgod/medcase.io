import json

from . import agora_utc, db, iso

# Maleta tem 6 nichos fixos; tags são ilimitadas
DISPOSITIVOS = ("maleta", "tag")
SLOTS_MALETA = 6


class Medicamento(db.Model):
    """Um remédio configurado num nicho da maleta (slot_N) ou numa tag de frasco (tag_N)."""

    __tablename__ = "medicamentos"
    __table_args__ = (db.UniqueConstraint("usuario_id", "dispositivo", "posicao", name="uq_medicamento_posicao"),)

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    dispositivo = db.Column(db.String(10), nullable=False)  # 'maleta' | 'tag'
    posicao = db.Column(db.Integer, nullable=False)  # número do nicho / da tag

    nome = db.Column(db.String(150), nullable=False)
    dose_qtd = db.Column(db.String(20), default="")
    dose_unidade = db.Column(db.String(40), default="comprimido(s)")
    uso_continuo = db.Column(db.Boolean, default=False, nullable=False)
    data_limite = db.Column(db.String(10), default="")  # 'YYYY-MM-DD' ou ''

    # Posologia: 'fixo' (intervalo + primeira dose) ou 'custom' (horários manuais)
    tipo_posologia = db.Column(db.String(10), default="fixo", nullable=False)
    intervalo = db.Column(db.Integer)  # horas
    frequencia = db.Column(db.Integer)  # vezes ao dia
    primeira_dose = db.Column(db.String(5))  # 'HH:MM'
    horarios_custom = db.Column(db.Text)  # JSON ["08:00","20:00"]

    criado_em = db.Column(db.DateTime, default=agora_utc, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=agora_utc, onupdate=agora_utc, nullable=False)

    tomadas = db.relationship("Tomada", backref="medicamento", cascade="all, delete-orphan", passive_deletes=True)

    # ------------------------------------------------------------------
    @property
    def chave(self):
        """Mesma chave usada pelo front: slot_1, tag_3..."""
        return f"{'slot' if self.dispositivo == 'maleta' else 'tag'}_{self.posicao}"

    def lista_custom(self):
        try:
            return json.loads(self.horarios_custom) if self.horarios_custom else []
        except ValueError:
            return []

    def horarios_do_dia(self):
        """Port de getHorariosDoDia() do front (doses que passam das 24h ficam para o dia seguinte)."""
        if self.tipo_posologia == "custom":
            return sorted(self.lista_custom())
        if not (self.primeira_dose and self.intervalo and self.frequencia):
            return []
        hh, mm = (int(x) for x in self.primeira_dose.split(":"))
        horarios = []
        for i in range(int(self.frequencia)):
            h = hh + i * int(self.intervalo)
            if h >= 24:
                break
            horarios.append(f"{h:02d}:{mm:02d}")
        return sorted(horarios)

    def expirado(self, data_iso):
        return bool(self.data_limite) and data_iso > self.data_limite

    def to_dict(self):
        return {
            "id": self.id,
            "dispositivo": self.dispositivo,
            "posicao": self.posicao,
            "nome": self.nome,
            "dose_qtd": self.dose_qtd or "",
            "dose_unidade": self.dose_unidade or "",
            "uso_continuo": self.uso_continuo,
            "data_limite": self.data_limite or "",
            "tipo_posologia": self.tipo_posologia,
            "intervalo": self.intervalo,
            "frequencia": self.frequencia,
            "primeira_dose": self.primeira_dose,
            "horarios_custom": self.lista_custom() if self.tipo_posologia == "custom" else None,
            "horarios_calculados": self.horarios_do_dia(),
            # Mesmo formato do front: { "2026-10-22_08:00": {tomado, hora_real, sintomas, ...} }
            "historico_tomadas": {t.chave: t.to_dict() for t in self.tomadas},
        }


class Tomada(db.Model):
    """Registro de uma dose tomada (antes: historico_tomadas/<data>_<hora>)."""

    __tablename__ = "tomadas"
    __table_args__ = (db.UniqueConstraint("medicamento_id", "data", "hora_programada", name="uq_tomada_dose"),)

    id = db.Column(db.Integer, primary_key=True)
    medicamento_id = db.Column(db.Integer, db.ForeignKey("medicamentos.id", ondelete="CASCADE"), nullable=False, index=True)
    data = db.Column(db.String(10), nullable=False)  # 'YYYY-MM-DD' (data local do usuário)
    hora_programada = db.Column(db.String(5), nullable=False)  # 'HH:MM'
    tomado = db.Column(db.Boolean, default=True, nullable=False)
    hora_real = db.Column(db.String(5), default="")
    sintomas = db.Column(db.Text, default="")
    origem = db.Column(db.String(10), default="app")  # 'app' | 'esp32'
    registro_salvo_em = db.Column(db.DateTime, default=agora_utc, nullable=False)

    @property
    def chave(self):
        return f"{self.data}_{self.hora_programada}"

    @staticmethod
    def registrar(medicamento, data, hora_programada, hora_real="", sintomas="", origem="app"):
        """Cria ou atualiza (upsert) a tomada daquela dose."""
        tomada = Tomada.query.filter_by(
            medicamento_id=medicamento.id, data=data, hora_programada=hora_programada
        ).first()
        if not tomada:
            tomada = Tomada(medicamento_id=medicamento.id, data=data, hora_programada=hora_programada)
            db.session.add(tomada)
        tomada.tomado = True
        tomada.hora_real = hora_real or ""
        tomada.sintomas = sintomas or ""
        tomada.origem = origem
        tomada.registro_salvo_em = agora_utc()
        return tomada

    def to_dict(self):
        return {
            "tomado": self.tomado,
            "hora_real": self.hora_real or "",
            "sintomas": self.sintomas or "",
            "origem": self.origem,
            "registro_salvo_em": iso(self.registro_salvo_em),
        }
