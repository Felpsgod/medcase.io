"""
Integração ESP32 — lado do FIRMWARE (o ESP32 chama estas rotas)

O ESP32 se identifica apenas pelo próprio ID, como no Firebase
(onde ele lia vinculos_esp/<id> e gravava em .../dispositivos/<id>/logs).

GET  /api/dispositivo/<esp_id>/vinculo   -> {vinculado, usuario_id}
PUT  /api/dispositivo/<esp_id>/status    {status: "online"|"offline", nome?}
POST /api/dispositivo/<esp_id>/logs      {tipo, mensagem, timestamp?}
GET  /api/dispositivo/<esp_id>/agenda    ?data=AAAA-MM-DD -> medicamentos e horários do dia
POST /api/dispositivo/<esp_id>/tomadas   {dispositivo, posicao, hora_programada, hora_real?, data?}
"""
from datetime import date, datetime

from flask import Blueprint, jsonify, request

from models import DispositivoESP, LogESP, Medicamento, Notificacao, Tomada, Usuario, agora_utc, db
from .medicamentos import mensagem_dose_whatsapp
from .utils import avisar_contatos, corpo, data_valida, enviar_push, erro, hora_valida, texto

bp = Blueprint("dispositivo", __name__)

TIPOS_LOG = ("SISTEMA", "ALERTA", "ERRO", "SUCESSO", "INFO")


def _dispositivo(esp_id):
    disp = DispositivoESP.query.filter_by(esp_id=esp_id).first()
    if disp:
        disp.ultimo_contato = agora_utc()
    return disp


@bp.get("/dispositivo/<esp_id>/vinculo")
def vinculo(esp_id):
    disp = _dispositivo(esp_id)
    db.session.commit()
    return jsonify({"vinculado": bool(disp), "usuario_id": disp.usuario_id if disp else None})


@bp.put("/dispositivo/<esp_id>/status")
def status(esp_id):
    disp = _dispositivo(esp_id)
    if not disp:
        return erro("Dispositivo não vinculado.", 404)
    dados = corpo()
    disp.status = texto(dados, "status", "online") or "online"
    if texto(dados, "nome"):
        disp.nome = texto(dados, "nome")
    db.session.commit()
    return jsonify({"dispositivo": disp.to_dict()})


@bp.post("/dispositivo/<esp_id>/logs")
def enviar_log(esp_id):
    disp = _dispositivo(esp_id)
    if not disp:
        return erro("Dispositivo não vinculado.", 404)
    dados = corpo()
    tipo = texto(dados, "tipo", "INFO").upper()
    log = LogESP(
        dispositivo_id=disp.id,
        tipo=tipo if tipo in TIPOS_LOG else "INFO",
        mensagem=texto(dados, "mensagem") or "Sem mensagem",
        timestamp=texto(dados, "timestamp") or None,
    )
    disp.status = "online"  # se mandou log, está ligado
    db.session.add(log)
    db.session.commit()
    return jsonify({"log": log.to_dict()}), 201


@bp.get("/dispositivo/<esp_id>/agenda")
def agenda(esp_id):
    """Medicamentos ativos do dono do ESP32, com horários e o que já foi tomado no dia."""
    disp = _dispositivo(esp_id)
    if not disp:
        return erro("Dispositivo não vinculado.", 404)
    db.session.commit()

    data_iso = request.args.get("data") or date.today().isoformat()
    itens = []
    for med in Medicamento.query.filter_by(usuario_id=disp.usuario_id).order_by(Medicamento.dispositivo, Medicamento.posicao):
        if med.expirado(data_iso):
            continue
        tomadas = {t.hora_programada for t in med.tomadas if t.data == data_iso and t.tomado}
        itens.append(
            {
                "dispositivo": med.dispositivo,
                "posicao": med.posicao,
                "nome": med.nome,
                "dose": f"{med.dose_qtd} {med.dose_unidade}".strip() if med.dose_qtd else "",
                "horarios": [{"hora": h, "tomado": h in tomadas} for h in med.horarios_do_dia()],
            }
        )
    return jsonify({"data": data_iso, "hora_servidor": datetime.now().strftime("%H:%M"), "medicamentos": itens})


@bp.post("/dispositivo/<esp_id>/tomadas")
def registrar_tomada(esp_id):
    """O ESP32 registra uma dose (ex.: o nicho da maleta foi aberto)."""
    disp = _dispositivo(esp_id)
    if not disp:
        return erro("Dispositivo não vinculado.", 404)
    dados = corpo()
    try:
        posicao = int(dados.get("posicao"))
    except (TypeError, ValueError):
        return erro("Informe a posição (número do nicho/tag).")

    med = Medicamento.query.filter_by(
        usuario_id=disp.usuario_id, dispositivo=texto(dados, "dispositivo", "maleta"), posicao=posicao
    ).first()
    if not med:
        return erro("Nenhum medicamento nessa posição.", 404)

    data_iso = texto(dados, "data") or date.today().isoformat()
    hora_programada = texto(dados, "hora_programada")
    hora_real = texto(dados, "hora_real") or datetime.now().strftime("%H:%M")
    if not data_valida(data_iso) or not hora_valida(hora_programada) or not hora_valida(hora_real):
        return erro("Use data AAAA-MM-DD e horas HH:MM.")

    tomada = Tomada.registrar(med, data_iso, hora_programada, hora_real, origem="esp32")
    Notificacao.criar(disp.usuario_id, "Dose Registrada", f"{med.nome} registrado pelo ESP32 às {hora_real}.")
    db.session.commit()

    usuario = db.session.get(Usuario, disp.usuario_id)
    enviar_push(usuario, "Dose Registrada ✅", f"{med.nome} registrado pela maleta às {hora_real}.")
    avisados = avisar_contatos(usuario, mensagem_dose_whatsapp(usuario, med, hora_programada, hora_real, pela_maleta=True))
    return jsonify({"chave": tomada.chave, "tomada": tomada.to_dict(), "contatos_avisados": avisados}), 201
