const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');
const Usuario = require('./models/Usuario');
const { Types } = mongoose;

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Conexão com MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));


// Cadastro de novo usuário
app.post('/usuarios', async (req, res) => {
  const { nome, senha, chavePix } = req.body;

  const existente = await Usuario.findOne({ nome });
  if (existente) return res.status(400).json({ erro: 'Usuário já existe' });

  const pixExistente = await Usuario.findOne({ chavePix });
  if (pixExistente) return res.status(400).json({ erro: 'Chave Pix já cadastrada' });

  const senhaCriptografada = await bcrypt.hash(senha, 10);
  const novo = new Usuario({
    nome,
    senha: senhaCriptografada,
    chavePix,
    saldo: 0
  });

  await novo.save();

  res.json({ mensagem: 'Usuário criado com sucesso' });
});

// Login
app.post('/login', async (req, res) => {
  const { nome, senha } = req.body;
  const usuario = await Usuario.findOne({ nome });
  if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado' });

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) return res.status(401).json({ erro: 'Senha incorreta' });

  res.json({
    mensagem: 'Login bem-sucedido',
    id: usuario._id,
    nome: usuario.nome
  });
});

// ➕ Adicionar saldo via chavePix
app.post('/pix/adicionar', async (req, res) => {
  const { chavePix, valor } = req.body;

  if (!chavePix || typeof valor !== 'number' || valor <= 0) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  try {
    const usuario = await Usuario.findOne({ chavePix });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

    usuario.saldo += valor;
    await usuario.save();

    res.json({ mensagem: 'Saldo adicionado com sucesso', saldo: usuario.saldo });
  } catch (error) {
    console.error('Erro ao adicionar saldo:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ➖ Remover saldo via chavePix
app.post('/pix/remover', async (req, res) => {
  const { chavePix, valor } = req.body;

  if (!chavePix || typeof valor !== 'number' || valor <= 0) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  try {
    const usuario = await Usuario.findOne({ chavePix });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

    if (usuario.saldo < valor) {
      return res.status(400).json({ erro: 'Saldo insuficiente' });
    }

    usuario.saldo -= valor;
    await usuario.save();

    res.json({ mensagem: 'Saldo removido com sucesso', saldo: usuario.saldo });
  } catch (error) {
    console.error('Erro ao remover saldo:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar saldo do usuário
app.get('/usuarios/saldo/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findById(id, 'saldo');

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json({ saldo: usuario.saldo });
  } catch (error) {
    console.error('Erro ao buscar saldo:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Deletar usuário
app.delete('/usuarios/del/:id', async (req, res) => {
  const { id } = req.params;
  const senha = req.query.senha;

  if (!senha || senha !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ erro: 'Acesso negado: senha inválida' });
  }

  try {
    const resultado = await Usuario.deleteOne({ _id: id });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json({ mensagem: `Usuário com ID "${id}" removido com sucesso` });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
