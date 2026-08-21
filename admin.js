async function agendarManual() {
  const cliente = document.getElementById('manualCliente').value;
  const telefone = document.getElementById('manualTelefone').value;
  const servico = document.getElementById('manualServico').value;
  const data = manualData.value;
  const hInicio = parseInt(document.getElementById('manualHoraInicio').value.split(':')[0]);
  const hFim = parseInt(document.getElementById('manualHoraFim').value.split(':')[0]);

  if (!cliente) return alert('Digite o nome do cliente!');
  if (hInicio >= hFim) return alert('Horário final deve ser maior que o horário de início.');

  let sucessoTotal = true;

  for (let h = hInicio; h < hFim; h++) {
    const horaFormatted = String(h).padStart(2, '0') + ':00';
    const ok = await enviarAgendamento({
      cliente,
      telefone,
      servico,
      observacao: 'Agendado manualmente no painel',
      dataHora: `${data}T${horaFormatted}:00`
    });

    if (!ok) sucessoTotal = false;
  }

  if (sucessoTotal) {
    alert('Cliente agendado com sucesso!');
    carregarAgendamentos();
  } else {
    alert('Aviso: Um ou mais horários desse intervalo já estavam ocupados.');
    carregarAgendamentos();
  }
}