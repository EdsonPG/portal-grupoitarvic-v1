const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../utils/mailer');

// Login
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    console.log('Intento de login:', { userId });

    if (!userId || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuario y contraseña son requeridos' 
      });
    }

    // Buscar usuario por userId o email
    const user = await User.findOne({ 
      $or: [
        { userId: userId },      // Cambiado de 'id' a 'userId'
        { email: userId }
      ]
    });

    console.log('Usuario encontrado:', user ? 'SÍ' : 'NO');

    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos' 
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      console.log('Usuario inactivo');
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario inactivo' 
      });
    }

    // Verificar contraseña
    console.log('Verificando contraseña...');
    const isPasswordValid = password === user.password;
    
    console.log('Contraseña válida:', isPasswordValid ? 'SÍ' : 'NO');

    if (!isPasswordValid) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos' 
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.userId,    // Cambiado de 'id' a 'userId'
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login exitoso');

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        userId: user.userId,    // Cambiado de 'id' a 'userId'
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor' 
    });
  }
});

// Validar token
router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token no proporcionado' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario por userId
    const user = await User.findOne({ userId: decoded.userId }).select('-password');  // Cambiado

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,    // Cambiado
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido' 
    });
  }
});

// ============================================
// RECUPERACIÓN DE CONTRASEÑA
// ============================================

// POST /api/auth/forgot-password — Solicitar restablecimiento
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido'
      });
    }

    console.log('📧 Solicitud de recuperación para:', email);

    // Buscar usuario por email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Respuesta genérica para no revelar si el email existe
      console.log('⚠️ Email no encontrado:', email);
      return res.json({
        success: true,
        message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      });
    }

    if (!user.isActive) {
      return res.json({
        success: true,
        message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      });
    }

    // Generar token de reset (64 bytes hex = 128 chars)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Guardar token y expiración (1 hora)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save();

    // Construir URL de reset
    // Prioridad: APP_URL env > x-forwarded headers > req host
    let baseUrl;
    if (process.env.APP_URL) {
      baseUrl = process.env.APP_URL.replace(/\/$/, ''); // Quitar trailing slash
    } else {
      // Fallback: usar headers de Vercel para detectar el dominio correcto
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      baseUrl = `${protocol}://${host}`;
    }
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    console.log('🔗 Reset URL generada:', resetUrl);
    console.log('📌 APP_URL env:', process.env.APP_URL || '(no definida)');

    // Enviar email
    await sendPasswordResetEmail(user.email, resetUrl, user.name);

    console.log('✅ Email de recuperación enviado a:', user.email);

    res.json({
      success: true,
      message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
    });

  } catch (error) {
    console.error('❌ Error en forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud. Intente nuevamente.'
    });
  }
});

// POST /api/auth/reset-password — Restablecer contraseña con token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token y nueva contraseña son requeridos'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    console.log('🔐 Intento de reset con token:', token.substring(0, 8) + '...');

    // Buscar usuario con token válido y no expirado
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      console.log('⚠️ Token inválido o expirado');
      return res.status(400).json({
        success: false,
        message: 'El enlace de restablecimiento es inválido o ha expirado. Solicita uno nuevo.'
      });
    }

    // Actualizar contraseña
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.updatedAt = new Date();
    await user.save();

    console.log('✅ Contraseña restablecida para:', user.email, '(', user.role, ')');

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.'
    });

  } catch (error) {
    console.error('❌ Error en reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restablecer la contraseña. Intente nuevamente.'
    });
  }
});

module.exports = router;