const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const MONGO_URI = 'mongodb+srv://admin:Rtk%2127082019@cluster0.czs3zas.mongodb.net/salao?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Conectado ao MongoDB Atlas com sucesso!');
    criarAdminPadrao();
  })
  .catch(err => console.error('❌ Erro de conexão no MongoDB:', err));

// --- SCHEMAS ---

// Modelo de Usuário (Para Login e Cadastro pelo Admin)
const UsuarioSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  nome: { type: String, required: true }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);

// Criar admin padrão se não existir nenhum usuário
async function criarAdminPadrao() {
  try {
    const existe = await Usuario.findOne({ usuario: 'admin' });
    if (!existe) {
      await Usuario.create({
        usuario: 'admin',
        senha: '123', // Altere a senha padrão após o primeiro acesso
        nome: 'Administrador'
      });
      console.log('🔑 Usuário admin padrão criado (usuario: admin / senha: 123)');
    }
  } catch (err) {
    console.error('Erro ao criar admin padrão:', err);
  }
}

// Modelo de Agendamento
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

// --- ROTAS DE AUTENTICAÇÃO E USUÁRIOS ---

// Login
app.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const user = await Usuario.findOne({ usuario, senha });

    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    res.json({ message: 'Login bem-sucedido!', nome: user.nome, usuario: user.usuario });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao autenticar.' });
  }
});

// Cadastrar novo usuário (Apenas acionado via painel interno)
app.post('/usuarios', async (req, res) => {
  try {
    const { nome, usuario, senha } = req.body;

    if (!nome || !usuario || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const jaExiste = await Usuario.findOne({ usuario });
    if (jaExiste) {
      return res.status(400).json({ error: 'Nome de usuário já cadastrado.' });
    }

    const novoUser = new Usuario({ nome, usuario, senha });
    await novoUser.save();

    res.status(201).json({ message: 'Novo usuário cadastrado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
  }
});

// --- ROTAS DE AGENDAMENTO ---

app.get('/agendamentos/ocupados', async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.status(400).json({ error: 'Data é obrigatória' });

    const inicioDia = new Date(`${data}T00:00:00.000Z`);
    const fimDia = new Date(`${data}T23:59:59.999Z`);

    const agendamentos = await Agendamento.find({
      inicio: { $gte: inicioDia, $lte: fimDia }
    }).sort({ inicio: 1 });

    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno ao buscar agendamentos' });
  }
});

app.post('/agendar', async (req, res) => {
  try {
    const { cliente, telefone, servico, observacao, dataHora } = req.body;
    if (!cliente || !servico || !dataHora) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

    const dataAgendamento = new Date(dataHora);
    const ocupado = await Agendamento.findOne({ inicio: dataAgendamento, status: { $ne: 'CANCELADO' } });
    if (ocupado) return res.status(400).json({ error: 'Horário já reservado ou bloqueado' });

    const novoAgendamento = new Agendamento({
      cliente,
      telefoneCliente: telefone || '',
      servico,
      observacao: observacao || '',
      inicio: dataAgendamento,
      status: 'ATIVO'
    });

    await novoAgendamento.save();
    res.status(201).json({ message: 'Agendamento criado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno ao salvar agendamento' });
  }
});

app.post('/bloquear', async (req, res) => {
  try {
    const { dataHora, motivo } = req.body;
    if (!dataHora) return res.status(400).json({ error: 'Data e hora são obrigatórias' });

    const dataBloqueio = new Date(dataHora);
    const ocupado = await Agendamento.findOne({ inicio: dataBloqueio, status: { $ne: 'CANCELADO' } });
    if (ocupado) return res.status(400).json({ error: 'Horário já possui agendamento ou bloqueio' });

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
    res.status(500).json({ error: 'Erro ao criar bloqueio' });
  }
});

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

    if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado' });

    agendamento.status = 'CANCELADO';
    agendamento.motivoCancelamento = motivo || 'Cancelado pelo administrador';
    await agendamento.save();

    return res.status(200).json({ message: 'Horário desmarcado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao cancelar agendamento' });
  }
}

app.post('/cancelar', processarCancelamento);
app.delete('/agendamentos/:id', processarCancelamento);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));