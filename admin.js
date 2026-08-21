const API_URL = 'https://sistema-agendamento-8tlb.onrender.com';

const filtroData = document.getElementById('filtroData');
const dataBloqueio = document.getElementById('dataBloqueio');
const manualData = document.getElementById('manualData');
const listaAgendamentos = document.getElementById('listaAgendamentos');

const hoje = new Date().toISOString().split('T')[0];
filtroData.value = hoje;
dataBloqueio.value = hoje;
manualData.value = hoje;

filtroData.addEventListener('change', carregarAgendamentos);
document.getElementById('btnBloquearIntervalo').addEventListener('click', bloquearIntervalo);
document.getElementById('btnBloquearDiaTodo').addEventListener('click', bloquearDiaTodo);
document.getElementById('btnAgendarManual').addEventListener('click', agendarManual);

async function carregarAgendamentos() {
  const data = filtroData.value;
  if (!data) return;

  listaAgendamentos.innerHTML = 'Carregando...';

  try {
    const res = await fetch(`${API_URL}/agendamentos/ocupados?data=${data}`);
    const agendamentos = await res.json();

    if (agendamentos.length === 0) {
      listaAgendamentos.innerHTML = '<p>Nenhum agendamento ou bloqueio para este dia.</p>';
      return;
    }

    listaAgendamentos.innerHTML = '';
    agendamentos.forEach(ag => {
      // Extrai diretamente os caracteres da hora sem converter fuso
      const horaStr = ag.inicio.split('T')[1].substring(0, 5);

      const div = document.createElement('div');
      div.className = ag.cliente.includes('BLOQUEADO') ? 'card-agendamento card-bloqueado' : 'card-agendamento';
      div.innerHTML = `
        <div>
          <strong>${horaStr}</strong> - ${ag.cliente} (${ag.servico})<br>
          <small>Contato: ${ag.telefoneCliente || 'N/A'} | Obs: ${ag.observacao || 'Nenhuma'}</small>
        </div>
      `;
      listaAgendamentos.appendChild(div);
    });
  } catch (err) {
    listaAgendamentos.innerHTML = '<p>Erro ao carregar os dados.</p>';
  }
}

async function enviarAgendamento(payload) {
  try {
    const res = await fetch(`${API_URL}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function bloquearIntervalo() {
  const data = dataBloqueio.value;
  const hInicio = parseInt(document.getElementById('horaInicioBloqueio').value.split(':')[0]);
  const hFim = parseInt(document.getElementById('horaFimBloqueio').value.split(':')[0]);

  if (hInicio >= hFim) return alert('Horário final deve ser maior que o horário de início.');

  for (let h = hInicio; h < hFim; h++) {
    const horaFormatted = String(h).padStart(2, '0') + ':00';
    await enviarAgendamento({
      cliente: 'BLOQUEADO (PAUSA/FOLGA)',
      telefone: '00000000000',
      servico: 'Corte',
      observacao: 'Bloqueio manual',
      dataHora: `${data}T${horaFormatted}:00`
    });
  }

  alert('Intervalo bloqueado com sucesso!');
  carregarAgendamentos();
}

async function bloquearDiaTodo() {
  const data = dataBloqueio.value;
  const horas = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  for (const hora of horas) {
    await enviarAgendamento({
      cliente: 'BLOQUEADO (DIA TODO)',
      telefone: '00000000000',
      servico: 'Corte',
      observacao: 'Dia bloqueado',
      dataHora: `${data}T${hora}:00`
    });
  }

  alert('Dia todo bloqueado com sucesso!');
  carregarAgendamentos();
}

async function agendarManual() {
  const cliente = document.getElementById('manualCliente').value;
  const telefone = document.getElementById('manualTelefone').value;
  const servico = document.getElementById('manualServico').value;
  const data = manualData.value;
  const hora = document.getElementById('manualHora').value;

  if (!cliente) return alert('Digite o nome do cliente!');

  const sucesso = await enviarAgendamento({
    cliente,
    telefone,
    servico,
    observacao: 'Agendado manualmente no painel',
    dataHora: `${data}T${hora}:00`
  });

  if (sucesso) {
    alert('Cliente agendado com sucesso!');
    carregarAgendamentos();
  } else {
    alert('Erro ou horário com conflito!');
  }
}

carregarAgendamentos();