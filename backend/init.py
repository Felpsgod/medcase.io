"""
MedCase — backend (Flask + SQLite)

    python init.py

1. Cria o app Flask e registra as rotas (/api/...)
2. Cria as tabelas no SQLite (só as que ainda não existem) e popula os farmacêuticos
3. Sobe o servidor em 0.0.0.0:<PORT> (padrão 5000) — acessível pelo celular na mesma rede

Variáveis de ambiente (todas opcionais):
    PORT                     porta do servidor (5000)
    DATABASE_URL             padrão: sqlite:///medcase.db (nesta pasta)
    WHATSAPP_API_URL         API de WhatsApp da pasta whatsapp/ (padrão http://localhost:3005)
    WHATSAPP_AVISAR_CONTATOS 0 para NÃO avisar os contatos a cada dose (padrão: avisa)
    ONESIGNAL_REST_API_KEY   se definida, o servidor envia push "Dose Registrada"
    FLASK_DEBUG              1 para modo debug (recarrega ao salvar)
"""
import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from models import Farmaceutico, db
from routes import registrar_rotas

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def criar_app():
    app = Flask(__name__)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'medcase.db')}"),
        MAX_CONTENT_LENGTH=5 * 1024 * 1024,  # 5 MB (foto de perfil em base64)
        WHATSAPP_API_URL=os.environ.get("WHATSAPP_API_URL", "http://localhost:3005"),
        WHATSAPP_AVISAR_CONTATOS=os.environ.get("WHATSAPP_AVISAR_CONTATOS", "1") != "0",
        ONESIGNAL_APP_ID="06ccb5ea-16e0-4c72-9612-5460f097be42",
        ONESIGNAL_REST_API_KEY=os.environ.get("ONESIGNAL_REST_API_KEY", ""),
    )
    app.json.ensure_ascii = False  # acentos legíveis no JSON
    app.json.sort_keys = False

    CORS(app)  # libera o app web (expo start --web) e outras origens
    db.init_app(app)
    registrar_rotas(app)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # Ferramenta de teste: simulador da maleta (../ESP32/maleta.html) servido
    # pela mesma origem da API. Aberto direto do disco (file://), o Chrome
    # bloqueia/pergunta antes de chamar IPs da rede local.
    pasta_simulador = os.path.normpath(os.path.join(BASE_DIR, "..", "ESP32"))

    @app.get("/simulador")
    def simulador():
        if not os.path.exists(os.path.join(pasta_simulador, "maleta.html")):
            return jsonify({"erro": "Simulador não encontrado (ESP32/maleta.html)."}), 404
        return send_from_directory(pasta_simulador, "maleta.html")

    # Erros sempre em JSON: {"erro": "..."}
    @app.errorhandler(HTTPException)
    def http_error(exc):
        return jsonify({"erro": exc.description}), exc.code

    @app.errorhandler(Exception)
    def erro_interno(exc):
        app.logger.exception(exc)
        db.session.rollback()
        return jsonify({"erro": "Erro interno no servidor."}), 500

    return app


def criar_tabelas(app):
    """create_all() só cria o que ainda não existe — rodar de novo é seguro."""
    with app.app_context():
        db.create_all()
        Farmaceutico.popular_se_vazio()


app = criar_app()

if __name__ == "__main__":
    criar_tabelas(app)
    porta = int(os.environ.get("PORT", 5000))
    print(f"MedCase API rodando em http://0.0.0.0:{porta}/api  (banco: {app.config['SQLALCHEMY_DATABASE_URI']})")
    app.run(host="0.0.0.0", port=porta, debug=os.environ.get("FLASK_DEBUG") == "1")
