const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Número do WhatsApp do Salão (Sua Esposa)
const TELEFONE_SALAO = "5516996422774";

// Tabela de Duração Base (em minutos)
const SERVICOS = {
  'Corte': 45,
  'Escova': 45,
  'Coloração': 120,
  'Mechas': 240
};

// Lista em memória dos agendamentos
const agendamentos = [];

app.get('/servicos', (req, res) => res.json(SERVICOS));

app.get('/agendamentos/ocupados', (req, res) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ erro: 'Informe a data.' });

  const agendamentosDoDia = agendamentos.filter(a => a.inicio.startsWith(data) && a.status !== 'recusado');
  res.json(agendamentosDoDia);
});

// Criar pré-agendamento e gerar link do WhatsApp para o Salão
app.post('/agendar', (req, res) => {
  const { cliente, telefone, servico, observacao, dataHora } = req.body;

  if (!cliente || !telefone || !servico || !dataHora) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
  }

  const duracao = SERVICOS[servico];
  const inicioNovo = new Date(dataHora);
  const fimNovo = new Date(inicioNovo.getTime() + duracao * 60000);

  // Checar colisão de horários
  const temConflito = agendamentos.some(ag => {
    if (ag.status === 'recusado') return false;
    const inicioAg = new Date(ag.inicio);
    const fimAg = new Date(ag.fim);
    return inicioNovo < fimAg && fimNovo > inicioAg;
  });

  if (temConflito) {
    return res.status(400).json({ message: 'Horário indisponível! Por favor, escolha outro horário.' });
  }

  // Formatação amigável de data e hora
  const dataFormatada = inicioNovo.toLocaleDateString('pt-BR');
  const horaFormatada = inicioNovo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Mensagem pronta encaminhada para o WhatsApp da Profissional
  const textoMensagem = 
    `Olá! Gostaria de agendar um horário no salão 💇‍♀️\n\n` +
    `👤 *Cliente:* ${cliente}\n` +
    `📱 *Contato:* ${telefone}\n` +
    `📌 *Serviço:* ${servico}\n` +
    `📅 *Data:* ${dataFormatada}\n` +
    `⏰ *Horário desejado:* ${horaFormatada}\n` +
    `📝 *Obs do Cabelo:* ${observacao || 'Nenhuma'}\n\n` +
    `Aguardando sua confirmação!`;

  const linkWa = `https://api.whatsapp.com/send?phone=${TELEFONE_SALAO}&text=${encodeURIComponent(textoMensagem)}`;

  const novoAgendamento = {
    id: Date.now(),
    cliente,
    telefoneCliente: telefone,
    servico,
    duracaoMinutos: duracao,
    inicio: inicioNovo.toISOString(),
    fim: fimNovo.toISOString(),
    observacao: observacao || '',
    status: 'pendente',
    linkWhatsappNotificacao: linkWa
  };

  agendamentos.push(novoAgendamento);

  res.status(201).json({
    message: 'Solicitação enviada! Clique abaixo para notificar no WhatsApp.',
    agendamento: novoAgendamento,
    linkWhatsapp: linkWa
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando com número oficial configurado em http://localhost:${PORT}`);
});