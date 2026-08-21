const API_URL = 'https://sistema-agendamento-8tlb.onrender.com';

const filtroData = document.getElementById('filtroData');
const listaAgendamentos = document.getElementById('listaAgendamentos');
const btnBloquearManual = document.getElementById('btnBloquearManual');
const horaBloqueio = document.getElementById('horaBloqueio');

// Define a data de hoje como padrão no filtro
filtroData.value = new Date().toISOString().split('T')[0];

filtroData.addEventListener('change', carregarAgendamentos);
btnBloquearManual.addEventListener('click', bloquearHorario);

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
      const hora = new Date(ag.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const div = document.createElement('div');
      div.className = 'card-agendamento';
      div.innerHTML = `
        <div>
          <strong>${hora}</strong> - ${ag.cliente} (${ag.servico})<br>
          <small>Contato: ${ag.telefoneCliente || 'N/A'} | Obs: ${ag.observacao || 'Nenhuma'}</small>
        </div>
      `;
      listaAgendamentos.appendChild(div);
    });
  } catch (err) {
    listaAgendamentos.innerHTML = '<p>Erro ao carregar os dados.</p>';
  }
}

async function bloquearHorario() {
  const data = filtroData.value;
  const hora = horaBloqueio.value;

  if (!data) return alert('Selecione uma data!');

  const dataHora = `${data}T${hora}:00`;

  try {
    const res = await fetch(`${API_URL}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: 'BLOQUEADO (PAUSA/FOLGA)',
        telefone: '00000000000',
        servico: 'Corte',
        observacao: 'Horário bloqueado manualmente pelo painel',
        dataHora: dataHora
      })
    });

    if (res.ok) {
      alert('Horário bloqueado com sucesso!');
      carregarAgendamentos();
    } else {
      const erro = await res.json();
      alert(erro.message);
    }
  } catch (e) {
    alert('Erro ao bloquear horário.');
  }
}

// Carrega os agendamentos ao abrir a tela
carregarAgendamentos();