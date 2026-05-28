const express = require('express');
const router = express.Router();
const GeneratedReport = require('../models/GeneratedReport');

router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: Se requiere rol de administrador'
    });
  }

  next();
});

// GET all generated reports
router.get('/', async (req, res) => {
  try {
    const reports = await GeneratedReport.find();
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error getting generated reports:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST save generated report
router.post('/', async (req, res) => {
  try {
    const reportData = req.body;
    
    if (!reportData.reportId) {
      reportData.reportId = `excel_${Date.now()}`;
    }
    
    const report = new GeneratedReport(reportData);
    await report.save();
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('Error saving generated report:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT update / increment download count of a generated report
router.put('/:id', async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = await GeneratedReport.findOne({ reportId: reportId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    }
    
    report.downloadCount += 1;
    report.lastDownload = new Date();
    await report.save();
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error updating download count:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE generated report from history
router.delete('/:id', async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = await GeneratedReport.findOneAndDelete({ reportId: reportId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    }
    res.json({ success: true, message: 'Reporte eliminado del historial' });
  } catch (error) {
    console.error('Error deleting generated report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
