const pdfMake = require('pdfmake');

pdfMake.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
});

function formatLegalDate(date = new Date()) {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('es-MX');
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
}

// Plantilla SOW Proyecto - Cliente
const TEMPLATE_SOW_CLIENTE_PROYECTO = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>SOW - {{NOMBRE_PROYECTO}}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a202c; padding: 40px; margin: 0; }
  .header { text-align: center; border-bottom: 2px solid #0052cc; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24pt; font-weight: bold; color: #0052cc; letter-spacing: 1px; }
  .subtitle { font-size: 13pt; font-weight: 600; color: #4a5568; margin-top: 5px; }
  .doc-tag { display: inline-block; background-color: #ebf8ff; color: #2b6cb0; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 10pt; margin-top: 8px; }
  h2 { color: #0052cc; font-size: 14pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 25px; }
  p { margin-bottom: 12px; text-align: justify; }
  table.data-table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 10pt; }
  table.data-table th, table.data-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; }
  table.data-table th { background-color: #edf2f7; color: #2d3748; font-weight: 600; }
  .signatures { margin-top: 50px; width: 100%; }
  .sig-box { width: 45%; float: left; text-align: center; border-top: 1px solid #4a5568; padding-top: 10px; margin: 40px 2.5% 20px 2.5%; }
  .clear { clear: both; }
  .highlight { font-weight: bold; color: #0052cc; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">GRUPO ARVIC S.A. DE C.V.</div>
    <div class="subtitle">ANEXO TÉCNICO Y ORDEN DE SERVICIO (SOW - STATEMENT OF WORK)</div>
    <div class="doc-tag">REF: SOW-PRJ-{{ID_PROYECTO}}</div>
  </div>

  <p>En la Ciudad de México, al día <strong>{{FECHA_EMISION}}</strong>, se suscribe el presente Anexo de Servicios derivado del Contrato Marco de Prestación de Servicios de Consultoría Especializada celebrado entre <strong>GRUPO ARVIC S.A. DE C.V.</strong> (en lo sucesivo "EL PRESTADOR") y la empresa <strong>{{EMPRESA_CLIENTE}}</strong> (en lo sucesivo "EL CLIENTE").</p>

  <h2>1. OBJETO DEL PROYECTO</h2>
  <p>El presente documento define los alcances, horas estimadas, entregables y contraprestación aplicable para la ejecución del proyecto denominado: <span class="highlight">{{NOMBRE_PROYECTO}}</span>.</p>

  <h2>2. RESUMEN DE CONDICIONES COMERCIALES Y PLAZOS</h2>
  <table class="data-table">
    <tr><th>Concepto</th><th>Detalle Pactado</th></tr>
    <tr><td><strong>Nombre del Proyecto</strong></td><td>{{NOMBRE_PROYECTO}}</td></tr>
    <tr><td><strong>Empresa Cliente</strong></td><td>{{EMPRESA_CLIENTE}} (RFC: {{RFC_EMPRESA}})</td></tr>
    <tr><td><strong>Contacto Autorizado</strong></td><td>{{CONTACTO_CLIENTE}} ({{EMAIL_CLIENTE}})</td></tr>
    <tr><td><strong>Fecha Estimada de Inicio</strong></td><td>{{FECHA_INICIO}}</td></tr>
    <tr><td><strong>Fecha Estimada de Cierre</strong></td><td>{{FECHA_FIN}}</td></tr>
    <tr><td><strong>Bolsa de Horas Contratadas</strong></td><td><strong>{{HORAS_TOTALES}} horas</strong></td></tr>
    <tr><td><strong>Tarifa por Hora Cliente</strong></td><td><strong>{{TARIFA_HORA}} MXN</strong></td></tr>
    <tr><td><strong>Inversión Estimada Total</strong></td><td><strong>{{TOTAL_ESTIMADO}} MXN (+ IVA)</strong></td></tr>
  </table>

  <h2>3. ALCANCE Y MÓDULOS DE CONSULTORÍA</h2>
  <p>El alcance incluye consultoría técnica y funcional en los módulos autorizados: <strong>{{MODULOS_PROYECTO}}</strong>. La asignación de recursos especializados será administrada por GRUPO ARVIC de conformidad con el plan de trabajo acordado.</p>

  <h2>4. APROBACIÓN Y FACTURACIÓN</h2>
  <p>Las horas devengadas serán reportadas periódicamente mediante el portal de gestión de ARVIC y validadas por el responsable del CLIENTE conforme a las hojas de tiempo ejecutadas.</p>

  <div class="signatures">
    <div class="sig-box">
      <strong>POR EL CLIENTE</strong><br>
      {{EMPRESA_CLIENTE}}<br>
      Nombre: {{CONTACTO_CLIENTE}}<br>
      Firma y Fecha: ____________________
    </div>
    <div class="sig-box">
      <strong>POR GRUPO ARVIC S.A. DE C.V.</strong><br>
      Dirección de Operaciones y Proyectos<br>
      Firma y Fecha: ____________________
    </div>
    <div class="clear"></div>
  </div>
</body>
</html>
`;

// Plantilla Convenio de Asignación Proyecto - Consultor
const TEMPLATE_CONVENIO_CONSULTOR_PROYECTO = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>Convenio Asignación - {{NOMBRE_PROYECTO}} - {{NOMBRE_CONSULTOR}}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a202c; padding: 40px; margin: 0; }
  .header { text-align: center; border-bottom: 2px solid #2b6cb0; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24pt; font-weight: bold; color: #2b6cb0; }
  .subtitle { font-size: 13pt; font-weight: 600; color: #4a5568; margin-top: 5px; }
  .doc-tag { display: inline-block; background-color: #f0fff4; color: #276749; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 10pt; margin-top: 8px; }
  h2 { color: #2b6cb0; font-size: 13pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 25px; }
  p { margin-bottom: 12px; text-align: justify; }
  table.data-table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 10pt; }
  table.data-table th, table.data-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; }
  table.data-table th { background-color: #edf2f7; color: #2d3748; font-weight: 600; }
  .signatures { margin-top: 50px; width: 100%; }
  .sig-box { width: 45%; float: left; text-align: center; border-top: 1px solid #4a5568; padding-top: 10px; margin: 40px 2.5% 20px 2.5%; }
  .clear { clear: both; }
  .highlight { font-weight: bold; color: #2b6cb0; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">GRUPO ARVIC S.A. DE C.V.</div>
    <div class="subtitle">CONVENIO INDIVIDUAL DE ASIGNACIÓN A PROYECTO</div>
    <div class="doc-tag">ANEXO DE TRABAJO - REF: ASIG-{{ID_ASIGNACION}}</div>
  </div>

  <p>En la Ciudad de México, al día <strong>{{FECHA_EMISION}}</strong>, celebran el presente Convenio Individual de Asignación, por una parte <strong>GRUPO ARVIC S.A. DE C.V.</strong>, y por la otra el Consultor Especializado <strong>{{NOMBRE_CONSULTOR}}</strong> (RFC: {{RFC_CONSULTOR}}), sujeto a las siguientes estipulaciones:</p>

  <h2>1. ASIGNACIÓN AL PROYECTO</h2>
  <p>EL CONSULTOR queda debidamente asignado al proyecto <span class="highlight">{{NOMBRE_PROYECTO}}</span> ejecutado para la cuenta del cliente <strong>{{EMPRESA_CLIENTE}}</strong>.</p>

  <h2>2. CONDICIONES OPERATIVAS Y CONTRAPRESTACIÓN</h2>
  <table class="data-table">
    <tr><th>Concepto</th><th>Términos Asignados</th></tr>
    <tr><td><strong>Consultor</strong></td><td>{{NOMBRE_CONSULTOR}}</td></tr>
    <tr><td><strong>Módulo / Especialidad</strong></td><td>{{ROL_MODULO}}</td></tr>
    <tr><td><strong>Proyecto Destino</strong></td><td>{{NOMBRE_PROYECTO}}</td></tr>
    <tr><td><strong>Empresa Cliente</strong></td><td>{{EMPRESA_CLIENTE}}</td></tr>
    <tr><td><strong>Horas Estimadas Asignadas</strong></td><td><strong>{{HORAS_ASIGNADAS}} horas</strong></td></tr>
    <tr><td><strong>Tarifa de Pago Pactada</strong></td><td><strong>{{TARIFA_HORA}} MXN / hora</strong></td></tr>
    <tr><td><strong>Monto Máximo Asignado</strong></td><td><strong>{{TOTAL_ESTIMADO}} MXN</strong></td></tr>
    <tr><td><strong>Periodo de Ejecución</strong></td><td>Del {{FECHA_INICIO}} al {{FECHA_FIN}}</td></tr>
  </table>

  <h2>3. REGISTRO DE HORAS Y CONFIDENCIALIDAD</h2>
  <p>EL CONSULTOR se compromete a registrar verazmente sus horas y actividades en el portal de GRUPO ARVIC, y a mantener estricta confidencialidad respecto a la información y bases de datos a las que tenga acceso durante el proyecto.</p>

  <div class="signatures">
    <div class="sig-box">
      <strong>EL CONSULTOR</strong><br>
      {{NOMBRE_CONSULTOR}}<br>
      RFC: {{RFC_CONSULTOR}}<br>
      Firma: ____________________
    </div>
    <div class="sig-box">
      <strong>GRUPO ARVIC S.A. DE C.V.</strong><br>
      Coordinación de Operaciones<br>
      Firma: ____________________
    </div>
    <div class="clear"></div>
  </div>
</body>
</html>
`;

// Plantilla SOW Soporte - Cliente
const TEMPLATE_SOW_CLIENTE_SOPORTE = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>SOW Soporte - {{NOMBRE_SOPORTE}}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a202c; padding: 40px; margin: 0; }
  .header { text-align: center; border-bottom: 2px solid #805ad5; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24pt; font-weight: bold; color: #805ad5; }
  .subtitle { font-size: 13pt; font-weight: 600; color: #4a5568; margin-top: 5px; }
  .doc-tag { display: inline-block; background-color: #faf5ff; color: #6b46c1; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 10pt; margin-top: 8px; }
  h2 { color: #6b46c1; font-size: 13pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 25px; }
  p { margin-bottom: 12px; text-align: justify; }
  table.data-table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 10pt; }
  table.data-table th, table.data-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; }
  table.data-table th { background-color: #edf2f7; color: #2d3748; font-weight: 600; }
  .signatures { margin-top: 50px; width: 100%; }
  .sig-box { width: 45%; float: left; text-align: center; border-top: 1px solid #4a5568; padding-top: 10px; margin: 40px 2.5% 20px 2.5%; }
  .clear { clear: both; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">GRUPO ARVIC S.A. DE C.V.</div>
    <div class="subtitle">CONTRATO DE SERVICIO DE MESA DE AYUDA Y SOPORTE ESPECIALIZADO</div>
    <div class="doc-tag">REF: SUP-CLI-{{ID_SOPORTE}}</div>
  </div>

  <p>Al día <strong>{{FECHA_EMISION}}</strong>, se suscribe el presente Convenio de Soporte y Bolsa de Horas entre <strong>GRUPO ARVIC S.A. DE C.V.</strong> y <strong>{{EMPRESA_CLIENTE}}</strong>.</p>

  <h2>1. CONDICIONES DE LA BOLSA DE HORAS</h2>
  <table class="data-table">
    <tr><th>Concepto</th><th>Detalle Pactado</th></tr>
    <tr><td><strong>Servicio de Soporte</strong></td><td>{{NOMBRE_SOPORTE}}</td></tr>
    <tr><td><strong>Empresa Cliente</strong></td><td>{{EMPRESA_CLIENTE}} (RFC: {{RFC_EMPRESA}})</td></tr>
    <tr><td><strong>Bolsa de Horas Mensual / Periodo</strong></td><td><strong>{{BOLSA_HORAS}} horas</strong></td></tr>
    <tr><td><strong>Tarifa por Hora</strong></td><td><strong>{{TARIFA_HORA}} MXN</strong></td></tr>
    <tr><td><strong>Facturación Mensual Estimada</strong></td><td><strong>{{TOTAL_ESTIMADO}} MXN (+ IVA)</strong></td></tr>
    <tr><td><strong>Acuerdo de Nivel de Servicio (SLA)</strong></td><td>{{SLA_TIEMPO_RESPUESTA}}</td></tr>
  </table>

  <h2>2. PROCEDIMIENTO DE ATENCIÓN DE INCIDENTES</h2>
  <p>Las incidencias y solicitudes serán canalizadas a través del portal de ARVIC asignando los tickets a los consultores certificados en los módulos contratados.</p>

  <div class="signatures">
    <div class="sig-box">
      <strong>POR EL CLIENTE</strong><br>
      {{EMPRESA_CLIENTE}}<br>
      Firma: ____________________
    </div>
    <div class="sig-box">
      <strong>POR GRUPO ARVIC S.A. DE C.V.</strong><br>
      Dirección de Soporte IT<br>
      Firma: ____________________
    </div>
    <div class="clear"></div>
  </div>
</body>
</html>
`;

// Plantilla Convenio Asignación Soporte - Consultor
const TEMPLATE_CONVENIO_CONSULTOR_SOPORTE = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>Convenio Asignación Soporte - {{NOMBRE_CONSULTOR}}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a202c; padding: 40px; margin: 0; }
  .header { text-align: center; border-bottom: 2px solid #dd6b20; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24pt; font-weight: bold; color: #dd6b20; }
  .subtitle { font-size: 13pt; font-weight: 600; color: #4a5568; margin-top: 5px; }
  .doc-tag { display: inline-block; background-color: #fffaf0; color: #c05621; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 10pt; margin-top: 8px; }
  h2 { color: #dd6b20; font-size: 13pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 25px; }
  p { margin-bottom: 12px; text-align: justify; }
  table.data-table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 10pt; }
  table.data-table th, table.data-table td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; }
  table.data-table th { background-color: #edf2f7; color: #2d3748; font-weight: 600; }
  .signatures { margin-top: 50px; width: 100%; }
  .sig-box { width: 45%; float: left; text-align: center; border-top: 1px solid #4a5568; padding-top: 10px; margin: 40px 2.5% 20px 2.5%; }
  .clear { clear: both; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">GRUPO ARVIC S.A. DE C.V.</div>
    <div class="subtitle">CONVENIO DE ASIGNACIÓN A MESA DE AYUDA Y SOPORTE</div>
    <div class="doc-tag">REF: ASIG-SUP-{{ID_ASIGNACION}}</div>
  </div>

  <p>Al día <strong>{{FECHA_EMISION}}</strong>, se asigna al consultor <strong>{{NOMBRE_CONSULTOR}}</strong> a la cuenta de soporte de <strong>{{EMPRESA_CLIENTE}}</strong> bajo las siguientes condiciones:</p>

  <h2>1. CONDICIONES DE PARTICIPACIÓN</h2>
  <table class="data-table">
    <tr><th>Concepto</th><th>Términos</th></tr>
    <tr><td><strong>Consultor</strong></td><td>{{NOMBRE_CONSULTOR}} (RFC: {{RFC_CONSULTOR}})</td></tr>
    <tr><td><strong>Módulo de Soporte</strong></td><td>{{ROL_MODULO}}</td></tr>
    <tr><td><strong>Cuenta / Empresa Cliente</strong></td><td>{{EMPRESA_CLIENTE}}</td></tr>
    <tr><td><strong>Servicio de Soporte</strong></td><td>{{NOMBRE_SOPORTE}}</td></tr>
    <tr><td><strong>Tarifa de Pago por Hora de Soporte</strong></td><td><strong>{{TARIFA_HORA}} MXN / hora</strong></td></tr>
  </table>

  <h2>2. RESOLUCIÓN DE TICKETS</h2>
  <p>EL CONSULTOR atenderá los tickets asignados en tiempo y forma, registrando los avances y horas dedicadas para su correspondiente pago quincenal/mensual.</p>

  <div class="signatures">
    <div class="sig-box">
      <strong>EL CONSULTOR</strong><br>
      {{NOMBRE_CONSULTOR}}<br>
      Firma: ____________________
    </div>
    <div class="sig-box">
      <strong>GRUPO ARVIC S.A. DE C.V.</strong><br>
      Firma: ____________________
    </div>
    <div class="clear"></div>
  </div>
</body>
</html>
`;

/**
 * Replaces placeholders in template string with real data values
 */
function fillTemplate(template, data = {}) {
  let output = template;
  const mergedData = {
    FECHA_EMISION: formatLegalDate(data.fechaEmision || new Date()),
    NOMBRE_PROYECTO: data.nombreProyecto || 'Proyecto de Consultoría',
    ID_PROYECTO: data.idProyecto || 'PRJ-GEN',
    NOMBRE_SOPORTE: data.nombreSoporte || 'Soporte Continuo Especializado',
    ID_SOPORTE: data.idSoporte || 'SUP-GEN',
    ID_ASIGNACION: data.idAsignacion || 'ASIG-GEN',
    EMPRESA_CLIENTE: data.empresaCliente || 'Cliente Corporativo',
    RFC_EMPRESA: data.rfcEmpresa || 'XAXX010101000',
    CONTACTO_CLIENTE: data.contactoCliente || 'Representante Legal',
    EMAIL_CLIENTE: data.emailCliente || 'contacto@cliente.com',
    NOMBRE_CONSULTOR: data.nombreConsultor || 'Consultor Especialista',
    RFC_CONSULTOR: data.rfcConsultor || 'CONS010101XXX',
    EMAIL_CONSULTOR: data.emailConsultor || 'consultor@arvic.com',
    ROL_MODULO: data.rolModulo || 'Consultoría General',
    MODULOS_PROYECTO: data.modulosProyecto || 'Módulos de Sistema y Consultoría',
    HORAS_TOTALES: data.horasTotales || '0',
    HORAS_ASIGNADAS: data.horasAsignadas || data.horasTotales || '0',
    BOLSA_HORAS: data.bolsaHoras || data.horasTotales || '0',
    TARIFA_HORA: formatCurrency(data.tarifaHora || 0),
    TOTAL_ESTIMADO: formatCurrency(data.totalEstimado || (Number(data.horasTotales || data.horasAsignadas || 0) * Number(data.tarifaHora || 0))),
    FECHA_INICIO: data.fechaInicio ? formatLegalDate(data.fechaInicio) : 'Por definir',
    FECHA_FIN: data.fechaFin ? formatLegalDate(data.fechaFin) : 'Por definir',
    SLA_TIEMPO_RESPUESTA: data.slaTiempoRespuesta || 'Crítico: 2 hrs / Mayor: 4 hrs / Menor: 8 hrs',
    ...data
  };

  for (const [key, val] of Object.entries(mergedData)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    output = output.replace(regex, val !== null && val !== undefined ? String(val) : '');
  }

  return output;
}

/**
 * Main generator function
 * @param {string} type 'sow_cliente_proyecto' | 'convenio_consultor_proyecto' | 'sow_cliente_soporte' | 'convenio_consultor_soporte'
 * @param {object} data Context data
 * @param {string} [customTemplate] Optional user-uploaded HTML/text template to override defaults
 * @returns {string} Fully formatted HTML compatible with Word (.doc)
 */
function generateContractDoc(type, data, customTemplate = null) {
  let template = customTemplate;
  if (!template) {
    switch (type) {
      case 'sow_cliente_proyecto':
        template = TEMPLATE_SOW_CLIENTE_PROYECTO;
        break;
      case 'convenio_consultor_proyecto':
        template = TEMPLATE_CONVENIO_CONSULTOR_PROYECTO;
        break;
      case 'sow_cliente_soporte':
        template = TEMPLATE_SOW_CLIENTE_SOPORTE;
        break;
      case 'convenio_consultor_soporte':
        template = TEMPLATE_CONVENIO_CONSULTOR_SOPORTE;
        break;
      default:
        template = TEMPLATE_SOW_CLIENTE_PROYECTO;
    }
  }
  return fillTemplate(template, data);
}

/**
 * Generates official PDF document using pdfMake with embedded Helvetica font
 */
async function generateContractPdfBuffer(type, rawData = {}) {
  const data = {
    fechaEmision: formatLegalDate(rawData.fechaEmision || new Date()),
    nombreProyecto: rawData.nombreProyecto || 'Proyecto de Consultoría',
    idProyecto: rawData.idProyecto || 'PRJ-GEN',
    nombreSoporte: rawData.nombreSoporte || 'Soporte Especializado',
    idSoporte: rawData.idSoporte || 'SUP-GEN',
    idAsignacion: rawData.idAsignacion || 'ASIG-GEN',
    empresaCliente: rawData.empresaCliente || 'Cliente Corporativo',
    rfcEmpresa: rawData.rfcEmpresa || 'XAXX010101000',
    contactoCliente: rawData.contactoCliente || 'Representante Autorizado',
    emailCliente: rawData.emailCliente || 'contacto@cliente.com',
    nombreConsultor: rawData.nombreConsultor || 'Consultor Especialista',
    rfcConsultor: rawData.rfcConsultor || 'CONS010101XXX',
    emailConsultor: rawData.emailConsultor || '',
    rolModulo: rawData.rolModulo || 'Consultoría Especializada',
    modulosProyecto: rawData.modulosProyecto || 'Sistemas y Consultoría IT',
    horasTotales: rawData.horasTotales || '0',
    horasAsignadas: rawData.horasAsignadas || rawData.horasTotales || '0',
    bolsaHoras: rawData.bolsaHoras || rawData.horasTotales || '0',
    tarifaHora: formatCurrency(rawData.tarifaHora || 0),
    totalEstimado: formatCurrency(rawData.totalEstimado || (Number(rawData.horasTotales || rawData.horasAsignadas || 0) * Number(rawData.tarifaHora || 0))),
    fechaInicio: rawData.fechaInicio ? formatLegalDate(rawData.fechaInicio) : 'Por definir',
    fechaFin: rawData.fechaFin ? formatLegalDate(rawData.fechaFin) : 'Por definir',
    slaTiempoRespuesta: rawData.slaTiempoRespuesta || 'Crítico: 2 hrs / Mayor: 4 hrs / Menor: 8 hrs'
  };

  let title = 'CONTRATO Y ACUERDO DE SERVICIOS';
  let subtitle = 'GRUPO IT ARVIC S.A. DE C.V.';
  let content = [];

  if (type === 'sow_cliente_proyecto') {
    title = 'ANEXO TÉCNICO Y ORDEN DE SERVICIO (SOW)';
    subtitle = `PROYECTO: ${data.nombreProyecto}`;
    content = [
      { text: `En la Ciudad de México, al día ${data.fechaEmision}, se suscribe el presente Anexo de Servicios derivado del Contrato Marco celebrado entre GRUPO ARVIC S.A. DE C.V. y la empresa ${data.empresaCliente}.`, margin: [0, 0, 0, 14], fontSize: 10, lineHeight: 1.4 },
      { text: '1. OBJETO DEL PROYECTO', style: 'sectionHeader' },
      { text: `Definición de alcances, entregables, horas contratadas y contraprestación para el proyecto: ${data.nombreProyecto}.`, margin: [0, 0, 0, 12], fontSize: 10 },
      { text: '2. CONDICIONES COMERCIALES Y PLAZOS', style: 'sectionHeader' },
      {
        table: {
          widths: ['40%', '60%'],
          body: [
            [{ text: 'Concepto', bold: true, fillColor: '#f1f5f9' }, { text: 'Detalle Pactado', bold: true, fillColor: '#f1f5f9' }],
            ['Proyecto', data.nombreProyecto],
            ['Empresa Cliente', `${data.empresaCliente} (RFC: ${data.rfcEmpresa})`],
            ['Contacto Autorizado', `${data.contactoCliente} (${data.emailCliente})`],
            ['Bolsa de Horas', `${data.horasTotales} horas`],
            ['Tarifa por Hora', `${data.tarifaHora} MXN`],
            ['Inversión Estimada', `${data.totalEstimado} MXN (+ IVA)`],
            ['Periodo Estimado', `Del ${data.fechaInicio} al ${data.fechaFin}`]
          ]
        },
        margin: [0, 0, 0, 16],
        fontSize: 9
      },
      { text: '3. ALCANCE Y MÓDULOS', style: 'sectionHeader' },
      { text: `Comprende consultoría y desarrollo en los módulos: ${data.modulosProyecto}.`, margin: [0, 0, 0, 30], fontSize: 10 },
      {
        columns: [
          { text: `___________________________\nPOR EL CLIENTE\n${data.empresaCliente}\n${data.contactoCliente}`, alignment: 'center', fontSize: 9 },
          { text: '___________________________\nPOR GRUPO ARVIC S.A. DE C.V.\nDirección de Operaciones\nFirma Autorizada', alignment: 'center', fontSize: 9 }
        ]
      }
    ];
  } else if (type === 'convenio_consultor_proyecto') {
    title = 'CONVENIO INDIVIDUAL DE ASIGNACIÓN A PROYECTO';
    subtitle = `CONSULTOR: ${data.nombreConsultor}`;
    content = [
      { text: `Al día ${data.fechaEmision}, celebran el presente Convenio Individual de Asignación, GRUPO ARVIC S.A. DE C.V. y el Consultor ${data.nombreConsultor} (RFC: ${data.rfcConsultor}).`, margin: [0, 0, 0, 14], fontSize: 10, lineHeight: 1.4 },
      { text: '1. CONDICIONES Y CONTRAPRESTACIÓN PACTADA', style: 'sectionHeader' },
      {
        table: {
          widths: ['40%', '60%'],
          body: [
            [{ text: 'Concepto', bold: true, fillColor: '#f1f5f9' }, { text: 'Términos Asignados', bold: true, fillColor: '#f1f5f9' }],
            ['Consultor Asignado', `${data.nombreConsultor} (${data.emailConsultor})`],
            ['Proyecto Destino', data.nombreProyecto],
            ['Empresa / Cuenta Cliente', data.empresaCliente],
            ['Módulo / Especialidad', data.rolModulo],
            ['Horas Estimadas', `${data.horasAsignadas} horas`],
            ['Tarifa de Pago Pactada', `${data.tarifaHora} MXN / hora`],
            ['Monto Máximo Estimado', `${data.totalEstimado} MXN`]
          ]
        },
        margin: [0, 0, 0, 16],
        fontSize: 9
      },
      { text: '2. CONFIDENCIALIDAD Y REPORTE DE HORAS', style: 'sectionHeader' },
      { text: 'El Consultor se compromete a registrar verazmente sus horas ejecutadas en el portal y a mantener confidencialidad absoluta sobre la información y accesos proporcionados.', margin: [0, 0, 0, 30], fontSize: 10 },
      {
        columns: [
          { text: `___________________________\nEL CONSULTOR\n${data.nombreConsultor}\nRFC: ${data.rfcConsultor}`, alignment: 'center', fontSize: 9 },
          { text: '___________________________\nPOR GRUPO ARVIC S.A. DE C.V.\nCoordinación de Operaciones\nFirma Autorizada', alignment: 'center', fontSize: 9 }
        ]
      }
    ];
  } else if (type === 'sow_cliente_soporte') {
    title = 'ORDEN DE SERVICIO Y BOLSA DE SOPORTE CONTINUO';
    subtitle = `CUENTA: ${data.empresaCliente}`;
    content = [
      { text: `Al día ${data.fechaEmision}, se suscribe el presente Convenio de Mesa de Soporte entre GRUPO ARVIC S.A. DE C.V. y ${data.empresaCliente}.`, margin: [0, 0, 0, 14], fontSize: 10 },
      { text: '1. CONDICIONES DE LA BOLSA DE HORAS', style: 'sectionHeader' },
      {
        table: {
          widths: ['40%', '60%'],
          body: [
            [{ text: 'Concepto', bold: true, fillColor: '#f1f5f9' }, { text: 'Detalle', bold: true, fillColor: '#f1f5f9' }],
            ['Servicio', data.nombreSoporte],
            ['Cliente', `${data.empresaCliente} (RFC: ${data.rfcEmpresa})`],
            ['Bolsa Mensual', `${data.bolsaHoras} horas`],
            ['Tarifa por Hora', `${data.tarifaHora} MXN`],
            ['Facturación Estimada', `${data.totalEstimado} MXN (+ IVA)`],
            ['SLA de Atención', data.slaTiempoRespuesta]
          ]
        },
        margin: [0, 0, 0, 30],
        fontSize: 9
      },
      {
        columns: [
          { text: `___________________________\nPOR EL CLIENTE\n${data.empresaCliente}`, alignment: 'center', fontSize: 9 },
          { text: '___________________________\nPOR GRUPO ARVIC S.A. DE C.V.\nDirección de Soporte', alignment: 'center', fontSize: 9 }
        ]
      }
    ];
  } else {
    // convenio_consultor_soporte u otro
    title = 'CONVENIO DE ASIGNACIÓN A MESA DE AYUDA Y SOPORTE';
    subtitle = `CONSULTOR: ${data.nombreConsultor}`;
    content = [
      { text: `Al día ${data.fechaEmision}, se asigna al consultor ${data.nombreConsultor} a la cuenta de soporte de ${data.empresaCliente}.`, margin: [0, 0, 0, 14], fontSize: 10 },
      {
        table: {
          widths: ['40%', '60%'],
          body: [
            [{ text: 'Concepto', bold: true, fillColor: '#f1f5f9' }, { text: 'Términos', bold: true, fillColor: '#f1f5f9' }],
            ['Consultor', `${data.nombreConsultor} (RFC: ${data.rfcConsultor})`],
            ['Módulo Asignado', data.rolModulo],
            ['Cuenta / Cliente', data.empresaCliente],
            ['Servicio', data.nombreSoporte],
            ['Tarifa de Pago por Hora', `${data.tarifaHora} MXN / hora`]
          ]
        },
        margin: [0, 0, 0, 30],
        fontSize: 9
      },
      {
        columns: [
          { text: `___________________________\nEL CONSULTOR\n${data.nombreConsultor}`, alignment: 'center', fontSize: 9 },
          { text: '___________________________\nPOR GRUPO ARVIC S.A. DE C.V.\nCoordinación de Soporte', alignment: 'center', fontSize: 9 }
        ]
      }
    ];
  }

  const docDefinition = {
    defaultStyle: { font: 'Helvetica' },
    pageMargins: [40, 50, 40, 50],
    header: {
      text: 'GRUPO IT ARVIC S.A. DE C.V. — DOCUMENTO OFICIAL',
      alignment: 'right',
      margin: [0, 20, 40, 0],
      fontSize: 8,
      color: '#94a3b8'
    },
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          { text: 'Confidencial — Grupo IT ARVIC S.A. de C.V.', fontSize: 8, color: '#94a3b8', margin: [40, 0, 0, 0] },
          { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 8, color: '#94a3b8', margin: [0, 0, 40, 0] }
        ]
      };
    },
    content: [
      { text: 'GRUPO IT ARVIC S.A. DE C.V.', fontSize: 16, bold: true, color: '#0284c7', alignment: 'center' },
      { text: title, fontSize: 12, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 4, 0, 2] },
      { text: subtitle, fontSize: 10, color: '#64748b', alignment: 'center', margin: [0, 0, 0, 16] },
      ...content
    ],
    styles: {
      sectionHeader: {
        fontSize: 11,
        bold: true,
        color: '#0284c7',
        margin: [0, 10, 0, 6]
      }
    }
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  return await pdfDoc.getBuffer();
}

/**
 * Generates a clean official PDF for standard generic machotes (NDA, Contrato Marco, etc.)
 */
async function generateMachotePdfBuffer(title, description, category, htmlContent = '') {
  // Extraer párrafos limpios del HTML
  const plainText = htmlContent
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const paragraphs = plainText.split('\n\n').filter(p => p.trim().length > 0);

  const docDefinition = {
    defaultStyle: { font: 'Helvetica' },
    pageMargins: [40, 50, 40, 50],
    header: {
      text: 'GRUPO IT ARVIC S.A. DE C.V. — FORMATO OFICIAL INSTITUCIONAL',
      alignment: 'right',
      margin: [0, 20, 40, 0],
      fontSize: 8,
      color: '#94a3b8'
    },
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          { text: 'Confidencial — Grupo IT ARVIC S.A. de C.V.', fontSize: 8, color: '#94a3b8', margin: [40, 0, 0, 0] },
          { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 8, color: '#94a3b8', margin: [0, 0, 40, 0] }
        ]
      };
    },
    content: [
      { text: 'GRUPO IT ARVIC S.A. DE C.V.', fontSize: 16, bold: true, color: '#0284c7', alignment: 'center' },
      { text: title.toUpperCase(), fontSize: 12, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 4, 0, 2] },
      { text: `CATEGORÍA: ${category.toUpperCase()}`, fontSize: 9, color: '#64748b', alignment: 'center', margin: [0, 0, 0, 16] },
      ...paragraphs.map(p => ({
        text: p.trim(),
        fontSize: 9.5,
        lineHeight: 1.35,
        margin: [0, 0, 0, 8],
        alignment: 'justify'
      }))
    ]
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  return await pdfDoc.getBuffer();
}

module.exports = {
  generateContractDoc,
  generateContractPdfBuffer,
  generateMachotePdfBuffer,
  fillTemplate,
  formatLegalDate,
  formatCurrency,
  TEMPLATE_SOW_CLIENTE_PROYECTO,
  TEMPLATE_CONVENIO_CONSULTOR_PROYECTO,
  TEMPLATE_SOW_CLIENTE_SOPORTE,
  TEMPLATE_CONVENIO_CONSULTOR_SOPORTE
};

