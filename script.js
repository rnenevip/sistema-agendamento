// URL do backend hospedado no Render
const API_URL = 'https://sistema-agendamento-8tlb.onrender.com';

// NUMERO DO WHATSAPP DO SALÃO
const TELEFONE_SALAO = '5516996422774'; 

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

  mensagemDiv.innerHTML = '';
  mensagemDiv.className = 'hidden';

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
    
    const servicoNome = servico.split(' (')[0].trim();
    const duracaoNovo = duracoes[servicoNome] || 60;

    gridHorarios.innerHTML = '';
    secaoHorarios.classList.remove('hidden');
    btnConfirmar.disabled = true;
    horarioSelecionadoInput.value = '';

    HORARIOS_DIA.forEach(hora => {
      // Cria a data local no formato de string YYYY-MM-DDTHH:MM:00
      const inicioNovoDate = new Date(`${data}T${hora}:00`);
      const fimNovoDate = new Date(inicioNovoDate.getTime() + duracaoNovo * 60000);

      const inicioNovoTime = inicioNovoDate.getTime();
      const fimNovoTime = fimNovoDate.getTime();

      // Checa conflitos ignorando a conversão automática de fuso do ISOString
      const temConflito = ocupados.some(ag => {
        // Pega os tempos de inicio e fim direto do banco de dados
        const inicioAgTime = new Date(ag.inicio).getTime();
        const fimAgTime = new Date(ag.fim).getTime();

        return (inicioNovoTime < fimAgTime) && (fimNovoTime > inicioAgTime);
      });

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-horario';
      btn.textContent = hora;

      if (temConflito) {
        btn.classList.add('indisponivel');
        btn.style.backgroundColor = '#f8d7da';
        btn.style.color = '#721c24';
        btn.style.borderColor = '#f5c6cb';
        btn.style.cursor = 'not-allowed';
        
        btn.onclick = () => {
          mensagemDiv.className = 'erro';
          mensagemDiv.classList.remove('hidden');
          mensagemDiv.textContent = 'Este horário não está disponível.';
        };
      } else {
        btn.onclick = () => {
          mensagemDiv.innerHTML = '';
          mensagemDiv.className = 'hidden';

          document.querySelectorAll('.btn-horario').forEach(b => {
            if (!b.classList.contains('indisponivel')) {
              b.classList.remove('selecionado');
            }
          });
          
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

  mensagemDiv.innerHTML = '';
  mensagemDiv.className = 'hidden';

  const cliente = document.getElementById('cliente').value;
  const telefone = document.getElementById('telefone').value;
  const servico = selectServico.value;
  const observacao = document.getElementById('observacao').value;
  const dataHora = horarioSelecionadoInput.value;

  if (!dataHora) {
    mensagemDiv.className = 'erro';
    mensagemDiv.classList.remove('hidden');
    mensagemDiv.textContent = 'Este horário não está disponível.';
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
      mensagemDiv.className = 'sucesso';
      mensagemDiv.classList.remove('hidden');

      const [dataPart, horaPart] = dataHora.split('T');
      const [ano, mes, dia] = dataPart.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;
      const horaFormatada = horaPart.substring(0, 5);

      const textoMensagem = `Olá! Fiz um agendamento pelo site:\n\n` +
        `👤 *Cliente:* ${cliente}\n` +
        `📱 *Telefone:* ${telefone}\n` +
        `💇‍♀️ *Serviço:* ${servico}\n` +
        `📅 *Data:* ${dataFormatada}\n` +
        `⏰ *Horário:* ${horaFormatada}\n` +
        (observacao ? `📝 *Obs:* ${observacao}` : '');

      const urlWhatsapp = `https://wa.me/${TELEFONE_SALAO}?text=${encodeURIComponent(textoMensagem)}`;

      mensagemDiv.innerHTML = `
        <p><strong>${dataRes.message || 'Agendamento criado com sucesso!'}</strong></p>
        <br>
        <button type="button" id="btnNotificarWhatsapp" style="display:inline-block; padding:12px 18px; background:#25D366; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:15px; width:100%;">
           📲 Enviar Notificação no WhatsApp
        </button>
      `;

      document.getElementById('btnNotificarWhatsapp').onclick = () => {
        window.open(urlWhatsapp, '_blank');
      };

      document.getElementById('formAgendamento').reset();
      secaoHorarios.classList.add('hidden');
      
    } else {
      mensagemDiv.className = 'erro';
      mensagemDiv.classList.remove('hidden');
      mensagemDiv.textContent = dataRes.message || 'Este horário não está disponível.';
      carregarHorarios();
    }
  } catch (error) {
    mensagemDiv.className = 'erro';
    mensagemDiv.classList.remove('hidden');
    mensagemDiv.textContent = 'Erro ao conectar com o servidor em nuvem.';
  }
});