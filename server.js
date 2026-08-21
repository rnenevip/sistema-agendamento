const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o MongoDB Atlas
const MONGO_URI = 'mongodb+srv://admin:Rtk!27082019@cluster0.czs3zas.mongodb.net/salao?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Esquema/Modelo do Agendamento
const AgendamentoSchema = new mongoose.Schema({
  cliente: { type: String, required: true },
  telefoneCliente: { type: String, required: true },
  servico: { type: String, required: true },
  observacao: { type: String, default: '' },
  inicio: { type: Date, required: true }
});

const Agendamento = mongoose.model('Agendamento', AgendamentoSchema);

// Rota para buscar agendamentos ocupados de uma data específica
app.get('/agendamentos/ocupados', async (req, res) => {
  try {
    const { data } = req.query; // Espera formato YYYY-MM-DD
    if (!data) return res.status(400).json({ error: 'Data é obrigatória' });

    // Define início e fim do dia em UTC
    const inicioDia = new Date(`${data}T00:00:00.000Z`);
    const fimDia = new Date(`${data}T23:59:59.999Z`);

    const agendamentos = await Agendamento.find({
      inicio: { $gte: inicioDia, $lte: fimDia }
    }).sort({ inicio: 1 });

    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// Rota para criar novo agendamento ou bloqueio
app.post('/agendar', async (req, res) => {
  try {
    const { cliente, telefone, servico, observacao, dataHora } = req.body;

    if (!cliente || !telefone || !servico || !dataHora) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const dataAgendamento = new Date(dataHora);

    // Verifica se o horário já está ocupado
    const ocupado = await Agendamento.findOne({ inicio: dataAgendamento });
    if (ocupado) {
      return res.status(400).json({ error: 'Horário já reservado ou bloqueado' });
    }

    const novoAgendamento = new Agendamento({
      cliente,
      telefoneCliente: telefone,
      servico,
      observacao: observacao || '',
      inicio: dataAgendamento
    });

    await novoAgendamento.save();
    res.status(201).json({ message: 'Agendamento criado com sucesso!', agendamento: novoAgendamento });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar agendamento' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});