const API_URL = 'https://sistema-agendamento-8tlb.onrender.com';

const HORARIOS_DIA = [
  "08:00", "09:00", "10:00", "11:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00"
];

document.addEventListener('DOMContentLoaded', () => {
  const usuarioLogado = sessionStorage.getItem('usuarioLogado');
  if (usuarioLogado) {
    exibirPainelAdmin();
  } else {
    exibirLogin();
  }

  const filtroData = document.getElementById('filtroData');
  if (filtroData) {
    filtroData.addEventListener('change', carregarAgendamentos);
  }

  // Event Listeners para o agendamento manual no Admin
  const adminServico = document.getElementById('adminServico');
  const adminData = document.getElementById('adminData');

  if (adminServico && adminData) {
    adminServico.addEventListener('change', carregarHorariosAdmin);
    adminData.addEventListener('change', carregarHorariosAdmin);
    adminData.addEventListener('input', carregarHorariosAdmin);
  }
});

function exibirLogin() {
  document.getElementById('telaLogin').classList.remove('hidden');
  document.getElementById('telaAdmin').classList.add('hidden');
}

function exibirPainelAdmin() {
  document.getElementById('telaLogin').classList.add('hidden');
  document.getElementById('telaAdmin').classList.remove('hidden');
  carregarAgendamentos();
}

async function fazerLogin(event) {
  event.preventDefault();
  const usuario = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });

    const data = await res.json();

    if (res.ok) {
      sessionStorage.setItem('usuarioLogado', JSON.stringify(data));
      exibirPainelAdmin();
    } else {
      alert(`⚠️ ${data.error || 'Usuário ou senha incorretos.'}`);
    }
  } catch (err) {
    alert('❌ Erro ao conectar com o servidor.');
  }
}

function fazerLogout() {
  sessionStorage.removeItem('usuarioLogado');
  exibirLogin();
}

/* --- MODAL AGENDAMENTO MANUAL ADMIN --- */
function abrirModalAgendamentoAdmin() {
  document.getElementById('modalAgendamentoAdmin').classList.remove('hidden');
  const filtroData = document.getElementById('filtroData');
  if (filtroData && filtroData.value) {
    document.getElementById('adminData').value = filtroData.value;
  }
  carregarHorariosAdmin();
}

function fecharModalAgendamentoAdmin() {
  document.getElementById('modalAgendamentoAdmin').classList.add('hidden');
  document.getElementById('adminCliente').value = '';
  document.getElementById('adminTelefone').value = '';
  document.getElementById('adminServico').value = '';
  document.getElementById('adminObservacao').value = '';
  document.getElementById('adminHorarioSelecionado').value = '';
  document.getElementById('adminSecaoHorarios').classList.add('hidden');
  document.getElementById('adminBtnConfirmar').disabled = true;
}

async function carregarHorariosAdmin() {
  const servico = document.getElementById('adminServico').value;
  const data = document.getElementById('adminData').value;
  const adminSecaoHorarios = document.getElementById('adminSecaoHorarios');
  const adminGridHorarios = document.getElementById('adminGridHorarios');
  const adminBtnConfirmar = document.getElementById('adminBtnConfirmar');
  const adminHorarioSelecionado = document.getElementById('adminHorarioSelecionado');

  if (!servico || !data) {
    if (adminSecaoHorarios) adminSecaoHorarios.classList.add('hidden');
    return;
  }

  try {
    let ocupados = [];
    try {
      const resOcupados = await fetch(`${API_URL}/agendamentos/ocupados?data=${data}`);
      if (resOcupados.ok) {
        ocupados = await resOcupados.json();
      }
    } catch (e) {
      console.warn("Erro ao buscar agendamentos ocupados no Admin.");
    }

    const servicoLower = servico.toLowerCase();
    let duracaoNovo = 60;

    if (servicoLower.includes('mecha')) {
      duracaoNovo = 240;
    } else if (servicoLower.includes('tintura')) {
      duracaoNovo = 80;
    } else if (servicoLower.includes('plastica') || servicoLower.includes('plástica')) {
      duracaoNovo = 90;
    } else if (servicoLower.includes('corte') || servicoLower.includes('escova')) {
      duracaoNovo = 45;
    }

    adminGridHorarios.innerHTML = '';
    adminSecaoHorarios.classList.remove('hidden');
    adminBtnConfirmar.disabled = true;
    adminHorarioSelecionado.value = '';

    const horariosInicioOcupados = Array.isArray(ocupados) 
      ? ocupados.map(ag => {
          if (!ag) return null;
          const rawInicio = ag.inicio || ag.dataHora || (typeof ag === 'string' ? ag : '');
          if (!rawInicio) return null;
          const match = rawInicio.match(/(\d{2}):(\d{2})/);
          return match ? `${match[1]}:${match[2]}` : null;
        }).filter(Boolean)
      : [];

    HORARIOS_DIA.forEach(hora => {
      const [h, m] = hora.split(':').map(Number);
      const inicioNovoMin = h * 60 + m;
      const fimNovoMin = inicioNovoMin + duracaoNovo;

      let temConflito = horariosInicioOcupados.includes(hora);

      const LIMITE_EXPEDIENTE_MIN = 18 * 60;
      if (fimNovoMin > LIMITE_EXPEDIENTE_MIN) {
        temConflito = true;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-horario';
      btn.textContent = hora;

      if (temConflito) {
        btn.disabled = true;
        btn.classList.add('indisponivel');
      } else {
        btn.onclick = () => {
          document.querySelectorAll('#adminGridHorarios .btn-horario').forEach(b => {
            if (!b.disabled) b.classList.remove('selecionado');
          });
          
          btn.classList.add('selecionado');
          adminHorarioSelecionado.value = `${data}T${hora}:00`;
          adminBtnConfirmar.disabled = false;
        };
      }

      adminGridHorarios.appendChild(btn);
    });

  } catch (err) {
    console.error("Erro ao carregar horários no Admin:", err);
  }
}

async function salvarAgendamentoAdmin(event) {
  event.preventDefault();

  const cliente = document.getElementById('adminCliente').value.trim();
  const telefone = document.getElementById('adminTelefone').value.trim();
  const servico = document.getElementById('adminServico').value;
  const observacao = document.getElementById('adminObservacao').value.trim();
  const dataHora = document.getElementById('adminHorarioSelecionado').value;

  if (!dataHora) {
    alert("Por favor, selecione um horário disponível.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente, telefone, servico, observacao, dataHora })
    });

    const dataRes = await response.json();

    if (response.ok) {
      alert("✅ Agendamento realizado com sucesso!");
      fecharModalAgendamentoAdmin();
      
      // Sincroniza a data do filtro com a data do novo agendamento e recarrega
      const dataApenas = dataHora.split('T')[0];
      const filtroData = document.getElementById('filtroData');
      if (filtroData) filtroData.value = dataApenas;
      
      carregarAgendamentos();
    } else {
      alert(`⚠️ ${dataRes.message || 'Este horário não está disponível.'}`);
      carregarHorariosAdmin();
    }
  } catch (error) {
    alert("❌ Erro ao conectar com o servidor.");
  }
}

/* --- MODAL CADASTRO --- */
function abrirModalCadastro() {
  document.getElementById('modalCadastro').classList.remove('hidden');
}

function fecharModalCadastro() {
  document.getElementById('modalCadastro').classList.add('hidden');
  document.getElementById('novoNome').value = '';
  document.getElementById('novoUsuario').value = '';
  document.getElementById('novaSenha').value = '';
}

async function cadastrarNovoUsuario(event) {
  event.preventDefault();
  const nome = document.getElementById('novoNome').value.trim();
  const usuario = document.getElementById('novoUsuario').value.trim();
  const senha = document.getElementById('novaSenha').value.trim();

  try {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, usuario, senha })
    });

    const data = await res.json();

    if (res.ok) {
      alert('✅ Usuário cadastrado com sucesso!');
      fecharModalCadastro();
    } else {
      alert(`⚠️ ${data.error || 'Erro ao cadastrar.'}`);
    }
  } catch (err) {
    alert('❌ Erro de conexão.');
  }
}

/* --- MODAL BLOQUEIO --- */
function abrirModalBloqueio() {
  document.getElementById('modalBloqueio').classList.remove('hidden');
  const filtroData = document.getElementById('filtroData');
  if (filtroData && filtroData.value) {
    document.getElementById('bloqueioData').value = filtroData.value;
  }
}

function fecharModalBloqueio() {
  document.getElementById('modalBloqueio').classList.add('hidden');
  document.getElementById('bloqueioMotivo').value = '';
}

function selecionarDiaTodo() {
  document.getElementById('bloqueioHoraInicio').value = '08:00';
  document.getElementById('bloqueioHoraFim').value = '19:00';
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

function setHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const dataFormatada = `${ano}-${mes}-${dia}`;
  
  const filtroData = document.getElementById('filtroData');
  if (filtroData && !filtroData.value) filtroData.value = dataFormatada;
}

async function carregarAgendamentos() {
  setHoje();
  const filtroData = document.getElementById('filtroData');
  const listaAgendamentos = document.getElementById('listaAgendamentos');
  const listaCancelados = document.getElementById('listaCancelados');
  
  if (!filtroData || !listaAgendamentos) return;
  const dataSelecionada = filtroData.value;

  listaAgendamentos.innerHTML = '<p>Carregando...</p>';

  try {
    const res = await fetch(`${API_URL}/agendamentos/ocupados?data=${dataSelecionada}`);
    const agendamentos = await res.json();

    if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
      listaAgendamentos.innerHTML = '<p style="margin-top:10px;">Nenhum agendamento nesta data.</p>';
      if (listaCancelados) listaCancelados.innerHTML = '<p style="margin-top:10px;">Nenhum horário desmarcado.</p>';
      return;
    }

    const ativos = agendamentos.filter(item => item.status !== 'CANCELADO');
    const cancelados = agendamentos.filter(item => item.status === 'CANCELADO');

    listaAgendamentos.innerHTML = ativos.length === 0 ? '<p style="margin-top:10px;">Nenhum agendamento ativo.</p>' : ativos.map(item => {
      const hora = new Date(item.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      const isBloqueio = item.cliente === 'BLOQUEADO';

      return `
        <div class="agendamento-card" style="${isBloqueio ? 'border-left: 4px solid #dc3545;' : ''}">
          <div class="agendamento-info">
            <strong>${hora}</strong> - ${item.cliente} ${isBloqueio ? `(${item.servico})` : `(${item.servico})`}
            ${item.telefoneCliente && !isBloqueio ? `<br><small>📱 ${item.telefoneCliente}</small>` : ''}
          </div>
          <button type="button" onclick="desmarcarAgendamento('${item._id}', '${item.inicio}', '${item.cliente}')" class="btn-cancelar">
            ✖ ${isBloqueio ? 'Desbloquear / Remover' : 'Desmarcar / Cancelar'}
          </button>
        </div>
      `;
    }).join('');

    if (listaCancelados) {
      listaCancelados.innerHTML = cancelados.length === 0 ? '<p style="margin-top:10px;">Nenhum horário desmarcado.</p>' : cancelados.map(item => {
        const hora = new Date(item.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        return `
          <div class="agendamento-card cancelado">
            <div class="agendamento-info">
              <strong>${hora}</strong> - ${item.cliente} (${item.servico})
              <br><small style="color: #a93226;">Motivo: ${item.motivoCancelamento || 'Não informado'}</small>
            </div>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    listaAgendamentos.innerHTML = '<p style="color:red; margin-top:10px;">Erro ao carregar agendamentos.</p>';
  }
}

async function desmarcarAgendamento(id, inicio, nomeCliente) {
  const motivo = prompt(`Motivo do cancelamento/desbloqueio para ${nomeCliente}?`);
  if (!motivo) return;

  try {
    const res = await fetch(`${API_URL}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, inicio, motivo })
    });

    if (res.ok) {
      carregarAgendamentos();
    } else {
      alert('⚠️ Não foi possível desmarcar.');
    }
  } catch (err) {
    alert('❌ Erro de conexão.');
  }
}