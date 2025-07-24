const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  saldo: { type: Number, default: 0 },
  chavePix: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Usuario', UsuarioSchema);
