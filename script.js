// URL do backend hospedado no Render
const API_URL = 'https://sistema-agendamento-8tlb.onrender.com';

const selectServico = document.getElementById('servico');
const inputData = document.getElementById('data');
const secaoHorarios = document.getElementById('secaoHorarios');
const gridHorarios = document.getElementById('gridHorarios');
const horarioSelecionadoInput = document.getElementById('horarioSelecionado');
const btnConfirmar = document.getElementById('btnConfirmar');
const mensagemDiv = document.getElementById('mensagem');

const HORARIOS_DIA = [
  "08:00", "09:00", "10:00", "11:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00"
];

selectServico.addEventListener('change', carregarHorarios);
inputData.addEventListener('change', carregarHorarios);
inputData.addEventListener('input', carregarHorarios);

async function carregarHorarios() {
  const servico = selectServico.value;
  const data = inputData.value;

  if (!servico || !data) {
    secaoHorarios.classList.add('hidden');
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
      console.warn("Aguardando resposta da API no Render...");
    }

    const duracoes = {
      'Corte': 45,
      'Escova': 45,
      'Coloração': 120,
      'Mechas': 240
    };
    const duracaoNovo = duracoes[servico] || 60;

    gridHorarios.innerHTML = '';
    secaoHorarios.classList.remove('hidden');
    btnConfirmar.disabled = true;
    horarioSelecionadoInput.value = '';

    HORARIOS_DIA.forEach(hora => {
      const [ano, mes, dia] = data.split('-');
      const [horaNum, minNum] = hora.split(':');
      
      const inicioNovo = new Date(ano, mes - 1, dia, horaNum, minNum);
      const fimNovo = new Date(inicioNovo.getTime() + duracaoNovo * 60000);

      const temConflito = ocupados.some(ag => {
        const inicioAg = new Date(ag.inicio);
        const fimAg = new Date(ag.fim);
        return inicioNovo < fimAg && fimNovo > inicioAg;
      });

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-horario';
      btn.textContent = hora;

      if (temConflito) {
        btn.disabled = true;
        btn.title = 'Horário indisponível';
      } else {
        btn.onclick = () => {
          document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selecionado'));
          btn.classList.add('selecionado');
          horarioSelecionadoInput.value = `${data}T${hora}:00`;
          btnConfirmar.disabled = false;
        };
      }

      gridHorarios.appendChild(btn);
    });

  } catch (err) {
    console.error("Erro ao carregar horários:", err);
  }
}

document.getElementById('formAgendamento').addEventListener('submit', async (e) => {
  e.preventDefault();

  const cliente = document.getElementById('cliente').value;
  const telefone = document.getElementById('telefone').value;
  const servico = selectServico.value;
  const observacao = document.getElementById('observacao').value;
  const dataHora = horarioSelecionadoInput.value;

  try {
    const response = await fetch(`${API_URL}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente, telefone, servico, observacao, dataHora })
    });

    const data = await response.json();

    if (response.ok) {
      mensagemDiv.className = 'sucesso';
      mensagemDiv.classList.remove('hidden');
      mensagemDiv.innerHTML = `
        <p><strong>${data.message}</strong></p>
        <br>
        <a href="${data.linkWhatsapp}" target="_blank" style="display:inline-block; padding:10px 15px; background:#25D366; color:white; border-radius:6px; text-decoration:none; font-weight:bold;">
           📲 Enviar Notificação no WhatsApp
        </a>
      `;
      carregarHorarios();
    } else {
      mensagemDiv.className = 'erro';
      mensagemDiv.classList.remove('hidden');
      mensagemDiv.textContent = data.message;
    }
  } catch (error) {
    mensagemDiv.className = 'erro';
    mensagemDiv.classList.remove('hidden');
    mensagemDiv.textContent = 'Erro ao conectar com o servidor em nuvem.';
  }
});