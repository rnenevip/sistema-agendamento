const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Libera requisições de qualquer origem (Vercel, Localhost, etc.)
app.use(cors({ origin: '*' }));
app.use(express.json());

// Conexão com o MongoDB Atlas
// NOTA: O '!' da senha foi convertido para '%21' para não quebrar a URL
const MONGO_URI = 'mongodb+srv://admin:Rtk%2127082019@cluster0.czs3zas.mongodb.net/salao?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
  .catch(err => console.error('❌ Erro de conexão no MongoDB:', err));

// Esquema/Modelo do Agendamento
const AgendamentoSchema = new mongoose.Schema({
  cliente: { type: String, required: true },
  telefoneCliente: { type: String, default: '' },
  servico: { type: String, required: true },
  observacao: { type: String, default: '' },
  inicio: { type: Date, required: true }
});

const Agendamento = mongoose.model('Agendamento', AgendamentoSchema);

// Rota 1: Rota principal de teste/healthcheck
app.get('/', (req, res) => {
  res.send('API do Salão rodando perfeitamente!');
});

// Rota 2: Buscar agendamentos ocupados de uma data específica (YYYY-MM-DD)
app.get('/agendamentos/ocupados', async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.status(400).json({ error: 'Data é obrigatória' });

    // Pega do início até o fim do dia informado
    const inicioDia = new Date(`${data}T00:00:00.000Z`);
    const fimDia = new Date(`${data}T23:59:59.999Z`);

    const agendamentos = await Agendamento.find({
      inicio: { $gte: inicioDia, $lte: fimDia }
    }).sort({ inicio: 1 });

    res.json(agendamentos);
  } catch (err) {
    console.error('Erro na rota GET /agendamentos/ocupados:', err);
    res.status(500).json({ error: 'Erro interno ao buscar agendamentos' });
  }
});

// Rota 3: Criar novo agendamento do cliente
app.post('/agendar', async (req, res) => {
  try {
    const { cliente, telefone, servico, observacao, dataHora } = req.body;

    if (!cliente || !servico || !dataHora) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const dataAgendamento = new Date(dataHora);

    // Checa conflito de horário
    const ocupado = await Agendamento.findOne({ inicio: dataAgendamento });
    if (ocupado) {
      return res.status(400).json({ error: 'Horário já reservado ou bloqueado' });
    }

    const novoAgendamento = new Agendamento({
      cliente,
      telefoneCliente: telefone || '',
      servico,
      observacao: observacao || '',
      inicio: dataAgendamento
    });

    await novoAgendamento.save();
    res.status(201).json({ message: 'Agendamento criado com sucesso!', agendamento: novoAgendamento });
  } catch (err) {
    console.error('Erro na rota POST /agendar:', err);
    res.status(500).json({ error: 'Erro interno ao salvar agendamento' });
  }
});

// Rota 4: Bloquear Horários pelo Admin
app.post('/bloquear', async (req, res) => {
  try {
    const { dataHora, motivo } = req.body;

    if (!dataHora) {
      return res.status(400).json({ error: 'Data e hora são obrigatórias' });
    }

    const dataBloqueio = new Date(dataHora);

    const ocupado = await Agendamento.findOne({ inicio: dataBloqueio });
    if (ocupado) {
      return res.status(400).json({ error: 'Horário já possui agendamento ou bloqueio' });
    }

    const novoBloqueio = new Agendamento({
      cliente: 'BLOQUEADO',
      telefoneCliente: 'N/A',
      servico: motivo || 'Bloqueio de Horário',
      observacao: 'Indisponível',
      inicio: dataBloqueio
    });

    await novoBloqueio.save();
    res.status(201).json({ message: 'Horário bloqueado com sucesso!' });
  } catch (err) {
    console.error('Erro na rota POST /bloquear:', err);
    res.status(500).json({ error: 'Erro ao criar bloqueio' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});