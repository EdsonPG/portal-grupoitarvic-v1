const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetEmail, sendAccountActivationEmail } = require('../utils/mailer');
const parsedMinPasswordLength = Number.parseInt(process.env.MIN_PASSWORD_LENGTH || '10', 10);
const MIN_PASSWORD_LENGTH = Number.isFinite(parsedMinPasswordLength) ? parsedMinPasswordLength : 10;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBaseUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const referer = req.headers['referer'];
  const origin = req.headers['origin'];

  if (origin && !origin.includes('undefined') && !origin.includes('null')) {
    return origin.replace(/\/$/, '');
  }

  if (referer) {
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`;
    } catch (e) {}
  }

  if (host) {
    const proto = (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : protocol;
    return `${proto}://${host}`;
  }

  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================
// LOGIN Y AUTENTICACIÓN
// ============================================

// POST /api/auth/login
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

    const loginIdentifier = String(userId).trim();

    // Buscar usuario por userId o email
    const user = await User.findOne({ 
      $or: [
        { userId: { $regex: new RegExp('^' + escapeRegExp(loginIdentifier) + '$', 'i') } },
        { email: loginIdentifier.toLowerCase() }
      ]
    });

    console.log('Usuario encontrado:', user ? 'SÍ' : 'NO');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tu cuenta se encuentra inactiva. Contacta al administrador.' 
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos' 
      });
    }

    const jwtSecret = process.env.JWT_SECRET || '7e87715a68d0b18fd296808a354a372c3eb03378e63f9a0b82eab69f493b4f767a7e7a7338c3e0f4a180b2cf44fe78e211769d22f824cec2286a2278621f2316';
    const token = jwt.sign(
      { 
        userId: user.userId,
        email: user.email,
        role: user.role,
        companyId: user.companyId || null,
        companyName: user.companyName || null
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId || null,
        companyName: user.companyName || null
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

// GET /api/auth/validate
router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token no proporcionado' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || '7e87715a68d0b18fd296808a354a372c3eb03378e63f9a0b82eab69f493b4f767a7e7a7338c3e0f4a180b2cf44fe78e211769d22f824cec2286a2278621f2316');
    
    const user = await User.findOne({ userId: decoded.userId }).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId || null,
        companyName: user.companyName || null
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

    const normalizedEmail = String(email).trim().toLowerCase();
    console.log('📧 Solicitud de recuperación para:', normalizedEmail);

    // Buscar usuario por email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.log('⚠️ Email no encontrado:', normalizedEmail);
      return res.status(404).json({
        success: false,
        message: 'El correo electrónico no se encuentra registrado en el sistema.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'La cuenta asociada a este correo se encuentra inactiva. Contacte al administrador.'
      });
    }

    // Generar token de reset (64 bytes hex = 128 chars)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Guardar token y expiración (1 hora)
    user.resetPasswordToken = hashResetToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save();

    const baseUrl = getBaseUrl(req);
    const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;

    console.log('🔗 Reset URL generada para recuperación de contraseña');

    // Enviar email
    await sendPasswordResetEmail(user.email, resetUrl, user.name);

    console.log('✅ Email de recuperación enviado a:', user.email);

    res.json({
      success: true,
      message: 'Se ha enviado un enlace a tu correo electrónico para restablecer tu contraseña.'
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

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`
      });
    }

    console.log('🔐 Intento de reset de contraseña');

    const hashedToken = hashResetToken(token);

    const user = await User.findOne({
      resetPasswordToken: { $in: [hashedToken, token] },
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

// ============================================
// ACTIVACIÓN DE CUENTA / ONBOARDING
// ============================================

// GET /api/auth/verify-activation-token/:token
router.get('/verify-activation-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token no proporcionado' });
    }

    const hashedToken = hashResetToken(token);
    const user = await User.findOne({
      activationToken: { $in: [hashedToken, token] },
      activationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'El enlace de activación es inválido o ha expirado. Solicite uno nuevo a Administración.'
      });
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error al verificar token de activación:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al verificar token' });
  }
});

// POST /api/auth/activate-account — Fijar contraseña y activar usuario
router.post('/activate-account', async (req, res) => {
  try {
    const { token, password, name, phone } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token y contraseña son requeridos'
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`
      });
    }

    const hashedToken = hashResetToken(token);
    const user = await User.findOne({
      activationToken: { $in: [hashedToken, token] },
      activationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'El enlace de activación es inválido o ha expirado. Solicite un nuevo enlace.'
      });
    }

    // Activar usuario
    user.password = password;
    user.isActivated = true;
    user.isActive = true;
    user.activationToken = null;
    user.activationExpires = null;
    if (name && name.trim()) user.name = name.trim();
    if (phone && phone.trim()) user.phone = phone.trim();
    user.updatedAt = new Date();

    await user.save();

    console.log(`✅ Cuenta activada exitosamente para ${user.email} (${user.role})`);

    // Generar JWT para login directo
    const jwtSecret = process.env.JWT_SECRET || '7e87715a68d0b18fd296808a354a372c3eb03378e63f9a0b82eab69f493b4f767a7e7a7338c3e0f4a180b2cf44fe78e211769d22f824cec2286a2278621f2316';
    const jwtToken = jwt.sign(
      { 
        userId: user.userId,
        email: user.email,
        role: user.role,
        companyId: user.companyId || null,
        companyName: user.companyName || null
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: '¡Cuenta activada exitosamente! Bienvenido(a) a Portal ARVIC.',
      token: jwtToken,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId || null,
        companyName: user.companyName || null,
        profilePhoto: user.profilePhoto || null
      }
    });


  } catch (error) {
    console.error('❌ Error al activar cuenta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al activar la cuenta. Intente nuevamente.'
    });
  }
});

module.exports = router;

