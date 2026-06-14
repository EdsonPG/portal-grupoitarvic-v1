const express = require('express');
const router = express.Router();
const Tarifario = require('../models/Tarifario');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

function requireAdmin(req, res) {
  if (!isAdmin(req)) {
    res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
    return false;
  }
  return true;
}

// GET todos los tarifarios
router.get('/', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const tarifarios = await Tarifario.find();
    res.json({ success: true, data: tarifarios });
  } catch (error) {
    console.error('❌ Error obteniendo tarifarios:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET tarifarios por assignmentId
router.get('/assignment/:assignmentId', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const tarifarios = await Tarifario.find({ assignmentId: req.params.assignmentId });
    res.json({ success: true, data: tarifarios });
  } catch (error) {
    console.error('❌ Error obteniendo tarifarios por asignación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET tarifario por ID
router.get('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const tarifario = await Tarifario.findOne({ tarifarioId: req.params.id });
    if (!tarifario) {
      return res.status(404).json({ success: false, message: 'Tarifario no encontrado' });
    }
    res.json({ success: true, data: tarifario });
  } catch (error) {
    console.error('❌ Error obteniendo tarifario:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST crear tarifario
router.post('/', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const tarifarioData = req.body;
    
    console.log('📥 Datos recibidos para crear tarifario:', tarifarioData);
    
    if (!tarifarioData.tarifarioId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El campo tarifarioId es requerido' 
      });
    }

    const existingTarifario = await Tarifario.findOne({ 
      tarifarioId: tarifarioData.tarifarioId 
    });
    
    if (existingTarifario) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya existe un tarifario con ese ID' 
      });
    }

    // ✅ Calcular margen y margenPorcentaje automáticamente
    const costoConsultor = tarifarioData.costoConsultor || 0;
    const costoCliente = tarifarioData.costoCliente || 0;
    
    tarifarioData.margen = costoCliente - costoConsultor;
    tarifarioData.margenPorcentaje = costoCliente > 0 
      ? ((tarifarioData.margen / costoCliente) * 100).toFixed(2)
      : 0;

    const tarifario = new Tarifario(tarifarioData);
    await tarifario.save();

    console.log('✅ Tarifario creado:', tarifario.tarifarioId);

    res.status(201).json({ 
      success: true, 
      message: 'Tarifario creado exitosamente',
      data: tarifario 
    });
  } catch (error) {
    console.error('❌ Error creando tarifario:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error al crear tarifario' 
    });
  }
});

// PUT actualizar tarifario
router.put('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const updates = req.body;
    updates.updatedAt = new Date();
    
    // ✅ Recalcular margen y porcentaje si se actualizan costos
    if (updates.costoConsultor !== undefined || updates.costoCliente !== undefined) {
      const tarifarioActual = await Tarifario.findOne({ tarifarioId: req.params.id });
      
      const costoConsultor = updates.costoConsultor !== undefined 
        ? updates.costoConsultor 
        : tarifarioActual.costoConsultor;
      
      const costoCliente = updates.costoCliente !== undefined 
        ? updates.costoCliente 
        : tarifarioActual.costoCliente;
      
      updates.margen = costoCliente - costoConsultor;
      updates.margenPorcentaje = costoCliente > 0 
        ? ((updates.margen / costoCliente) * 100).toFixed(2)
        : 0;
    }
    
    console.log('📝 Actualizando tarifario:', req.params.id, updates);
    
    const tarifario = await Tarifario.findOneAndUpdate(
      { tarifarioId: req.params.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!tarifario) {
      return res.status(404).json({ success: false, message: 'Tarifario no encontrado' });
    }

    console.log('✅ Tarifario actualizado');

    res.json({ 
      success: true, 
      message: 'Tarifario actualizado exitosamente',
      data: tarifario 
    });
  } catch (error) {
    console.error('❌ Error actualizando tarifario:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error al actualizar tarifario' 
    });
  }
});

// DELETE eliminar tarifario
router.delete('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    console.log('🗑️ Eliminando tarifario:', req.params.id);
    
    const tarifario = await Tarifario.findOneAndDelete({ 
      tarifarioId: req.params.id 
    });
    
    if (!tarifario) {
      return res.status(404).json({ success: false, message: 'Tarifario no encontrado' });
    }
    
    console.log('✅ Tarifario eliminado');
    
    res.json({ 
      success: true, 
      message: 'Tarifario eliminado exitosamente' 
    });
  } catch (error) {
    console.error('❌ Error eliminando tarifario:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al eliminar tarifario' 
    });
  }
});

module.exports = router;
