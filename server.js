const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const MONGO_URI = 'mongodb+srv://admin:Rtk%2127082019@cluster0.czs3zas.mongodb.net/salao?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
  .catch(err => console.error('❌ Erro de conexão no MongoDB:', err));

const AgendamentoSchema = new mongoose.Schema({
  cliente: { type: String, required: true },
  telefoneCliente: { type: String, default: '' },
  servico: { type: String, required: true },
  observacao: { type: String, default: '' },
  inicio: { type: Date, required: true },
  status: { type: String, default: 'ATIVO' },
  motivoCancelamento: { type: String, default: '' }
});

const Agendamento = mongoose.model('Agendamento', AgendamentoSchema);

app.get('/', (req, res) => {
  res.send('API do Salão rodando perfeitamente!');
});

// Buscar agendamentos do dia (ignora os cancelados)
app.get('/agendamentos/ocupados', async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.status(400).json({ error: 'Data é obrigatória' });

    const inicioDia = new Date(`${data}T00:00:00.000Z`);
    const fimDia = new Date(`${data}T23:59:59.999Z`);

    const agendamentos = await Agendamento.find({
      inicio: { $gte: inicioDia, $lte: fimDia },
      status: { $ne: 'CANCELADO' }
    }).sort({ inicio: 1 });

    res.json(agendamentos);
  } catch (err) {
    console.error('Erro na rota GET /agendamentos/ocupados:', err);
    res.status(500).json({ error: 'Erro interno ao buscar agendamentos' });
  }
});

// Criar agendamento
app.post('/agendar', async (req, res) => {
  try {
    const { cliente, telefone, servico, observacao, dataHora } = req.body;
    if (!cliente || !servico || !dataHora) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const dataAgendamento = new Date(dataHora);
    const ocupado = await Agendamento.findOne({ inicio: dataAgendamento, status: { $ne: 'CANCELADO' } });
    if (ocupado) {
      return res.status(400).json({ error: 'Horário já reservado ou bloqueado' });
    }

    const novoAgendamento = new Agendamento({
      cliente,
      telefoneCliente: telefone || '',
      servico,
      observacao: observacao || '',
      inicio: dataAgendamento,
      status: 'ATIVO'
    });

    await novoAgendamento.save();
    res.status(201).json({ message: 'Agendamento criado com sucesso!', agendamento: novoAgendamento });
  } catch (err) {
    console.error('Erro na rota POST /agendar:', err);
    res.status(500).json({ error: 'Erro interno ao salvar agendamento' });
  }
});

// Bloquear horário
app.post('/bloquear', async (req, res) => {
  try {
    const { dataHora, motivo } = req.body;
    if (!dataHora) return res.status(400).json({ error: 'Data e hora são obrigatórias' });

    const dataBloqueio = new Date(dataHora);
    const ocupado = await Agendamento.findOne({ inicio: dataBloqueio, status: { $ne: 'CANCELADO' } });
    if (ocupado) {
      return res.status(400).json({ error: 'Horário já possui agendamento ou bloqueio' });
    }

    const novoBloqueio = new Agendamento({
      cliente: 'BLOQUEADO',
      telefoneCliente: 'N/A',
      servico: motivo || 'Bloqueio de Horário',
      observacao: 'Indisponível',
      inicio: dataBloqueio,
      status: 'ATIVO'
    });

    await novoBloqueio.save();
    res.status(201).json({ message: 'Horário bloqueado com sucesso!' });
  } catch (err) {
    console.error('Erro na rota POST /bloquear:', err);
    res.status(500).json({ error: 'Erro ao criar bloqueio' });
  }
});

// Função auxiliar de cancelamento
async function processarCancelamento(req, res) {
  try {
    const { id, inicio, motivo } = req.body;
    const reqId = req.params.id || id;

    let agendamento = null;

    if (reqId && mongoose.Types.ObjectId.isValid(reqId)) {
      agendamento = await Agendamento.findById(reqId);
    }
    
    if (!agendamento && inicio) {
      agendamento = await Agendamento.findOne({ inicio: new Date(inicio), status: { $ne: 'CANCELADO' } });
    }

    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    agendamento.status = 'CANCELADO';
    agendamento.motivoCancelamento = motivo || 'Cancelado pelo administrador';
    await agendamento.save();

    return res.status(200).json({ message: 'Horário desmarcado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cancelar:', err);
    return res.status(500).json({ error: 'Erro interno ao cancelar agendamento' });
  }
}

// Aceita o cancelamento via POST em /cancelar ou DELETE em /agendamentos/:id
app.post('/cancelar', processarCancelamento);
app.delete('/agendamentos/:id', processarCancelamento);
app.delete('/agendamentos', processarCancelamento);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});