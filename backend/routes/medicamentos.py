"""
Medicamentos da Maleta (6 nichos) e das Tags (ilimitadas) + registro de doses

<dispositivo> = 'maleta' | 'tag'      <posicao> = número do nicho / da tag

PUT    /api/medicamentos/<dispositivo>/<posicao>          cria ou atualiza (mantém o histórico)
DELETE /api/medicamentos/<dispositivo>/<posicao>          remove o medicamento (e o histórico)
POST   /api/medicamentos/<dispositivo>/<posicao>/tomadas  {data, hora_programada, hora_real, sintomas}
                                                          -> também avisa os contatos pelo WhatsApp
DELETE /api/tomadas                                       apaga TODO o histórico do usuário
"""
import json

from flask import Blueprint, g, jsonify

from models import Medicamento, Notificacao, Tomada, db
from models.medicamento import DISPOSITIVOS, SLOTS_MALETA
from .utils import avisar_contatos, corpo, data_valida, enviar_push, erro, hora_valida, login_obrigatorio, texto

bp = Blueprint("medicamentos", __name__)


def mensagem_dose_whatsapp(usuario, med, hora_programada, hora_real, sintomas="", pela_maleta=False):
    """Texto enviado aos familiares/médicos quando uma dose é registrada."""
    dose = " ({})".format(f"{med.dose_qtd} {med.dose_unidade or ''}".strip()) if med.dose_qtd else ""
    origem = " pela maleta MedCase" if pela_maleta else ""
    texto_msg = (
        "💊 *MedCase — Dose registrada*\n\n"
        f"{usuario.nome} tomou *{med.nome}*{dose} às {hora_real}{origem} "
        f"(programado para {hora_programada})."
    )
    if sintomas:
        texto_msg += f"\n\n⚠️ Relatou: {sintomas}"
    return texto_msg


def _validar_posicao(dispositivo, posicao):
    if dispositivo not in DISPOSITIVOS:
        return "Dispositivo inválido (use 'maleta' ou 'tag')."
    if posicao < 1 or (dispositivo == "maleta" and posicao > SLOTS_MALETA):
        return f"A maleta tem nichos de 1 a {SLOTS_MALETA}." if dispositivo == "maleta" else "Número de tag inválido."
    return None


def _buscar(dispositivo, posicao):
    return Medicamento.query.filter_by(usuario_id=g.usuario.id, dispositivo=dispositivo, posicao=posicao).first()


@bp.put("/medicamentos/<dispositivo>/<int:posicao>")
@login_obrigatorio
def salvar(dispositivo, posicao):
    if msg := _validar_posicao(dispositivo, posicao):
        return erro(msg)
    dados = corpo()

    nome = texto(dados, "nome")
    if not nome:
        return erro("Informe o nome do medicamento.")

    tipo = texto(dados, "tipo_posologia", "fixo")
    if tipo not in ("fixo", "custom"):
        return erro("tipo_posologia deve ser 'fixo' ou 'custom'.")

    uso_continuo = bool(dados.get("uso_continuo"))
    data_limite = "" if uso_continuo else texto(dados, "data_limite")
    if data_limite and not data_valida(data_limite):
        return erro("data_limite deve estar no formato AAAA-MM-DD.")

    if tipo == "fixo":
        try:
            intervalo = int(dados.get("intervalo"))
        except (TypeError, ValueError):
            return erro("Informe o intervalo em horas (1 a 72).")
        if not 1 <= intervalo <= 72:
            return erro("Informe o intervalo em horas (1 a 72).")
        primeira = texto(dados, "primeira_dose")
        if not hora_valida(primeira):
            return erro("Informe o horário da primeira dose (HH:MM).")
        frequencia = 24 // intervalo  # calcularFrequenciaAutomatica()
        horarios_custom = None
    else:
        horarios = [h for h in (dados.get("horarios_custom") or []) if isinstance(h, str) and h]
        if not horarios:
            return erro("Adicione um horário.")
        if not all(hora_valida(h) for h in horarios):
            return erro("Horários devem estar no formato HH:MM.")
        horarios = sorted(set(horarios))
        intervalo, primeira, frequencia = None, None, len(horarios)
        horarios_custom = json.dumps(horarios)

    med = _buscar(dispositivo, posicao)
    criado = med is None
    if criado:
        med = Medicamento(usuario_id=g.usuario.id, dispositivo=dispositivo, posicao=posicao)
        db.session.add(med)

    med.nome = nome
    med.dose_qtd = texto(dados, "dose_qtd")
    med.dose_unidade = texto(dados, "dose_unidade", "comprimido(s)")
    med.uso_continuo = uso_continuo
    med.data_limite = data_limite
    med.tipo_posologia = tipo
    med.intervalo = intervalo
    med.frequencia = frequencia
    med.primeira_dose = primeira
    med.horarios_custom = horarios_custom

    Notificacao.criar(g.usuario.id, "Medicamento Salvo", f"{nome} configurado no nicho/tag {posicao}.")
    db.session.commit()
    return jsonify({"medicamento": med.to_dict()}), 201 if criado else 200


@bp.delete("/medicamentos/<dispositivo>/<int:posicao>")
@login_obrigatorio
def remover(dispositivo, posicao):
    if msg := _validar_posicao(dispositivo, posicao):
        return erro(msg)
    med = _buscar(dispositivo, posicao)
    if not med:
        return erro("Medicamento não encontrado.", 404)
    Notificacao.criar(g.usuario.id, "Medicamento Removido", f"{med.nome} foi excluído da sua rotina.")
    db.session.delete(med)
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/medicamentos/<dispositivo>/<int:posicao>/tomadas")
@login_obrigatorio
def registrar_tomada(dispositivo, posicao):
    """Registrar tomada (hora real + sintomas). Também dispara o push 'Dose Registrada'."""
    if msg := _validar_posicao(dispositivo, posicao):
        return erro(msg)
    med = _buscar(dispositivo, posicao)
    if not med:
        return erro("Medicamento não encontrado.", 404)

    dados = corpo()
    data, hora_programada, hora_real = texto(dados, "data"), texto(dados, "hora_programada"), texto(dados, "hora_real")
    if not data_valida(data) or not hora_valida(hora_programada):
        return erro("Informe data (AAAA-MM-DD) e hora_programada (HH:MM).")
    if not hora_valida(hora_real):
        return erro("Informe que horas você tomou (HH:MM).")

    sintomas = texto(dados, "sintomas")
    tomada = Tomada.registrar(med, data, hora_programada, hora_real, sintomas)
    Notificacao.criar(g.usuario.id, "Dose Registrada", f"Você tomou {med.nome} às {hora_real}.")
    db.session.commit()

    enviar_push(g.usuario, "Dose Registrada ✅", f"Você confirmou a tomada de {med.nome} às {hora_real}.")
    avisados = avisar_contatos(g.usuario, mensagem_dose_whatsapp(g.usuario, med, hora_programada, hora_real, sintomas))
    return jsonify({"chave": tomada.chave, "tomada": tomada.to_dict(), "contatos_avisados": avisados}), 201


@bp.delete("/tomadas")
@login_obrigatorio
def reiniciar_historico():
    """Configurações -> Reiniciar Histórico."""
    ids = [m.id for m in Medicamento.query.filter_by(usuario_id=g.usuario.id).all()]
    if ids:
        Tomada.query.filter(Tomada.medicamento_id.in_(ids)).delete(synchronize_session=False)
    Notificacao.criar(g.usuario.id, "Sistema de Alertas", "Histórico de tomadas reiniciado com sucesso.")
    db.session.commit()
    return jsonify({"ok": True})
