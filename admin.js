const API_URL = 'https://sistema-agendamento-8tlb.onrender.com';

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
      listaAgendamentos.innerHTML = '<p>Nenhum agendamento nesta data.</p>';
      if (listaCancelados) listaCancelados.innerHTML = '<p>Nenhum horário desmarcado.</p>';
      return;
    }

    const ativos = agendamentos.filter(item => item.status !== 'CANCELADO');
    const cancelados = agendamentos.filter(item => item.status === 'CANCELADO');

    // Estrutura EXATA do seu layout original para usar o style.css
    listaAgendamentos.innerHTML = ativos.length === 0 ? '<p>Nenhum agendamento ativo.</p>' : ativos.map(item => {
      const hora = new Date(item.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      return `
        <div class="agendamento-card">
          <div class="agendamento-info">
            <strong>${hora}</strong> - ${item.cliente} (${item.servico})
            ${item.telefoneCliente ? `<br><span class="icone-tel">📱</span> ${item.telefoneCliente}` : ''}
          </div>
          <button type="button" onclick="desmarcarAgendamento('${item._id}', '${item.inicio}', '${item.cliente}')" class="btn-cancelar">
            ✖ Desmarcar / Cancelar
          </button>
        </div>
      `;
    }).join('');

    if (listaCancelados) {
      listaCancelados.innerHTML = cancelados.length === 0 ? '<p>Nenhum horário desmarcado.</p>' : cancelados.map(item => {
        const hora = new Date(item.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        return `
          <div class="agendamento-card cancelado" style="border-left: 4px solid #dc3545; background-color: #fff0f0;">
            <div class="agendamento-info">
              <strong>${hora}</strong> - ${item.cliente} (${item.servico})
              <br><small style="color: #c9302c;">Motivo: ${item.motivoCancelamento || 'Não informado'}</small>
            </div>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    listaAgendamentos.innerHTML = '<p style="color:red;">Erro ao carregar agendamentos.</p>';
  }
}

async function desmarcarAgendamento(id, inicio, nomeCliente) {
  const motivo = prompt(`Motivo do cancelamento para ${nomeCliente}?`);
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