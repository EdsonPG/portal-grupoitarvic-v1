const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');

const Tarifario = require('../models/Tarifario');
const Company = require('../models/Company');
const Support = require('../models/Support');
const Module = require('../models/Module');
const User = require('../models/User');

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

function scopeQuery(req, query = {}) {
  return isAdmin(req) ? query : { ...query, userId: req.user.userId };
}

// GET todas las asignaciones
router.get('/', async (req, res) => {
  try {
    const query = Assignment.find(scopeQuery(req));
    if (!isAdmin(req)) {
      query.select('-tarifaConsultor -tarifaCliente');
    }
    const assignments = await query;
    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Error obteniendo asignaciones:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET asignación por ID
router.get('/:id', async (req, res) => {
  try {
    const query = Assignment.findOne(scopeQuery(req, { assignmentId: req.params.id }));
    if (!isAdmin(req)) {
      query.select('-tarifaConsultor -tarifaCliente');
    }
    const assignment = await query;
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }
    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error obteniendo asignación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST crear asignación de soporte
router.post('/', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    console.log('Creando asignación de soporte:', req.body);
    
    // Crear asignación
    const assignment = new Assignment(req.body);
    await assignment.save();
    
    console.log('Asignación creada:', assignment.assignmentId);
    
    // Obtener datos relacionados para tarifario
    const [user, company, support, module] = await Promise.all([
      User.findOne({ userId: assignment.userId }),
      Company.findOne({ companyId: assignment.companyId }),
      Support.findOne({ supportId: assignment.supportId }),
      Module.findOne({ moduleId: assignment.moduleId })
    ]);
    
    // Crear entrada en tarifario automáticamente
    const margen = (assignment.tarifaCliente || 0) - (assignment.tarifaConsultor || 0);
    const margenPorcentaje = assignment.tarifaCliente > 0 
      ? ((margen / assignment.tarifaCliente) * 100).toFixed(2)
      : 0;
    
    const tarifario = new Tarifario({
      tarifarioId: `tarifa_${assignment.assignmentId}`,
      assignmentId: assignment.assignmentId,
      consultorId: assignment.userId,
      consultorNombre: user ? user.name : 'Desconocido',
      companyId: assignment.companyId,
      companyName: company ? company.name : 'Desconocido',
      supportId: assignment.supportId,
      supportName: support ? support.name : 'Desconocido',
      projectId: null,
      projectName: null,
      moduleId: assignment.moduleId,
      moduleName: module ? module.name : 'Desconocido',
      costoConsultor: assignment.tarifaConsultor || 0,
      costoCliente: assignment.tarifaCliente || 0,
      margen: margen,
      margenPorcentaje: parseFloat(margenPorcentaje),
      tipo: 'support',
      descripcionTarea: null,
      isActive: true
    });
    
    await tarifario.save();
    console.log('Tarifario creado:', tarifario.tarifarioId);
    
    res.status(201).json({ 
      success: true, 
      message: 'Asignación y tarifario creados exitosamente',
      data: assignment 
    });
  } catch (error) {
    console.error('Error creando asignación:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// PUT actualizar asignación
router.put('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const updates = req.body;
    
    console.log('Actualizando asignación:', req.params.id, updates);
    
    const assignment = await Assignment.findOneAndUpdate(
      { assignmentId: req.params.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }

    console.log('Asignación actualizada');

    res.json({ 
      success: true, 
      message: 'Asignación actualizada exitosamente',
      data: assignment 
    });
  } catch (error) {
    console.error('Error actualizando asignación:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error al actualizar asignación' 
    });
  }
});

// DELETE eliminar asignación
router.delete('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    console.log('Eliminando asignación:', req.params.id);
    
    const assignment = await Assignment.findOneAndDelete({ assignmentId: req.params.id });
    
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }
    
    const tarifarioDeleted = await Tarifario.deleteOne({ assignmentId: req.params.id });

    console.log('Resultado de eliminar la entrada del tarifario en asignación de soporte', tarifarioDeleted)
    console.log('Asignación eliminada');
    
    res.json({ 
      success: true, 
      message: 'Asignación eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error eliminando asignación:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al eliminar asignación' 
    });
  }
});

module.exports = router;
