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

  if (mensagemDiv) {
    mensagemDiv.innerHTML = '';
    mensagemDiv.className = 'hidden';
  }

  if (!servico || !data) {
    if (secaoHorarios) secaoHorarios.classList.add('hidden');
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

    let duracaoNovo = 60;
    if (servico.includes('Corte') || servico.includes('Escova')) duracaoNovo = 45;
    else if (servico.includes('Coloração')) duracaoNovo = 120;
    else if (servico.includes('Mechas')) duracaoNovo = 240;

    gridHorarios.innerHTML = '';
    secaoHorarios.classList.remove('hidden');
    if (btnConfirmar) btnConfirmar.disabled = true;
    if (horarioSelecionadoInput) horarioSelecionadoInput.value = '';

    HORARIOS_DIA.forEach(hora => {
      const [h, m] = hora.split(':').map(Number);
      const inicioNovoMin = h * 60 + m;
      const fimNovoMin = inicioNovoMin + duracaoNovo;

      // Extração cirúrgica do horário sem interferência de fuso horário/UTC
      const temConflito = Array.isArray(ocupados) && ocupados.some(ag => {
        if (!ag) return false;

        const rawInicio = ag.inicio || ag.dataHora || (typeof ag === 'string' ? ag : '');
        if (!rawInicio) return false;

        // Pega exatamente a string "HH:MM" de dentro do texto do banco, ignorando Z/UTC
        const matchInicio = rawInicio.match(/(\d{2}):(\d{2})/);
        if (!matchInicio) return false;

        const hIn = parseInt(matchInicio[1], 10);
        const mIn = parseInt(matchInicio[2], 10);
        const inicioAgMin = hIn * 60 + mIn;

        let fimAgMin = inicioAgMin + 60;
        const rawFim = ag.fim || ag.dataHoraFim;
        if (rawFim) {
          const matchFim = rawFim.match(/(\d{2}):(\d{2})/);
          if (matchFim) {
            fimAgMin = parseInt(matchFim[1], 10) * 60 + parseInt(matchFim[2], 10);
          }
        }

        return (inicioNovoMin < fimAgMin) && (fimNovoMin > inicioAgMin);
      });

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-horario';
      btn.textContent = hora;

      if (temConflito) {
        btn.disabled = true;
        btn.classList.add('indisponivel');
      } else {
        btn.onclick = () => {
          if (mensagemDiv) {
            mensagemDiv.innerHTML = '';
            mensagemDiv.className = 'hidden';
          }

          document.querySelectorAll('.btn-horario').forEach(b => {
            if (!b.disabled) {
              b.classList.remove('selecionado');
            }
          });
          
          btn.classList.add('selecionado');
          if (horarioSelecionadoInput) horarioSelecionadoInput.value = `${data}T${hora}:00`;
          if (btnConfirmar) btnConfirmar.disabled = false;
        };
      }

      gridHorarios.appendChild(btn);
    });

  } catch (err) {
    console.error("Erro ao carregar horários:", err);
  }
}

const form = document.getElementById('formAgendamento');
if (form) {
  form.addEventListener('submit', async (e) => {
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

        form.reset();
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
}