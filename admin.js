// ATENÇÃO: Verifique se este é o link exato do seu serviço Web no Render
const API_URL = 'https://sistema-agendamento-8tlb.onrender.com';

const filtroData = document.getElementById('filtroData');
const listaAgendamentos = document.getElementById('listaAgendamentos');

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

async function carregarAgendamentos() {
  setHoje();
  const dataSelecionada = filtroData.value;
  
  if (!dataSelecionada) {
    listaAgendamentos.innerHTML = '<p>Selecione uma data válida.</p>';
    return;
  }

  listaAgendamentos.innerHTML = '<p>Carregando... (O servidor gratuito pode levar até 50s para ligar)</p>';

  try {
    const res = await fetch(`${API_URL}/agendamentos/ocupados?data=${dataSelecionada}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Erro na API: ${res.status}`);
    }
    
    const agendamentos = await res.json();

    if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
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
    console.error('Erro ao buscar agendamentos:', err);
    listaAgendamentos.innerHTML = '<p style="color:red; font-weight:bold;">Erro ao conectar com o servidor. Verifique a URL do Render no admin.js ou se o Render está ativo.</p>';
  }
}

if (filtroData) {
  filtroData.addEventListener('change', carregarAgendamentos);
}

document.addEventListener('DOMContentLoaded', carregarAgendamentos);