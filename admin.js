const API_URL = 'https://sistema-agendamento-8tlb.onrender.com';

// Preenche a data de hoje nos inputs ao abrir
function setHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const dataFormatada = `${ano}-${mes}-${dia}`;
  
  const filtroData = document.getElementById('filtroData');
  const dataBloqueio = document.getElementById('dataBloqueio');
  const manualData = document.getElementById('manualData');

  if (filtroData && !filtroData.value) filtroData.value = dataFormatada;
  if (dataBloqueio && !dataBloqueio.value) dataBloqueio.value = dataFormatada;
  if (manualData && !manualData.value) manualData.value = dataFormatada;
}

// Busca e renderiza os agendamentos na tela
async function carregarAgendamentos() {
  setHoje();
  const filtroData = document.getElementById('filtroData');
  const listaAgendamentos = document.getElementById('listaAgendamentos');
  
  if (!filtroData || !listaAgendamentos) return;
  const dataSelecionada = filtroData.value;

  listaAgendamentos.innerHTML = '<p>Carregando agendamentos...</p>';

  try {
    const res = await fetch(`${API_URL}/agendamentos/ocupados?data=${dataSelecionada}`);
    if (!res.ok) throw new Error('Erro na requisição');
    
    const agendamentos = await res.json();

    if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
      listaAgendamentos.innerHTML = '<p>Nenhum agendamento ou bloqueio nesta data.</p>';
      return;
    }

    listaAgendamentos.innerHTML = agendamentos.map(item => {
      const hora = new Date(item.inicio).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'UTC' 
      });
      const eBloqueio = item.cliente === 'BLOQUEADO';
      
      return `
        <div style="padding: 10px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 6px; background-color: ${eBloqueio ? '#ffe6e6' : '#e6f7ff'};">
          <strong>${hora}</strong> - ${item.cliente} (${item.servico})
          ${item.telefoneCliente && item.telefoneCliente !== 'N/A' ? `<br><small>📱 ${item.telefoneCliente}</small>` : ''}
          <div style="margin-top: 8px;">
            <button type="button" onclick="desmarcarAgendamento('${item.id}', '${item.inicio}', '${item.cliente}')" class="btn btn-red" style="padding: 4px 8px; font-size: 12px; cursor: pointer;">❌ Desmarcar / Cancelar</button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    listaAgendamentos.innerHTML = '<p style="color:red; font-weight:bold;">Erro ao carregar dados do servidor.</p>';
  }
}

// Desmarcar / Cancelar Agendamento
async function desmarcarAgendamento(id, inicio, nomeCliente) {
  const motivo = prompt(`Qual o motivo do cancelamento para ${nomeCliente}?`);
  
  if (motivo === null) return;
  if (!motivo.trim()) {
    alert('Por favor, informe o motivo do cancelamento.');
    return;
  }

  try {
    // Tenta cancelar pelo ID do agendamento ou enviando os dados de deleção
    const url = id && id !== 'undefined' ? `${API_URL}/agendamentos/${id}` : `${API_URL}/agendamentos`;
    
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id,
        inicio: inicio,
        motivo: motivo
      })
    });

    if (res.ok) {
      alert('✅ Horário desmarcado com sucesso!');
      carregarAgendamentos();
    } else {
      const result = await res.json().catch(() => ({}));
      alert(`⚠️ ${result.message || result.error || 'Não foi possível desmarcar este horário.'}`);
    }
  } catch (err) {
    console.error(err);
    alert('❌ Erro de conexão com o servidor ao desmarcar.');
  }
}

// Bloqueio de Horário
async function bloquearHorario() {
  const dataBloqueio = document.getElementById('dataBloqueio');
  const horaInicioBloqueio = document.getElementById('horaInicioBloqueio');

  const data = dataBloqueio ? dataBloqueio.value : '';
  const hora = horaInicioBloqueio ? horaInicioBloqueio.value : '08:00';

  if (!data) {
    alert('Selecione uma data para realizar o bloqueio.');
    return;
  }

  const dataHoraISO = `${data}T${hora}:00.000Z`;

  try {
    const res = await fetch(`${API_URL}/bloquear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataHora: dataHoraISO,
        motivo: 'Pausa/Bloqueio'
      })
    });

    const result = await res.json();

    if (res.ok) {
      alert('✅ Horário bloqueado com sucesso!');
      carregarAgendamentos();
    } else {
      alert(`⚠️ ${result.error || 'Não foi possível bloquear este horário.'}`);
    }
  } catch (err) {
    console.error(err);
    alert('❌ Erro de conexão com o servidor.');
  }
}

// Agendamento Manual
async function agendarManual() {
  const cliente = document.getElementById('manualCliente')?.value.trim();
  const telefone = document.getElementById('manualTelefone')?.value.trim();
  const servico = document.getElementById('manualServico')?.value;
  const data = document.getElementById('manualData')?.value;
  const hora = document.getElementById('manualHoraInicio')?.value;

  if (!cliente || !data) {
    alert('Preencha o nome do cliente e a data.');
    return;
  }

  const dataHoraISO = `${data}T${hora}:00.000Z`;

  try {
    const res = await fetch(`${API_URL}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente,
        telefone: telefone || 'Não informado',
        servico,
        dataHora: dataHoraISO
      })
    });

    const result = await res.json();

    if (res.ok) {
      alert('✅ Agendamento realizado com sucesso!');
      document.getElementById('manualCliente').value = '';
      document.getElementById('manualTelefone').value = '';
      carregarAgendamentos();
    } else {
      alert(`⚠️ ${result.error || 'Não foi possível agendar.'}`);
    }
  } catch (err) {
    console.error(err);
    alert('❌ Erro de conexão com o servidor.');
  }
}

// Escuta a alteração do filtro de data
document.addEventListener('DOMContentLoaded', () => {
  const filtroData = document.getElementById('filtroData');
  if (filtroData) {
    filtroData.addEventListener('change', carregarAgendamentos);
  }
  carregarAgendamentos();
});