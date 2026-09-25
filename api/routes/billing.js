const express = require('express');
const router = express.Router();
const BillingPeriod = require('../models/BillingPeriod');
const Report = require('../models/Report');
const Tarifario = require('../models/Tarifario');
const Company = require('../models/Company');
const User = require('../models/User');
const Project = require('../models/Project');
const Support = require('../models/Support');
const Module = require('../models/Module');
const ExcelJS = require('exceljs');

// Middleware de autorización para facturación
function requireAdminOrClient(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'cliente') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador o cliente' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }
  next();
}

// =========================================================================
// 1. PREVIEW DE CONCILIACIÓN (Cálculo económico en vivo sin guardar)
// =========================================================================
router.post('/reconcile-preview', requireAdmin, async (req, res) => {
  try {
    const { companyId, startDate, endDate, periodType = 'quincenal', periodName } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Las fechas de inicio y fin son obligatorias' });
    }

    // Parsear fechas de forma segura evitando desfase UTC
    let start, end;
    if (typeof startDate === 'string' && startDate.includes('-')) {
      const [y, m, d] = startDate.split('T')[0].split('-').map(Number);
      start = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }

    if (typeof endDate === 'string' && endDate.includes('-')) {
      const [y, m, d] = endDate.split('T')[0].split('-').map(Number);
      end = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    // Armar query de reportes
    const reportQuery = {
      status: 'Aprobado',
      date: { $gte: start, $lte: end }
    };

    if (companyId && companyId !== 'all') {
      reportQuery.companyId = companyId;
    }

    const [reports, tarifarios, users, companies, projects, supports, modules] = await Promise.all([
      Report.find(reportQuery).sort({ date: 1 }).lean(),
      Tarifario.find({ isActive: true }).lean(),
      User.find({}).lean(),
      Company.find({}).lean(),
      Project.find({}).lean(),
      Support.find({}).lean(),
      Module.find({}).lean()
    ]);

    // Mapas auxiliares para resolución rápida
    const userMap = new Map(users.map(u => [u.userId, u.name]));
    const companyMap = new Map(companies.map(c => [c.companyId, c]));
    const projectMap = new Map(projects.map(p => [p.projectId, p.name]));
    const supportMap = new Map(supports.map(s => [s.supportId, s.name]));
    const moduleMap = new Map(modules.map(m => [m.moduleId, m.name]));

    // Mapa de tarifas por clave compuesta
    // 1: assignmentId
    // 2: consultorId_companyId_moduleId
    const tarifarioByAssignment = new Map(tarifarios.map(t => [t.assignmentId, t]));

    let totalHours = 0;
    let totalClient = 0;
    let totalConsultant = 0;

    const consultantSummary = {};
    const projectSummary = {};

    const items = reports.map(report => {
      const hours = Number(report.hours) || 0;
      totalHours += hours;

      // Buscar tarifa correspondiente
      let tarifa = tarifarioByAssignment.get(report.assignmentId);
      if (!tarifa) {
        // Búsqueda flexible por consultor, empresa y módulo
        tarifa = tarifarios.find(t => 
          t.consultorId === report.userId && 
          t.companyId === report.companyId &&
          (t.moduleId === report.moduleId || (t.supportId && t.supportId === report.supportId) || (t.projectId && t.projectId === report.projectId))
        );
      }

      const rateClient = tarifa ? Number(tarifa.costoCliente) || 0 : 0;
      const rateConsultant = tarifa ? Number(tarifa.costoConsultor) || 0 : 0;
      const amountClient = Number((hours * rateClient).toFixed(2));
      const amountConsultant = Number((hours * rateConsultant).toFixed(2));
      const margin = Number((amountClient - amountConsultant).toFixed(2));

      totalClient += amountClient;
      totalConsultant += amountConsultant;

      const consultorNombre = userMap.get(report.userId) || report.userId;
      const supportName = report.supportId ? (supportMap.get(report.supportId) || report.supportId) : null;
      const projectName = report.projectId ? (projectMap.get(report.projectId) || report.projectId) : null;
      const moduleName = moduleMap.get(report.moduleId) || report.moduleId;

      // Agrupar por Consultor
      if (!consultantSummary[report.userId]) {
        consultantSummary[report.userId] = {
          userId: report.userId,
          name: consultorNombre,
          hours: 0,
          amountClient: 0,
          amountConsultant: 0,
          margin: 0
        };
      }
      consultantSummary[report.userId].hours += hours;
      consultantSummary[report.userId].amountClient += amountClient;
      consultantSummary[report.userId].amountConsultant += amountConsultant;
      consultantSummary[report.userId].margin += margin;

      // Agrupar por Proyecto / Soporte
      const groupKey = projectName ? `PROJ_${report.projectId}` : (supportName ? `SUPP_${report.supportId}` : 'GENERAL');
      const groupName = projectName || supportName || 'Asignación General';
      if (!projectSummary[groupKey]) {
        projectSummary[groupKey] = {
          key: groupKey,
          name: groupName,
          type: projectName ? 'Proyecto' : 'Soporte',
          hours: 0,
          amountClient: 0,
          amountConsultant: 0,
          margin: 0
        };
      }
      projectSummary[groupKey].hours += hours;
      projectSummary[groupKey].amountClient += amountClient;
      projectSummary[groupKey].amountConsultant += amountConsultant;
      projectSummary[groupKey].margin += margin;

      return {
        reportId: report.reportId,
        date: report.date,
        consultorId: report.userId,
        consultorNombre,
        assignmentType: report.assignmentType || 'support',
        supportId: report.supportId,
        supportName,
        projectId: report.projectId,
        projectName,
        moduleId: report.moduleId,
        moduleName,
        ticket: report.title || report.description?.substring(0, 30) || '',
        description: report.description || '',
        hours,
        rateClient,
        rateConsultant,
        amountClient,
        amountConsultant,
        margin,
        periodLocked: report.periodLocked || false,
        billingStatus: report.billingStatus || 'Sin Facturar'
      };
    });

    const grossMargin = Number((totalClient - totalConsultant).toFixed(2));
    const marginPercentage = totalClient > 0 ? Number(((grossMargin / totalClient) * 100).toFixed(2)) : 0;

    let targetCompany = null;
    if (companyId && companyId !== 'all') {
      targetCompany = companyMap.get(companyId) || null;
    }

    res.json({
      success: true,
      data: {
        companyId: targetCompany ? targetCompany.companyId : (companyId === 'all' ? 'all' : ''),
        companyName: targetCompany ? targetCompany.name : (companyId === 'all' ? 'Todas las Empresas' : ''),
        rfc: targetCompany ? (targetCompany.rfc || '') : '',
        periodType,
        periodName: periodName || `Periodo ${startDate} al ${endDate}`,
        startDate: start,
        endDate: end,
        totalHours: Number(totalHours.toFixed(2)),
        totalClient: Number(totalClient.toFixed(2)),
        totalConsultant: Number(totalConsultant.toFixed(2)),
        grossMargin,
        marginPercentage,
        subtotal: Number(totalClient.toFixed(2)),
        iva: Number((totalClient * 0.16).toFixed(2)),
        totalWithIva: Number((totalClient * 1.16).toFixed(2)),
        byConsultant: Object.values(consultantSummary),
        byProject: Object.values(projectSummary),
        items
      }
    });
  } catch (error) {
    console.error('❌ Error en reconcile-preview:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. CREAR Y GUARDAR CORTE DE FACTURACIÓN (BillingPeriod)
// =========================================================================
router.post('/periods', requireAdmin, async (req, res) => {
  try {
    const data = req.body;

    if (!data.companyId || !data.startDate || !data.endDate) {
      return res.status(400).json({ success: false, message: 'Empresa, fecha inicial y fecha final son requeridas' });
    }

    const periodId = data.periodId || `BILL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let normalizedPeriodType = data.periodType || 'quincenal';
    if (normalizedPeriodType === 'q1' || normalizedPeriodType === 'q2') normalizedPeriodType = 'quincenal';
    if (normalizedPeriodType === 'month') normalizedPeriodType = 'mensual';

    const newPeriod = new BillingPeriod({
      ...data,
      periodType: normalizedPeriodType,
      periodId,
      status: data.status || 'Conciliado',
      closedBy: data.status === 'Cerrado' ? (req.user?.userId || 'admin') : null,
      closedAt: data.status === 'Cerrado' ? new Date() : null
    });

    await newPeriod.save();

    // Si el estado es 'Cerrado' o 'Facturado', congelar los reportes vinculados
    if (newPeriod.status === 'Cerrado' || newPeriod.status === 'Facturado') {
      const reportIds = newPeriod.items.map(it => it.reportId).filter(Boolean);
      if (reportIds.length > 0) {
        await Report.updateMany(
          { reportId: { $in: reportIds } },
          {
            $set: {
              periodLocked: true,
              billingPeriodId: newPeriod.periodId,
              billingStatus: newPeriod.status
            }
          }
        );
        console.log(`🔒 Se congelaron ${reportIds.length} reportes para el corte ${newPeriod.periodId}`);
      }
    }

    res.status(201).json({ success: true, data: newPeriod });
  } catch (error) {
    console.error('❌ Error guardando periodo de facturación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 3. LISTAR PERIODOS DE FACTURACIÓN
// =========================================================================
router.get('/periods', requireAdminOrClient, async (req, res) => {
  try {
    const query = {};

    // Si es cliente, solo ve los de su empresa y que no estén en borrador
    if (req.user.role === 'cliente') {
      query.companyId = req.user.companyId;
      query.status = { $in: ['Facturado', 'Cerrado', 'Conciliado'] };
    } else {
      if (req.query.companyId && req.query.companyId !== 'all') {
        query.companyId = req.query.companyId;
      }
      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status;
      }
    }

    const periods = await BillingPeriod.find(query).sort({ startDate: -1 }).lean();

    // Si es cliente, suprimir datos de costos ARVIC por privacidad comercial
    if (req.user.role === 'cliente') {
      const sanitized = periods.map(p => {
        delete p.totalConsultant;
        delete p.grossMargin;
        delete p.marginPercentage;
        if (Array.isArray(p.items)) {
          p.items = p.items.map(it => {
            delete it.rateConsultant;
            delete it.amountConsultant;
            delete it.margin;
            return it;
          });
        }
        return p;
      });
      return res.json({ success: true, data: sanitized });
    }

    res.json({ success: true, data: periods });
  } catch (error) {
    console.error('❌ Error listando periodos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 4. OBTENER DETALLE DE UN PERIODO POR ID
// =========================================================================
router.get('/periods/:id', requireAdminOrClient, async (req, res) => {
  try {
    const period = await BillingPeriod.findOne({ periodId: req.params.id }).lean();
    if (!period) {
      return res.status(404).json({ success: false, message: 'Periodo de facturación no encontrado' });
    }

    if (req.user.role === 'cliente') {
      if (period.companyId !== req.user.companyId) {
        return res.status(403).json({ success: false, message: 'Acceso denegado a este periodo' });
      }
      delete period.totalConsultant;
      delete period.grossMargin;
      delete period.marginPercentage;
      if (Array.isArray(period.items)) {
        period.items = period.items.map(it => {
          delete it.rateConsultant;
          delete it.amountConsultant;
          delete it.margin;
          return it;
        });
      }
    }

    res.json({ success: true, data: period });
  } catch (error) {
    console.error('❌ Error obteniendo periodo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 5. CAMBIAR ESTADO / CERRAR Y CONGELAR PERIODO
// =========================================================================
router.put('/periods/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, invoiceFolio, notes } = req.body;
    const validStatuses = ['Borrador', 'Conciliado', 'Facturado', 'Cerrado'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado de facturación inválido' });
    }

    const period = await BillingPeriod.findOne({ periodId: req.params.id });
    if (!period) {
      return res.status(404).json({ success: false, message: 'Periodo no encontrado' });
    }

    const previousStatus = period.status;
    period.status = status;
    if (invoiceFolio !== undefined) period.invoiceFolio = invoiceFolio;
    if (notes !== undefined) period.notes = notes;
    period.updatedAt = new Date();

    if (status === 'Cerrado' || status === 'Facturado') {
      period.closedBy = req.user.userId;
      period.closedAt = new Date();
    } else if (status === 'Borrador' || status === 'Conciliado') {
      period.closedBy = null;
      period.closedAt = null;
    }

    await period.save();

    // Sincronizar bloqueo en los reportes vinculados
    const reportIds = period.items.map(it => it.reportId).filter(Boolean);
    if (reportIds.length > 0) {
      if (status === 'Cerrado' || status === 'Facturado') {
        await Report.updateMany(
          { reportId: { $in: reportIds } },
          { $set: { periodLocked: true, billingPeriodId: period.periodId, billingStatus: status } }
        );
        console.log(`🔒 Periodo ${period.periodId} marcado como ${status}. ${reportIds.length} reportes congelados.`);
      } else {
        // Desbloqueo administrativo
        await Report.updateMany(
          { reportId: { $in: reportIds } },
          { $set: { periodLocked: false, billingStatus: status } }
        );
        console.log(`🔓 Periodo ${period.periodId} retornado a ${status}. Reportes descongelados.`);
      }
    }

    res.json({ success: true, data: period, message: `Periodo actualizado a ${status}` });
  } catch (error) {
    console.error('❌ Error actualizando estado de periodo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 6. DASHBOARD DE MÉTRICAS FINANCIERAS Y KPIS
// =========================================================================
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const [reports, periods, companies] = await Promise.all([
      Report.find({}).lean(),
      BillingPeriod.find({}).lean(),
      Company.find({}).lean()
    ]);

    // Ratios de horas por estado
    let totalHoursLogged = 0;
    let totalHoursApproved = 0;
    let totalHoursPending = 0;
    let totalHoursRejected = 0;
    let totalHoursLocked = 0;

    reports.forEach(r => {
      const h = Number(r.hours) || 0;
      totalHoursLogged += h;
      if (r.status === 'Aprobado') totalHoursApproved += h;
      else if (r.status === 'Pendiente' || r.status === 'Resubmitted') totalHoursPending += h;
      else if (r.status === 'Rechazado') totalHoursRejected += h;

      if (r.periodLocked) totalHoursLocked += h;
    });

    // Métricas financieras desde los periodos cerrados/facturados
    let totalBilled = 0;
    let totalCost = 0;
    let totalGrossMargin = 0;

    const monthlyMap = {};

    periods.forEach(p => {
      if (p.status === 'Facturado' || p.status === 'Cerrado' || p.status === 'Conciliado') {
        totalBilled += Number(p.totalClient) || 0;
        totalCost += Number(p.totalConsultant) || 0;
        totalGrossMargin += Number(p.grossMargin) || 0;

        // Mes del periodo
        const d = new Date(p.startDate);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { month: monthKey, billed: 0, cost: 0, margin: 0, hours: 0 };
        }
        monthlyMap[monthKey].billed += Number(p.totalClient) || 0;
        monthlyMap[monthKey].cost += Number(p.totalConsultant) || 0;
        monthlyMap[monthKey].margin += Number(p.grossMargin) || 0;
        monthlyMap[monthKey].hours += Number(p.totalHours) || 0;
      }
    });

    const marginPct = totalBilled > 0 ? Number(((totalGrossMargin / totalBilled) * 100).toFixed(2)) : 0;

    // Métricas por empresa cliente
    const companySummary = {};
    companies.forEach(c => {
      companySummary[c.companyId] = {
        companyId: c.companyId,
        name: c.name,
        billed: 0,
        margin: 0,
        hours: 0
      };
    });

    periods.forEach(p => {
      if (companySummary[p.companyId]) {
        companySummary[p.companyId].billed += Number(p.totalClient) || 0;
        companySummary[p.companyId].margin += Number(p.grossMargin) || 0;
        companySummary[p.companyId].hours += Number(p.totalHours) || 0;
      }
    });

    // Ordenar los últimos 6 meses
    const monthlyTrend = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    res.json({
      success: true,
      data: {
        hours: {
          total: Number(totalHoursLogged.toFixed(2)),
          approved: Number(totalHoursApproved.toFixed(2)),
          pending: Number(totalHoursPending.toFixed(2)),
          rejected: Number(totalHoursRejected.toFixed(2)),
          locked: Number(totalHoursLocked.toFixed(2)),
          unlockedApproved: Number((totalHoursApproved - totalHoursLocked).toFixed(2))
        },
        financials: {
          totalBilled: Number(totalBilled.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          grossMargin: Number(totalGrossMargin.toFixed(2)),
          marginPercentage: marginPct,
          totalPeriods: periods.length,
          closedPeriods: periods.filter(p => p.status === 'Cerrado').length
        },
        monthlyTrend,
        byCompany: Object.values(companySummary).filter(c => c.hours > 0 || c.billed > 0)
      }
    });
  } catch (error) {
    console.error('❌ Error en métricas financieras:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 7. EXPORTACIÓN EXCEL PROFESIONAL DEL CORTE (exceljs)
// =========================================================================
router.get('/periods/:id/export-excel', requireAdminOrClient, async (req, res) => {
  try {
    const period = await BillingPeriod.findOne({ periodId: req.params.id });
    if (!period) {
      return res.status(404).json({ success: false, message: 'Periodo no encontrado' });
    }

    const isClientRole = req.user.role === 'cliente';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Portal ARVIC';
    workbook.created = new Date();

    // Hoja 1: Resumen Ejecutivo
    const summarySheet = workbook.addWorksheet('Resumen de Facturación', {
      views: [{ showGridLines: true }]
    });

    summarySheet.columns = [
      { width: 25 },
      { width: 35 },
      { width: 18 },
      { width: 18 },
      { width: 18 }
    ];

    // Encabezado institucional
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'GRUPO IT ARVIC — ORDEN DE PRE-FACTURA Y CONCILIACIÓN';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
    summarySheet.getRow(1).height = 30;

    // Metadatos
    summarySheet.addRow([]);
    summarySheet.addRow(['Folio de Corte:', period.periodId, '', 'Fecha Emisión:', new Date().toLocaleDateString('es-MX')]);
    summarySheet.addRow(['Empresa Cliente:', period.companyName, '', 'RFC:', period.rfc || 'No especificado']);
    summarySheet.addRow(['Periodo:', period.periodName, '', 'Estado:', period.status]);
    summarySheet.addRow(['Rango de Fechas:', `${new Date(period.startDate).toLocaleDateString('es-MX')} al ${new Date(period.endDate).toLocaleDateString('es-MX')}`, '', 'Moneda:', period.currency]);

    summarySheet.addRow([]);

    // Resumen numérico
    summarySheet.addRow(['RESUMEN ECONÓMICO', '', '', '', '']);
    const secRow = summarySheet.lastRow;
    secRow.font = { bold: true, color: { argb: 'FF1B3A5C' } };

    summarySheet.addRow(['Concepto', 'Detalle', 'Valor']);
    const headRow = summarySheet.lastRow;
    headRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5282' } };
      cell.alignment = { horizontal: 'center' };
    });

    summarySheet.addRow(['Total Horas Aprobadas', 'Horas de consultoría computadas', period.totalHours]);
    summarySheet.addRow(['Subtotal Facturable', 'Importe antes de impuestos', `$ ${period.totalClient.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]);
    summarySheet.addRow(['IVA (16%)', 'Impuesto al Valor Agregado', `$ ${(period.totalClient * 0.16).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]);
    summarySheet.addRow(['TOTAL FACTURABLE CON IVA', 'Monto total a cobrar', `$ ${(period.totalClient * 1.16).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]);
    const totalRow = summarySheet.lastRow;
    totalRow.font = { bold: true };
    totalRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };

    if (!isClientRole) {
      summarySheet.addRow([]);
      summarySheet.addRow(['MÉTRICAS INTERNAS ARVIC', '', '']);
      summarySheet.lastRow.font = { bold: true, color: { argb: 'FF1B3A5C' } };
      summarySheet.addRow(['Costo Total Consultores', 'Honorarios profesionales', `$ ${period.totalConsultant.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]);
      summarySheet.addRow(['Margen Bruto ARVIC', 'Utilidad bruta', `$ ${period.grossMargin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]);
      summarySheet.addRow(['Rentabilidad (%)', 'Porcentaje de margen', `${period.marginPercentage} %`]);
    }

    // Hoja 2: Detalle de Tickets y Actividades
    const detailSheet = workbook.addWorksheet('Detalle de Actividades', {
      views: [{ showGridLines: true }]
    });

    const detailColumns = [
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Consultor', key: 'consultor', width: 26 },
      { header: 'Proyecto / Soporte', key: 'project', width: 26 },
      { header: 'Módulo', key: 'module', width: 16 },
      { header: 'Ticket / Referencia', key: 'ticket', width: 22 },
      { header: 'Actividad / Descripción', key: 'description', width: 38 },
      { header: 'Horas', key: 'hours', width: 10 },
      { header: 'Tarifa Cliente/hr', key: 'rateClient', width: 16 },
      { header: 'Subtotal Cliente', key: 'amountClient', width: 18 }
    ];

    if (!isClientRole) {
      detailColumns.push(
        { header: 'Tarifa Consultor/hr', key: 'rateConsultant', width: 18 },
        { header: 'Costo Consultor', key: 'amountConsultant', width: 18 },
        { header: 'Margen', key: 'margin', width: 16 }
      );
    }

    detailSheet.columns = detailColumns;

    const detailHeaderRow = detailSheet.getRow(1);
    detailHeaderRow.height = 25;
    detailHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailHeaderRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    period.items.forEach(it => {
      const rowData = {
        date: new Date(it.date).toLocaleDateString('es-MX'),
        consultor: it.consultorNombre,
        project: it.projectName || it.supportName || 'General',
        module: it.moduleName || '',
        ticket: it.ticket || '',
        description: it.description || '',
        hours: it.hours,
        rateClient: it.rateClient,
        amountClient: it.amountClient
      };

      if (!isClientRole) {
        rowData.rateConsultant = it.rateConsultant;
        rowData.amountConsultant = it.amountConsultant;
        rowData.margin = it.margin;
      }

      detailSheet.addRow(rowData);
    });

    // Formatear columnas numéricas de la tabla de detalles
    detailSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(7).alignment = { horizontal: 'right' };
        row.getCell(8).numFmt = '"$"#,##0.00';
        row.getCell(9).numFmt = '"$"#,##0.00';
        if (!isClientRole) {
          row.getCell(10).numFmt = '"$"#,##0.00';
          row.getCell(11).numFmt = '"$"#,##0.00';
          row.getCell(12).numFmt = '"$"#,##0.00';
        }
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Corte_Facturacion_${period.periodId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('❌ Error exportando Excel de facturación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
