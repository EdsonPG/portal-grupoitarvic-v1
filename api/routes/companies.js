const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Assignment = require('../models/Assignment');
const ProjectAssignment = require('../models/ProjectAssignment');
const TaskAssignment = require('../models/TaskAssignment');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

async function getVisibleCompanyIds(req) {
  if (isAdmin(req)) return null;

  const userId = req.user.userId;
  const [assignments, projectAssignments, taskAssignments] = await Promise.all([
    Assignment.find({ userId, isActive: { $ne: false } }).select('companyId'),
    ProjectAssignment.find({ $or: [{ consultorId: userId }, { userId }], isActive: { $ne: false } }).select('companyId'),
    TaskAssignment.find({ $or: [{ consultorId: userId }, { userId }], isActive: { $ne: false } }).select('companyId')
  ]);

  return [...new Set([
    ...assignments.map(item => item.companyId),
    ...projectAssignments.map(item => item.companyId),
    ...taskAssignments.map(item => item.companyId)
  ].filter(Boolean))];
}

router.get('/', async (req, res) => {
  try {
    const visibleCompanyIds = await getVisibleCompanyIds(req);
    const query = visibleCompanyIds ? { companyId: { $in: visibleCompanyIds } } : {};
    const companies = await Company.find(query);
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const visibleCompanyIds = await getVisibleCompanyIds(req);
    if (visibleCompanyIds && !visibleCompanyIds.includes(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    const company = await Company.findOne({ companyId: req.params.id });
    if (!company) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const data = req.body;
    
    if (!data.companyId) {
      data.companyId = `EMP${Date.now()}`;
    }
    
    const company = new Company(data);
    await company.save();
    res.status(201).json({ success: true, message: 'Empresa creada', data: company });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const company = await Company.findOneAndUpdate(
      { companyId: req.params.id },
      req.body,
      { new: true }
    );
    
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }
    
    res.json({ success: true, message: 'Empresa actualizada', data: company });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const company = await Company.findOneAndDelete({ companyId: req.params.id });
    if (!company) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    res.json({ success: true, message: 'Empresa eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
