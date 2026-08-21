const API_URL = 'https://sistema-agendamento-backend.onrender.com'; // Coloque aqui a URL real da sua API no Render

const filtroData = document.getElementById('filtroData');
const listaAgendamentos = document.getElementById('listaAgendamentos');

// 1. Define a data atual como padrão no input no formato YYYY-MM-DD
function setHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const dataFormatada = `${ano}-${mes}-${dia}`;

  if (filtroData && !filtroData.value) {
    filtroData.value = dataFormatada;
  }
}

// 2. Busca agendamentos do backend
async function carregarAgendamentos() {
  setHoje();
  const dataSelecionada = filtroData.value;
  
  if (!dataSelecionada) {
    listaAgendamentos.innerHTML = '<p>Selecione uma data válida.</p>';
    return;
  }

  listaAgendamentos.innerHTML = 'Carregando...';

  try {
    const res = await fetch(`${API_URL}/agendamentos/ocupados?data=${dataSelecionada}`);
    if (!res.ok) throw new Error('Erro na requisição');
    
    const agendamentos = await res.json();

    if (!agendamentos || agendamentos.length === 0) {
      listaAgendamentos.innerHTML = '<p>Nenhum agendamento ou bloqueio nesta data.</p>';
      return;
    }

    listaAgendamentos.innerHTML = agendamentos.map(item => {
      const hora = new Date(item.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      const eBloqueio = item.cliente === 'BLOQUEADO';
      
      return `
        <div class="card-agendamento ${eBloqueio ? 'card-bloqueado' : ''}">
          <strong>${hora}</strong> - ${item.cliente} (${item.servico})
          ${item.telefoneCliente ? `<br><small>📱 ${item.telefoneCliente}</small>` : ''}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    listaAgendamentos.innerHTML = '<p style="color:red;">Erro ao carregar dados do servidor.</p>';
  }
}

// Escuta mudanças no campo de data
if (filtroData) {
  filtroData.addEventListener('change', carregarAgendamentos);
}

// Carrega os dados assim que a página abre
document.addEventListener('DOMContentLoaded', carregarAgendamentos);