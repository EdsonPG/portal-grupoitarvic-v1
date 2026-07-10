const express = require('express');
const router = express.Router();
const Module = require('../models/Module');
const Assignment = require('../models/Assignment');
const ProjectAssignment = require('../models/ProjectAssignment');
const TaskAssignment = require('../models/TaskAssignment');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

async function getVisibleModuleIds(req) {
  if (isAdmin(req)) return null;

  const userId = req.user.userId;
  const [assignments, projectAssignments, taskAssignments] = await Promise.all([
    Assignment.find({ userId, isActive: { $ne: false } }).select('moduleId'),
    ProjectAssignment.find({ $or: [{ consultorId: userId }, { userId }], isActive: { $ne: false } }).select('moduleId'),
    TaskAssignment.find({ $or: [{ consultorId: userId }, { userId }], isActive: { $ne: false } }).select('moduleId')
  ]);

  return [...new Set([
    ...assignments.map(item => item.moduleId),
    ...projectAssignments.map(item => item.moduleId),
    ...taskAssignments.map(item => item.moduleId)
  ].filter(Boolean))];
}

function requireAdmin(req, res) {
  if (!isAdmin(req)) {
    res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
    return false;
  }
  return true;
}

router.get('/', async (req, res) => {
  try {
    const visibleModuleIds = await getVisibleModuleIds(req);
    const query = visibleModuleIds ? { moduleId: { $in: visibleModuleIds } } : {};
    const modules = await Module.find(query);
    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const visibleModuleIds = await getVisibleModuleIds(req);
    if (visibleModuleIds && !visibleModuleIds.includes(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Módulo no encontrado' });
    }

    const module = await Module.findOne({ moduleId: req.params.id });
    if (!module) return res.status(404).json({ success: false, message: 'Módulo no encontrado' });
    res.json({ success: true, data: module });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const data = req.body;
    
    if (!data.moduleId) {
      data.moduleId = `MOD${Date.now()}`;
    }

    const module = new Module(data);
    await module.save();
    res.status(201).json({ success: true, message: 'Módulo creado', data: module });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const module = await Module.findOneAndUpdate(
      { moduleId: req.params.id },
      req.body,
      { new: true }
    );

    if (!module) {
      return res.status(404).json({ success: false, message: 'Módulo no encontrado' });
    }

    res.json({ success: true, message: 'Módulo actualizado', data: module });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const module = await Module.findOneAndDelete({ moduleId: req.params.id });
    if (!module) return res.status(404).json({ success: false, message: 'Módulo no encontrado' });
    res.json({ success: true, message: 'Módulo eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
