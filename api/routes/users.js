const express = require('express');
const router = express.Router();
const User = require('../models/User');
const parsedMinPasswordLength = Number.parseInt(process.env.MIN_PASSWORD_LENGTH || '10', 10);
const MIN_PASSWORD_LENGTH = Number.isFinite(parsedMinPasswordLength) ? parsedMinPasswordLength : 10;

function isAdmin(req) {
  return req.user?.role === 'admin';
}

function redactUserPayload(payload = {}) {
  const safePayload = { ...payload };
  if (safePayload.password) {
    safePayload.password = '[REDACTED]';
  }
  if (safePayload.currentPassword) {
    safePayload.currentPassword = '[REDACTED]';
  }
  if (safePayload.newPassword) {
    safePayload.newPassword = '[REDACTED]';
  }
  if (safePayload.profilePhoto) {
    safePayload.profilePhoto = `[BASE64:${String(safePayload.profilePhoto).length} chars]`;
  }
  return safePayload;
}

function validatePasswordLength(password) {
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}

const crypto = require('crypto');
const { sendAccountActivationEmail } = require('../utils/mailer');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
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

// GET todos los usuarios
router.get('/', async (req, res) => {
  try {
    const users = isAdmin(req)
      ? await User.find().select('-password')
      : await User.find({ isActive: true }).select('userId name role isActive isActivated profilePhoto chatStatus companyId companyName');

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET usuarios por rol
router.get('/role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const query = { role };
    if (!isAdmin(req)) {
      query.isActive = true;
    }
    const users = await User.find(query).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint deshabilitado: nunca se deben exponer hashes o contraseñas al cliente.
router.get('/passwords', async (req, res) => {
  res.status(410).json({
    success: false,
    message: 'Endpoint deshabilitado por seguridad'
  });
});

// GET individual SIN password
router.get('/:id', async (req, res) => {
  try {
    const canViewFullUser = isAdmin(req) || req.user.userId === req.params.id;
    const user = await User.findOne({ userId: req.params.id })
      .select(canViewFullUser ? '-password' : 'userId name role isActive isActivated profilePhoto chatStatus companyId companyName');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (!canViewFullUser && user.isActive === false) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST crear usuario (Admin)
router.post('/', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const userData = { ...req.body };
    console.log('📥 Datos recibidos para crear usuario:', redactUserPayload(userData));
    
    // Normalizar email
    if (!userData.email) {
      return res.status(400).json({ success: false, message: 'El correo electrónico es requerido' });
    }
    userData.email = userData.email.trim().toLowerCase();

    // Auto-generar userId con formato estándar del portal: USR + 4 dígitos (ej. USR7079)
    if (!userData.userId || !userData.userId.startsWith('USR')) {
      let uniqueUserId;
      let exists = true;
      while (exists) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        uniqueUserId = `USR${randomNum}`;
        const found = await User.findOne({ userId: uniqueUserId });
        if (!found) exists = false;
      }
      userData.userId = uniqueUserId;
    }

    // Verificar que no exista el usuario por userId o email
    const existingUser = await User.findOne({ 
      $or: [
        { userId: userData.userId },
        { email: userData.email }
      ]
    });

    if (existingUser) {
      // Si es un cliente y se está creando o reasignando para una empresa
      if (existingUser.role === 'cliente' || userData.role === 'cliente') {
        console.log(`🔄 Reasignando/actualizando usuario cliente existente (${existingUser.email}) a empresa ${userData.companyId}`);
        existingUser.role = 'cliente';
        existingUser.companyId = userData.companyId || existingUser.companyId;
        existingUser.companyName = userData.companyName || existingUser.companyName;
        if (userData.name) existingUser.name = userData.name;
        if (userData.phone) existingUser.phone = userData.phone;

        let activationToken = null;
        if (!userData.password || userData.sendActivationEmail) {
          const rawToken = crypto.randomBytes(32).toString('hex');
          activationToken = rawToken;
          existingUser.activationToken = hashToken(rawToken);
          existingUser.activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          existingUser.isActivated = false;
        } else {
          existingUser.password = userData.password;
          existingUser.isActivated = true;
        }
        existingUser.isActive = true;
        existingUser.updatedAt = new Date();
        await existingUser.save();

        if (activationToken) {
          const baseUrl = getBaseUrl(req);
          const activationUrl = `${baseUrl}/activate-account.html?token=${activationToken}`;
          try {
            await sendAccountActivationEmail(existingUser.email, activationUrl, existingUser.name, existingUser.role);
            console.log(`📧 Correo de activación reenviado a ${existingUser.email} con URL: ${activationUrl}`);
          } catch (mailErr) {
            console.error('⚠️ Error enviando correo de activación:', mailErr.message);
          }
        }

        const userResponse = existingUser.toObject();
        delete userResponse.password;
        delete userResponse.activationToken;

        return res.status(200).json({
          success: true,
          message: 'Usuario cliente actualizado y enlace de activación enviado exitosamente.',
          data: userResponse,
          user: userResponse
        });
      }

      return res.status(400).json({ 
        success: false, 
        message: existingUser.email === userData.email 
          ? 'El correo electrónico ya se encuentra registrado' 
          : 'El identificador de usuario ya existe' 
      });
    }


    let activationToken = null;
    let sendActivation = false;

    // Si no se proporcionó contraseña, o si se solicita invitación por correo
    if (!userData.password || userData.sendActivationEmail) {
      sendActivation = true;
      const rawToken = crypto.randomBytes(32).toString('hex');
      activationToken = rawToken;
      userData.activationToken = hashToken(rawToken);
      userData.activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días de vigencia
      userData.isActivated = false;
      userData.isActive = true;
      // Contraseña temporal aleatoria fuerte
      userData.password = crypto.randomBytes(16).toString('hex') + 'A1!';
    } else {
      const passwordError = validatePasswordLength(userData.password);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }
      userData.isActivated = true;
      userData.isActive = userData.isActive !== undefined ? userData.isActive : true;
    }

    const user = new User(userData);
    await user.save();

    // Enviar correo de activación si corresponde
    if (sendActivation && activationToken) {
      const baseUrl = getBaseUrl(req);
      const activationUrl = `${baseUrl}/activate-account.html?token=${activationToken}`;

      try {
        await sendAccountActivationEmail(user.email, activationUrl, user.name, user.role);
        console.log(`📧 Correo de activación enviado a ${user.email} con URL: ${activationUrl}`);
      } catch (mailErr) {
        console.error('⚠️ Error enviando correo de activación:', mailErr.message);
      }
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.activationToken;

    res.status(201).json({ 
      success: true, 
      message: sendActivation 
        ? 'Usuario creado exitosamente. Se ha enviado un correo con el enlace de activación.' 
        : 'Usuario creado exitosamente.',
      data: userResponse,
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error al crear usuario' 
    });
  }
});

// POST reenviar activación
router.post('/:id/resend-activation', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.activationToken = hashToken(rawToken);
    user.activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.isActivated = false;
    await user.save();

    const baseUrl = getBaseUrl(req);
    const activationUrl = `${baseUrl}/activate-account.html?token=${rawToken}`;

    await sendAccountActivationEmail(user.email, activationUrl, user.name, user.role);
    console.log(`📧 Enlace de activación reenviado a ${user.email} con URL: ${activationUrl}`);

    res.json({
      success: true,
      message: `Enlace de activación reenviado exitosamente a ${user.email}`
    });
  } catch (error) {
    console.error('Error al reenviar activación:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al reenviar correo de activación' });
  }
});

// PUT actualizar datos de cuenta (Mi Cuenta / Perfil / Datos Fiscales / Bancarios)
router.put('/:id/account-info', async (req, res) => {
  const isSelf = req.user?.userId === req.params.id;
  if (!isAdmin(req) && !isSelf) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: No tienes permisos para modificar este perfil' });
  }

  try {
    const {
      name,
      phone,
      address,
      calle,
      numExterior,
      numInterior,
      codigoPostal,
      colonia,
      municipio,
      ciudad,
      estado,
      pais,
      rfc,
      razonSocial,
      regimenFiscal,
      codigoPostalFiscal,
      calleFiscal,
      numExtFiscal,
      numIntFiscal,
      coloniaFiscal,
      municipioFiscal,
      estadoFiscal,
      clabe,
      bankName,
      password
    } = req.body;

    const user = await User.findOne({ userId: req.params.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone ? phone.trim() : null;
    if (address !== undefined) user.address = address ? address.trim() : null;
    
    // Domicilio personal detallado
    if (calle !== undefined) user.calle = calle ? calle.trim() : null;
    if (numExterior !== undefined) user.numExterior = numExterior ? numExterior.trim() : null;
    if (numInterior !== undefined) user.numInterior = numInterior ? numInterior.trim() : null;
    if (codigoPostal !== undefined) user.codigoPostal = codigoPostal ? codigoPostal.trim() : null;
    if (colonia !== undefined) user.colonia = colonia ? colonia.trim() : null;
    if (municipio !== undefined) user.municipio = municipio ? municipio.trim() : null;
    if (ciudad !== undefined) user.ciudad = ciudad ? ciudad.trim() : null;
    if (estado !== undefined) user.estado = estado ? estado.trim() : null;
    if (pais !== undefined) user.pais = pais ? pais.trim() : 'México';

    // Datos fiscales SAT detallados
    if (rfc !== undefined) user.rfc = rfc ? rfc.trim().toUpperCase() : null;
    if (razonSocial !== undefined) user.razonSocial = razonSocial ? razonSocial.trim() : null;
    if (regimenFiscal !== undefined) user.regimenFiscal = regimenFiscal ? regimenFiscal.trim() : null;
    if (codigoPostalFiscal !== undefined) user.codigoPostalFiscal = codigoPostalFiscal ? codigoPostalFiscal.trim() : null;
    if (calleFiscal !== undefined) user.calleFiscal = calleFiscal ? calleFiscal.trim() : null;
    if (numExtFiscal !== undefined) user.numExtFiscal = numExtFiscal ? numExtFiscal.trim() : null;
    if (numIntFiscal !== undefined) user.numIntFiscal = numIntFiscal ? numIntFiscal.trim() : null;
    if (coloniaFiscal !== undefined) user.coloniaFiscal = coloniaFiscal ? coloniaFiscal.trim() : null;
    if (municipioFiscal !== undefined) user.municipioFiscal = municipioFiscal ? municipioFiscal.trim() : null;
    if (estadoFiscal !== undefined) user.estadoFiscal = estadoFiscal ? estadoFiscal.trim() : null;

    // Bancarios
    if (clabe !== undefined) user.clabe = clabe ? clabe.trim() : null;
    if (bankName !== undefined) user.bankName = bankName ? bankName.trim() : null;

    // Contraseña (si admin la modifica directamente o usuario la envía)
    if (password && password.trim()) {
      user.password = password.trim();
    }

    user.updatedAt = new Date();
    await user.save();

    const userResponse = user.toObject();
    if (!isAdmin(req)) {
      delete userResponse.password;
    }
    delete userResponse.activationToken;
    delete userResponse.resetPasswordToken;

    res.json({
      success: true,
      message: 'Datos de la cuenta actualizados correctamente',
      data: userResponse
    });
  } catch (error) {
    console.error('Error al actualizar datos de cuenta:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al guardar los datos' });
  }
});

// PUT actualizar usuario
router.put('/:id', async (req, res) => {
  // Solo admin puede modificar otros usuarios, los consultores solo pueden modificarse a sí mismos
  if (!isAdmin(req) && req.user.userId !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: No tienes permisos para modificar este usuario' });
  }

  // Si no es admin, no permitir escalar privilegios o cambiar estado activo
  if (!isAdmin(req)) {
    if (req.body.password) {
      return res.status(400).json({
        success: false,
        message: 'Usa el flujo de cambio de contraseña para actualizar tu contraseña'
      });
    }
    delete req.body.role;
    delete req.body.isActive;
    delete req.body.password;
  }

  try {
    const updates = req.body;
    
    if (updates.password !== undefined && String(updates.password).trim() === '') {
      delete updates.password;
    }
    
    console.log('📝 Actualizando usuario:', req.params.id, redactUserPayload(updates));
    
    const mongoose = require('mongoose');
    const query = { 
      $or: [
        { userId: req.params.id }, 
        ...(mongoose.isValidObjectId(req.params.id) ? [{ _id: req.params.id }] : [])
      ]
    };

    // Si se actualiza la contraseña, necesita re-hash
    if (updates.password) {
      const passwordError = validatePasswordLength(updates.password);
      if (passwordError) {
        return res.status(400).json({
          success: false,
          message: passwordError
        });
      }

      const user = await User.findOne(query);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
      
      user.password = updates.password;
      
      // Actualizar otros campos si vienen
      if (updates.name) user.name = updates.name;
      if (updates.email) user.email = updates.email;
      if (updates.role) user.role = updates.role;
      if (updates.isActive !== undefined) user.isActive = updates.isActive;
      
      user.updatedAt = new Date();
      await user.save();
      
      const userResponse = user.toObject();
      delete userResponse.password;
      
      console.log('✅ Usuario actualizado con nueva contraseña');
      
      return res.json({ 
        success: true, 
        message: 'Usuario actualizado exitosamente',
        data: userResponse 
      });
    }

    // Actualización normal sin contraseña
    const user = await User.findOneAndUpdate(
      query,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario actualizado');

    res.json({ 
      success: true, 
      message: 'Usuario actualizado exitosamente',
      data: user 
    });
  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error al actualizar usuario' 
    });
  }
});

// DELETE eliminar usuario
router.delete('/:id', async (req, res) => {
  // Solo admin puede borrar usuarios
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    console.log('🗑️ Eliminando usuario:', req.params.id);
    
    const user = await User.findOneAndDelete({ userId: req.params.id });  // ✅ userId
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    console.log('✅ Usuario eliminado');
    
    res.json({ 
      success: true, 
      message: 'Usuario eliminado exitosamente' 
    });
  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al eliminar usuario' 
    });
  }
});

// PUT actualizar foto de perfil
router.put('/:id/profile-photo', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: No tienes permisos para modificar este usuario' });
  }

  try {
    const { profilePhoto } = req.body;
    
    if (!profilePhoto) {
      return res.status(400).json({ success: false, message: 'Se requiere la foto de perfil' });
    }

    // Validar tamaño (~2MB max en Base64)
    if (profilePhoto.length > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'La imagen es demasiado grande (máximo 2MB)' });
    }

    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      { profilePhoto, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    console.log('✅ Foto de perfil actualizada para:', req.params.id);
    res.json({ success: true, message: 'Foto actualizada', data: user });
  } catch (error) {
    console.error('❌ Error actualizando foto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE eliminar foto de perfil
router.delete('/:id/profile-photo', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: No tienes permisos para modificar este usuario' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      { profilePhoto: null, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    console.log('✅ Foto de perfil eliminada para:', req.params.id);
    res.json({ success: true, message: 'Foto eliminada', data: user });
  } catch (error) {
    console.error('❌ Error eliminando foto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT cambiar contraseña
router.put('/:id/change-password', async (req, res) => {
  if (!isAdmin(req) && req.user.userId !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: No tienes permisos para modificar este usuario' });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Se requieren ambas contraseñas' });
    }

    const passwordError = validatePasswordLength(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const mongoose = require('mongoose');
    const query = { 
      $or: [
        { userId: req.params.id }, 
        ...(mongoose.isValidObjectId(req.params.id) ? [{ _id: req.params.id }] : [])
      ]
    };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual con bcrypt
    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) {
      return res.status(401).json({ success: false, message: 'La contraseña actual es incorrecta' });
    }

    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();

    console.log('✅ Contraseña cambiada para:', req.params.id);
    res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
