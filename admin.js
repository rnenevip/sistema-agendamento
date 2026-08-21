const API_URL = 'https://sistema-agendamento-8tlb.onrender.com'; 

// Elementos da Tela
const filtroData = document.getElementById('filtroData');
const listaAgendamentos = document.getElementById('listaAgendamentos');

// Elementos de Bloqueio
const dataBloqueio = document.getElementById('dataBloqueio');
const horaInicioBloqueio = document.getElementById('horaInicioBloqueio');
const btnBloquearIntervalo = document.getElementById('btnBloquearIntervalo');
const btnBloquearDiaTodo = document.getElementById('btnBloquearDiaTodo');

// Elementos do Agendamento Manual
const manualCliente = document.getElementById('manualCliente');
const manualTelefone = document.getElementById('manualTelefone');
const manualServico = document.getElementById('manualServico');
const manualData = document.getElementById('manualData');
const manualHoraInicio = document.getElementById('manualHoraInicio');
const btnAgendarManual = document.getElementById('btnAgendarManual');

// 1. Preenche a data de hoje nos campos ao abrir
function setHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const dataFormatada = `${ano}-${mes}-${dia}`;
  
  if (filtroData && !filtroData.value) filtroData.value = dataFormatada;
  if (dataBloqueio && !dataBloqueio.value) dataBloqueio.value = dataFormatada;
  if (manualData && !manualData.value) manualData.value = dataFormatada;
}

// 2. Carrega e exibe a lista do dia
async function carregarAgendamentos() {
  setHoje();
  const dataSelecionada = filtroData.value;
  
  if (!dataSelecionada) return;

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
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    listaAgendamentos.innerHTML = '<p style="color:red; font-weight:bold;">Erro ao carregar dados do servidor.</p>';
  }
}

// 3. Bloquear Horário Específico
async function bloquearHorario() {
  const data = dataBloqueio.value;
  const hora = horaInicioBloqueio.value;

  if (!data) {
    alert('Selecione a data para o bloqueio.');
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
      alert('Horário bloqueado com sucesso!');
      carregarAgendamentos();
    } else {
      alert(result.error || 'Não foi possível bloquear.');
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao conectar ao servidor.');
  }
}

// 4. Criar Agendamento Manual
async function agendarManual() {
  const cliente = manualCliente.value.trim();
  const telefone = manualTelefone.value.trim();
  const servico = manualServico.value;
  const data = manualData.value;
  const hora = manualHoraInicio.value;

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
      alert('Agendamento realizado com sucesso!');
      manualCliente.value = '';
      manualTelefone.value = '';
      carregarAgendamentos();
    } else {
      alert(result.error || 'Erro ao realizar agendamento.');
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao conectar ao servidor.');
  }
}

// Vincula os Eventos e Botões
if (filtroData) filtroData.addEventListener('change', carregarAgendamentos);
if (btnBloquearIntervalo) btnBloquearIntervalo.addEventListener('click', bloquearHorario);
if (btnAgendarManual) btnAgendarManual.addEventListener('click', agendarManual);

document.addEventListener('DOMContentLoaded', carregarAgendamentos);