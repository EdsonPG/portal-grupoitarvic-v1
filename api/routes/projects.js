const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// GET todos los proyectos
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ projectId: req.params.id });
    if (!project) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST crear proyecto
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const data = req.body;
    if (!data.projectId) {  
      data.projectId = `PRJ${Date.now()}`; 
    }
    const project = new Project(data);
    await project.save();
    res.status(201).json({ success: true, message: 'Proyecto creado', data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT actualizar proyecto
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const project = await Project.findOneAndUpdate(
      { projectId: req.params.id }, 
      req.body,
      { new: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    res.json({ success: true, message: 'Proyecto actualizado', data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE eliminar proyecto
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const project = await Project.findOneAndDelete({ projectId: req.params.id }); 
    if (!project) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    res.json({ success: true, message: 'Proyecto eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;