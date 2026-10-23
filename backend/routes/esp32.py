"""
Integração ESP32 — lado do APP (usuário logado)

GET    /api/esp                     -> {dispositivos: {"<esp_id>": {...}}}
POST   /api/esp                     {esp_id}  vincula o ESP32 à conta
DELETE /api/esp/<esp_id>            desvincula (apaga os logs também)
GET    /api/esp/<esp_id>/logs       -> {logs: [...]} (mais recentes primeiro, máx. 500)
DELETE /api/esp/<esp_id>/logs       limpa os logs
"""
from flask import Blueprint, g, jsonify

from models import DispositivoESP, LogESP, Notificacao, agora_utc, db
from .utils import corpo, erro, login_obrigatorio, texto

bp = Blueprint("esp32", __name__)

LIMITE_LOGS = 500


def _meu_dispositivo(esp_id):
    return DispositivoESP.query.filter_by(esp_id=esp_id, usuario_id=g.usuario.id).first()


@bp.get("/esp")
@login_obrigatorio
def listar():
    disps = DispositivoESP.query.filter_by(usuario_id=g.usuario.id).order_by(DispositivoESP.data_vinculo).all()
    return jsonify({"dispositivos": {d.esp_id: d.to_dict() for d in disps}})


@bp.post("/esp")
@login_obrigatorio
def vincular():
    esp_id = texto(corpo(), "esp_id")
    if not esp_id:
        return erro("Digite o ID do dispositivo")
    if len(esp_id) > 64 or "/" in esp_id:
        return erro("ID do dispositivo inválido.")

    disp = DispositivoESP.query.filter_by(esp_id=esp_id).first()
    # No Firebase, vincular sobrescrevia o dono. Aqui, um ESP já vinculado a
    # outra conta precisa ser desvinculado por ela antes.
    if disp and disp.usuario_id != g.usuario.id:
        return erro("Este dispositivo já está vinculado a outra conta.", 409)
    if not disp:
        disp = DispositivoESP(esp_id=esp_id, usuario_id=g.usuario.id)
        db.session.add(disp)
    disp.status = "ativo"
    disp.data_vinculo = agora_utc()

    Notificacao.criar(g.usuario.id, "Integração", f"ESP32 {esp_id} vinculado com sucesso.")
    db.session.commit()
    return jsonify({"dispositivo": disp.to_dict()}), 201


@bp.delete("/esp/<esp_id>")
@login_obrigatorio
def desvincular(esp_id):
    disp = _meu_dispositivo(esp_id)
    if not disp:
        return erro("Dispositivo não encontrado.", 404)
    db.session.delete(disp)
    db.session.commit()
    return jsonify({"ok": True})


@bp.get("/esp/<esp_id>/logs")
@login_obrigatorio
def listar_logs(esp_id):
    disp = _meu_dispositivo(esp_id)
    if not disp:
        return erro("Dispositivo não encontrado.", 404)
    logs = LogESP.query.filter_by(dispositivo_id=disp.id).order_by(LogESP.id.desc()).limit(LIMITE_LOGS).all()
    return jsonify({"logs": [log.to_dict() for log in logs]})


@bp.delete("/esp/<esp_id>/logs")
@login_obrigatorio
def limpar_logs(esp_id):
    disp = _meu_dispositivo(esp_id)
    if not disp:
        return erro("Dispositivo não encontrado.", 404)
    LogESP.query.filter_by(dispositivo_id=disp.id).delete()
    db.session.commit()
    return jsonify({"ok": True})
