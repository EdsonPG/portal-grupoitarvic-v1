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

// GET todos los usuarios
router.get('/', async (req, res) => {
  try {
    const users = isAdmin(req)
      ? await User.find().select('-password')
      : await User.find({ isActive: true }).select('userId name role isActive profilePhoto chatStatus');

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

// ✅ GET individual SIN password de nuevo (más seguro)
router.get('/:id', async (req, res) => {
  try {
    const canViewFullUser = isAdmin(req) || req.user.userId === req.params.id;
    const user = await User.findOne({ userId: req.params.id })
      .select(canViewFullUser ? '-password' : 'userId name role isActive profilePhoto chatStatus');
    
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

// POST crear usuario
router.post('/', async (req, res) => {
  // Solo admin puede crear usuarios
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const userData = req.body;
    
    console.log('📥 Datos recibidos para crear usuario:', redactUserPayload(userData));
    
    // Validar campos requeridos
    if (!userData.userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El campo userId es requerido' 
      });
    }

    if (!userData.password) {
      return res.status(400).json({ 
        success: false, 
        message: 'El campo password es requerido' 
      });
    }

    const passwordError = validatePasswordLength(userData.password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError
      });
    }

    // Verificar que no exista el usuario
    const existingUser = await User.findOne({ 
      $or: [
        { userId: userData.userId },
        { email: userData.email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'El usuario o email ya existe' 
      });
    }

    // Crear usuario
    const user = new User(userData);
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    console.log('✅ Usuario creado:', userResponse);

    res.status(201).json({ 
      success: true, 
      message: 'Usuario creado exitosamente',
      data: userResponse 
    });
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error al crear usuario' 
    });
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
