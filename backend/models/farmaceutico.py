from . import agora_utc, db, iso

ESPECIALIDADES = ("Atenção ao idoso", "Saúde da mulher", "Diabetes & hipertensão", "Pediatria")
PERIODOS = ("Manhã", "Tarde", "Noite")

# Mesmos profissionais de exemplo do painel.html (inseridos pelo init.py)
FARMACEUTICOS_INICIAIS = [
    ("Dra. Ana Beatriz", "CRF-SP 123456", "Atenção ao idoso", 49, 4.9),
    ("Dr. Carlos Mendes", "CRF-RJ 098765", "Diabetes & hipertensão", 59, 4.8),
    ("Dra. Júlia Faria", "CRF-MG 045678", "Saúde da mulher", 55, 5.0),
    ("Dr. Rafael Lima", "CRF-SP 567890", "Pediatria", 49, 4.7),
    ("Dra. Marina Souza", "CRF-PR 011223", "Atenção ao idoso", 45, 4.9),
    ("Dr. Pedro Alves", "CRF-BA 334455", "Diabetes & hipertensão", 60, 4.6),
]


class Farmaceutico(db.Model):
    __tablename__ = "farmaceuticos"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    crf = db.Column(db.String(30), nullable=False, unique=True)
    especialidade = db.Column(db.String(60), nullable=False)
    preco = db.Column(db.Float, nullable=False)  # R$ por consulta
    nota = db.Column(db.Float, default=5.0)
    ativo = db.Column(db.Boolean, default=True, nullable=False)

    @property
    def iniciais(self):
        partes = [p for p in self.nome.replace("Dra.", "").replace("Dr.", "").split() if p]
        return "".join(p[0] for p in partes[:2]).upper()

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "crf": self.crf,
            "esp": self.especialidade,
            "preco": self.preco,
            "nota": self.nota,
            "iniciais": self.iniciais,
        }

    @staticmethod
    def popular_se_vazio():
        if Farmaceutico.query.first():
            return
        for nome, crf, esp, preco, nota in FARMACEUTICOS_INICIAIS:
            db.session.add(Farmaceutico(nome=nome, crf=crf, especialidade=esp, preco=preco, nota=nota))
        db.session.commit()


class Agendamento(db.Model):
    """Pedido de consulta (no HTML só mostrava um toast; agora fica registrado)."""

    __tablename__ = "agendamentos"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    farmaceutico_id = db.Column(db.Integer, db.ForeignKey("farmaceuticos.id", ondelete="CASCADE"), nullable=False)
    data = db.Column(db.String(10), default="")  # data preferida 'YYYY-MM-DD'
    periodo = db.Column(db.String(10), default="Manhã")
    motivo = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="solicitado")
    criado_em = db.Column(db.DateTime, default=agora_utc, nullable=False)

    farmaceutico = db.relationship("Farmaceutico")

    def to_dict(self):
        return {
            "id": self.id,
            "farmaceutico": self.farmaceutico.to_dict() if self.farmaceutico else None,
            "data": self.data,
            "periodo": self.periodo,
            "motivo": self.motivo,
            "status": self.status,
            "criado_em": iso(self.criado_em),
        }
