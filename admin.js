function selecionarDiaTodo() {
  document.getElementById('bloqueioHoraInicio').value = '08:00';
  document.getElementById('bloqueioHoraFim').value = '18:00';
}

async function bloquearHorario(event) {
  event.preventDefault();
  const data = document.getElementById('bloqueioData').value;
  const horaInicioStr = document.getElementById('bloqueioHoraInicio').value;
  const horaFimStr = document.getElementById('bloqueioHoraFim').value;
  const motivo = document.getElementById('bloqueioMotivo').value.trim();

  const horaInicio = parseInt(horaInicioStr.split(':')[0], 10);
  const horaFim = parseInt(horaFimStr.split(':')[0], 10);

  if (horaFim <= horaInicio) {
    alert('⚠️ O horário final deve ser maior que o horário inicial.');
    return;
  }

  const horariosValidos = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  
  const horariosParaBloquear = horariosValidos.filter(h => {
    const hNum = parseInt(h.split(':')[0], 10);
    return hNum >= horaInicio && hNum < horaFim;
  });

  if (horariosParaBloquear.length === 0) {
    alert('Nenhum horário válido encontrado no intervalo selecionado.');
    return;
  }

  let sucessos = 0;
  let erros = 0;

  for (const hora of horariosParaBloquear) {
    const dataHoraStr = `${data}T${hora}:00.000Z`;

    try {
      const res = await fetch(`${API_URL}/bloquear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataHora: dataHoraStr, motivo })
      });

      if (res.ok) {
        sucessos++;
      } else {
        erros++;
      }
    } catch (err) {
      erros++;
    }
  }

  if (sucessos > 0) {
    alert(`✅ ${sucessos} horário(s) bloqueado(s) com sucesso!${erros > 0 ? ` (${erros} já estavam ocupados/bloqueados)` : ''}`);
    fecharModalBloqueio();
    carregarAgendamentos();
  } else {
    alert('⚠️ Não foi possível bloquear os horários selecionados (podem já estar ocupados ou bloqueados).');
  }
}