"""Registro de todas as rotas (blueprints) da API. Prefixo: /api"""
from .auth import bp as auth_bp
from .perfil import bp as perfil_bp
from .dados import bp as dados_bp
from .medicamentos import bp as medicamentos_bp
from .contatos import bp as contatos_bp
from .notificacoes import bp as notificacoes_bp
from .esp32 import bp as esp32_bp
from .dispositivo import bp as dispositivo_bp
from .farmaceuticos import bp as farmaceuticos_bp

BLUEPRINTS = [
    auth_bp,
    perfil_bp,
    dados_bp,
    medicamentos_bp,
    contatos_bp,
    notificacoes_bp,
    esp32_bp,
    dispositivo_bp,
    farmaceuticos_bp,
]


def registrar_rotas(app):
    for bp in BLUEPRINTS:
        app.register_blueprint(bp, url_prefix="/api")
