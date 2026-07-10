const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const Assignment = require('../models/Assignment');
const TaskAssignment = require('../models/TaskAssignment');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

async function getVisibleSupportIds(req) {
  if (isAdmin(req)) return null;

  const userId = req.user.userId;
  const [assignments, taskAssignments] = await Promise.all([
    Assignment.find({ userId, isActive: { $ne: false } }).select('supportId'),
    TaskAssignment.find({ $or: [{ consultorId: userId }, { userId }], isActive: { $ne: false } }).select('linkedSupportId')
  ]);

  return [...new Set([
    ...assignments.map(item => item.supportId),
    ...taskAssignments.map(item => item.linkedSupportId)
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
    const visibleSupportIds = await getVisibleSupportIds(req);
    const query = visibleSupportIds ? { supportId: { $in: visibleSupportIds } } : {};
    const supports = await Support.find(query);
    res.json({ success: true, data: supports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const visibleSupportIds = await getVisibleSupportIds(req);
    if (visibleSupportIds && !visibleSupportIds.includes(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Soporte no encontrado' });
    }

    const support = await Support.findOne({ supportId: req.params.id });
    if (!support) return res.status(404).json({ success: false, message: 'Soporte no encontrado' });
    res.json({ success: true, data: support });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const data = req.body;
    
    if (!data.supportId) {
      data.supportId = `SUP${Date.now()}`;
    }

    const support = new Support(data);
    await support.save();
    res.status(201).json({ success: true, message: 'Soporte creado', data: support });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const support = await Support.findOneAndUpdate(
      { supportId: req.params.id },
      req.body,
      { new: true }
    );

    if (!support) {
      return res.status(404).json({ success: false, message: 'Soporte no encontrado' });
    }

    res.json({ success: true, message: 'Soporte actualizado', data: support });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const support = await Support.findOneAndDelete({ supportId: req.params.id });
    if (!support) return res.status(404).json({ success: false, message: 'Soporte no encontrado' });
    res.json({ success: true, message: 'Soporte eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
