const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['admin', 'consultor', 'cliente'], 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isActivated: {
    type: Boolean,
    default: true
  },
  activationToken: {
    type: String,
    default: null
  },
  activationExpires: {
    type: Date,
    default: null
  },
  profilePhoto: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  address: {
    type: String,
    default: null
  },
  calle: { type: String, default: null },
  numExterior: { type: String, default: null },
  numInterior: { type: String, default: null },
  codigoPostal: { type: String, default: null },
  colonia: { type: String, default: null },
  municipio: { type: String, default: null },
  ciudad: { type: String, default: null },
  estado: { type: String, default: null },
  pais: { type: String, default: 'México' },
  rfc: {
    type: String,
    default: null
  },
  razonSocial: {
    type: String,
    default: null
  },
  regimenFiscal: {
    type: String,
    default: null
  },
  codigoPostalFiscal: {
    type: String,
    default: null
  },
  calleFiscal: { type: String, default: null },
  numExtFiscal: { type: String, default: null },
  numIntFiscal: { type: String, default: null },
  coloniaFiscal: { type: String, default: null },
  municipioFiscal: { type: String, default: null },
  estadoFiscal: { type: String, default: null },
  clabe: {
    type: String,
    default: null
  },
  bankName: {
    type: String,
    default: null
  },
  companyId: {
    type: String,
    default: null
  },
  companyName: {
    type: String,
    default: null
  },
  chatStatus: {
    type: String,
    enum: ['online', 'away', 'offline'],
    default: 'offline'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
});

// Hash password antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Salvaguarda: si ya es un hash de bcrypt, no volver a encriptar
  if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 
