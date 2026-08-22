const API_URL = 'https://sistema-agendamento-8tlb.onrender.com';

const filtroData = document.getElementById('filtroData');
const listaAgendamentos = document.getElementById('listaAgendamentos');
const listaCancelados = document.getElementById('listaCancelados');

// Define a data atual como padrão
const hoje = new Date().toISOString().split('T')[0];
if (filtroData) {
  filtroData.value = hoje;
  filtroData.addEventListener('change', carregarAgendamentos);
}

document.addEventListener('DOMContentLoaded', carregarAgendamentos);

async function carregarAgendamentos() {
  const data = filtroData.value;
  if (!data) return;

  listaAgendamentos.innerHTML = '<p>Carregando agendamentos...</p>';
  if (listaCancelados) listaCancelados.innerHTML = '<p>Carregando cancelados...</p>';

  try {
    const res = await fetch(`${API_URL}/agendamentos?data=${data}`);
    if (!res.ok) throw new Error('Erro ao buscar agendamentos');

    const agendamentos = await res.json();

    const ativos = agendamentos.filter(a => a.status !== 'CANCELADO');
    const cancelados = agendamentos.filter(a => a.status === 'CANCELADO');

    // 1. Renderiza os Agendamentos Ativos
    if (ativos.length === 0) {
      listaAgendamentos.innerHTML = '<p>Nenhum agendamento ativo para este dia.</p>';
    } else {
      listaAgendamentos.innerHTML = ativos.map(item => `
        <div class="card-agendamento">
          <p><strong>Cliente:</strong> ${item.cliente}</p>
          <p><strong>Serviço:</strong> ${item.servico}</p>
          <p><strong>Horário:</strong> ${item.inicio} - ${item.fim}</p>
          <p><strong>Telefone:</strong> ${item.telefone}</p>
          ${item.observacao ? `<p><strong>Obs:</strong> ${item.observacao}</p>` : ''}
          <button onclick="desmarcarAgendamento('${item.id}')" class="btn btn-red" style="margin-top:10px;">❌ Desmarcar Horário</button>
        </div>
      `).join('');
    }

    // 2. Renderiza os Agendamentos Cancelados
    if (listaCancelados) {
      if (cancelados.length === 0) {
        listaCancelados.innerHTML = '<p>Nenhum horário desmarcado nesta data.</p>';
      } else {
        listaCancelados.innerHTML = cancelados.map(item => `
          <div class="card-agendamento cancelado" style="background:#fff0f0; border-left:4px solid #d9534f; padding:10px; margin-bottom:10px;">
            <p><strong>Cliente:</strong> ${item.cliente}</p>
            <p><strong>Serviço:</strong> ${item.servico}</p>
            <p><strong>Horário Liberado:</strong> ${item.inicio} - ${item.fim}</p>
            <p style="color: #c9302c;"><strong>Motivo do Cancelamento:</strong> ${item.motivoCancelamento || 'Não informado'}</p>
          </div>
        `).join('');
      }
    }

  } catch (err) {
    console.error(err);
    listaAgendamentos.innerHTML = '<p style="color:red;">Erro ao carregar dados do servidor.</p>';
  }
}

// Função para Desmarcar/Cancelar com Motivo
async function desmarcarAgendamento(id) {
  const motivo = prompt("Por qual motivo este horário está sendo desmarcado?");
  
  if (motivo === null) return; // Cancelou a digitação

  if (!motivo.trim()) {
    alert("Por favor, informe o motivo do cancelamento.");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/agendamentos/${id}/cancelar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivoCancelamento: motivo })
    });

    if (res.ok) {
      alert("Horário desmarcado com sucesso! O horário já está liberado para novos agendamentos.");
      carregarAgendamentos();
    } else {
      const errData = await res.json();
      alert(`Erro ao desmarcar: ${errData.message || 'Tente novamente.'}`);
    }
  } catch (error) {
    console.error(error);
    alert("Erro de conexão ao tentar desmarcar.");
  }
}