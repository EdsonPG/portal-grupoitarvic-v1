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
    enum: ['admin', 'consultor'], 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  profilePhoto: {
    type: String,
    default: null
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

/*
 * NOTA: bcrypt deshabilitado intencionalmente
 * Razón: Este proyecto usa contraseñas simples (cons####.####)
 *        para tracking de consultores, no requiere seguridad máxima
 * 
 * Si en el futuro necesitas bcrypt:
 * 1. Descomentar pre-save hook y comparePassword
 * 2. Modificar auth.js línea 41
 * 3. Migrar contraseñas existentes a hash
 * 
 * Fecha: 2026-01-10
 */

/*
// Hash password antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
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
}; */

module.exports = mongoose.model('User', userSchema); 
