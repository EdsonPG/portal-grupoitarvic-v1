const express = require('express');
const router = express.Router();
const ProjectAssignment = require('../models/ProjectAssignment');

const Tarifario = require('../models/Tarifario'); // ← Agregar al inicio del archivo
const Company = require('../models/Company');
const Project = require('../models/Project');
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
  return isAdmin(req) ? query : { ...query, consultorId: req.user.userId };
}

// GET todas las asignaciones de proyecto
router.get('/', async (req, res) => {
  try {
    const query = ProjectAssignment.find(scopeQuery(req));
    if (!isAdmin(req)) {
      query.select('-tarifaConsultor -tarifaCliente');
    }
    const projectAssignments = await query;
    res.json({ success: true, data: projectAssignments });
  } catch (error) {
    console.error('❌ Error obteniendo asignaciones de proyecto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET asignación de proyecto por ID
router.get('/:id', async (req, res) => {
  try {
    const query = ProjectAssignment.findOne(scopeQuery(req, { projectAssignmentId: req.params.id }));
    if (!isAdmin(req)) {
      query.select('-tarifaConsultor -tarifaCliente');
    }
    const projectAssignment = await query;
    if (!projectAssignment) {
      return res.status(404).json({ success: false, message: 'Asignación de proyecto no encontrada' });
    }
    res.json({ success: true, data: projectAssignment });
  } catch (error) {
    console.error('❌ Error obteniendo asignación de proyecto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST crear asignación de proyecto
router.post('/', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    console.log('📝 Creando asignación de proyecto:', req.body);
    
    // Crear asignación
    const projectAssignment = new ProjectAssignment(req.body);
    await projectAssignment.save();
    
    console.log('✅ Asignación de proyecto creada:', projectAssignment.projectAssignmentId);
    
    // ✅ NUEVO: Obtener datos relacionados para tarifario
    const [user, company, project, module] = await Promise.all([
      User.findOne({ userId: projectAssignment.consultorId }),
      Company.findOne({ companyId: projectAssignment.companyId }),
      Project.findOne({ projectId: projectAssignment.projectId }),
      Module.findOne({ moduleId: projectAssignment.moduleId })
    ]);
    
    // ✅ NUEVO: Crear entrada en tarifario automáticamente
    const margen = (projectAssignment.tarifaCliente || 0) - (projectAssignment.tarifaConsultor || 0);
    const margenPorcentaje = projectAssignment.tarifaCliente > 0 
      ? ((margen / projectAssignment.tarifaCliente) * 100).toFixed(2)
      : 0;
    
    const tarifario = new Tarifario({
      tarifarioId: `tarifa_${projectAssignment.projectAssignmentId}`,
      assignmentId: projectAssignment.projectAssignmentId,
      consultorId: projectAssignment.consultorId,
      consultorNombre: user ? user.name : 'Desconocido',
      companyId: projectAssignment.companyId,
      companyName: company ? company.name : 'Desconocido',
      supportId: null,
      supportName: null,
      projectId: projectAssignment.projectId,
      projectName: project ? project.name : 'Desconocido',
      moduleId: projectAssignment.moduleId,
      moduleName: module ? module.name : 'Desconocido',
      costoConsultor: projectAssignment.tarifaConsultor || 0,
      costoCliente: projectAssignment.tarifaCliente || 0,
      margen: margen,
      margenPorcentaje: parseFloat(margenPorcentaje),
      tipo: 'project',
      descripcionTarea: null,
      isActive: true
    });
    
    await tarifario.save();
    console.log('✅ Tarifario de proyecto creado:', tarifario.tarifarioId);
    
    res.status(201).json({ 
      success: true, 
      message: 'Asignación de proyecto y tarifario creados exitosamente',
      data: projectAssignment 
    });
  } catch (error) {
    console.error('❌ Error creando asignación de proyecto:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// PUT actualizar asignación de proyecto
router.put('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const updates = req.body;

    console.log('Actualizando asignación de proyecto:', req.params.id, updates);

    const projectAssignment = await ProjectAssignment.findOneAndUpdate(
      { projectAssignmentId: req.params.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!projectAssignment) {
      return res.status(404).json({ success: false, message: 'Asignación de proyecto no encontrada' });
    }

    console.log('✅ Asignación de proyecto actualizada');

    res.json({ 
      success: true, 
      message: 'Asignación de proyecto actualizada exitosamente',
      data: projectAssignment 
    });
  } catch (error) {
    console.error('❌ Error actualizando asignación de proyecto:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error al actualizar asignación de proyecto' 
    });
  }
});

// DELETE eliminar asignación de proyecto
router.delete('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    console.log('Eliminando asignación de proyecto:', req.params.id);
    
    const projectAssignment = await ProjectAssignment.findOneAndDelete({ 
      projectAssignmentId: req.params.id 
    });
    
    if (!projectAssignment) {
      return res.status(404).json({ success: false, message: 'Asignación de proyecto no encontrada' });
    }

    const tarifarioDeleted = await Tarifario.deleteOne({ assignmentId: req.params.id });

    console.log('Resultado de eliminar la entrada del tarifario en asignación de proyecto', tarifarioDeleted);
    console.log('Asignación de proyecto eliminada');

    res.json({ 
      success: true, 
      message: 'Asignación de proyecto eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error eliminando asignación de proyecto:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al eliminar asignación de proyecto' 
    });
  }
});

module.exports = router;
