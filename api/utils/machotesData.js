/**
 * api/utils/machotesData.js
 * Repositorio de plantillas base oficiales (Machotes) para Grupo IT ARVIC.
 * Proporciona estructura legal estándar editable en Word (.docx/HTML) o PDF.
 */

const DEFAULT_MACHOTES = [
  {
    id: 'MACHOTE_CONTRATO_CONSULTOR',
    documentType: 'plantilla_contrato_consultor',
    title: 'Contrato Marco de Servicios Profesionales (Consultor)',
    category: 'Consultores',
    targetRole: 'consultor',
    description: 'Contrato marco para formalizar la relación de prestación de servicios profesionales independientes con consultores TI.',
    fileName: 'ARVIC_Contrato_Marco_Consultor_Borrador.doc',
    mimeType: 'application/msword',
    isDraft: true,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Contrato Marco de Prestación de Servicios - Grupo IT ARVIC</title>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; }
  h1 { text-align: center; color: #0f1d3a; font-size: 18pt; margin-bottom: 5px; }
  h2 { text-align: center; color: #0284c7; font-size: 13pt; margin-top: 0; }
  .header-meta { text-align: right; font-size: 10pt; color: #64748b; margin-bottom: 25px; }
  .clause-title { font-weight: bold; color: #0f1d3a; margin-top: 15px; }
  .variable { background: #fef08a; padding: 2px 6px; font-weight: bold; border-bottom: 1px dashed #ca8a04; }
  .signatures { margin-top: 50px; width: 100%; display: table; }
  .sig-col { display: table-cell; width: 50%; text-align: center; padding: 20px; }
  .sig-line { border-top: 1px solid #334155; width: 80%; margin: 40px auto 5px auto; }
</style>
</head>
<body>
  <div class="header-meta">FOLIO: CON-ARV-[AÑO]-[NÚMERO]<br>CIUDAD DE MÉXICO, A <span class="variable">[DÍA] DE [MES] DE [AÑO]</span></div>
  <h1>CONTRATO MARCO DE PRESTACIÓN DE SERVICIOS PROFESIONALES</h1>
  <h2>GRUPO IT ARVIC Y EL CONSULTOR</h2>
  
  <p>CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES INDEPENDIENTES QUE CELEBRAN POR UNA PARTE <strong>GRUPO IT ARVIC S.A. DE C.V.</strong>, EN LO SUCESIVO DENOMINADA <strong>"LA EMPRESA"</strong>, REPRESENTADA EN ESTE ACTO POR <span class="variable">[REPRESENTANTE LEGAL ARVIC]</span>; Y POR OTRA PARTE <span class="variable">[NOMBRE COMPLETO DEL CONSULTOR]</span>, EN LO SUCESIVO <strong>"EL CONSULTOR"</strong>, AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:</p>

  <p class="clause-title">DECLARACIONES</p>
  <p><strong>I. DECLARA "LA EMPRESA":</strong><br>
  a) Ser una sociedad legalmente constituida conforme a las leyes mexicanas, con domicilio fiscal en Ciudad de México.<br>
  b) Que su objeto social comprende la consultoría tecnológica, desarrollo e integración de software y soporte a sistemas informáticos.<br>
  c) Que requiere los servicios profesionales especializados de "EL CONSULTOR" para la ejecución de proyectos y soporte a clientes.</p>

  <p><strong>II. DECLARA "EL CONSULTOR":</strong><br>
  a) Llamarse como ha quedado asentado, de nacionalidad mexicana, con RFC <span class="variable">[RFC CONSULTOR]</span> y CURP <span class="variable">[CURP CONSULTOR]</span>.<br>
  b) Contar con los conocimientos técnicos, experiencia, capacidad y certificaciones requeridas en el sector de Tecnologías de la Información.<br>
  c) Disponer de elementos propios suficientes para desempeñar los servicios encomendados de manera autónoma e independiente.</p>

  <p class="clause-title">CLÁUSULAS</p>
  <p><strong>PRIMERA. OBJETO DEL CONTRATO:</strong> "EL CONSULTOR" se obliga a prestar sus servicios profesionales independientes de consultoría en TI a "LA EMPRESA", conforme a las asignaciones, alcances y especificaciones que se estipulen en los correspondientes Anexos de Proyecto.</p>

  <p><strong>SEGUNDA. HONORARIOS Y FORMA DE PAGO:</strong> "LA EMPRESA" pagará a "EL CONSULTOR" la tarifa pactada por hora efectiva laborada y reportada en la plataforma institucional del PORTAL ARVIC, previa aprobación del Administrador y entrega del Comprobante Fiscal Digital por Internet (CFDI) correspondiente.</p>

  <p><strong>TERCERA. CONFIDENCIALIDAD:</strong> "EL CONSULTOR" se obliga a guardar estricta confidencialidad respecto a toda la información técnica, financiera, comercial y operativa de "LA EMPRESA" y de sus clientes a la que tenga acceso.</p>

  <p><strong>CUARTA. VIGENCIA:</strong> El presente contrato tendrá una vigencia estándar de un año calendario a partir de su firma, pudiendo renovarse por acuerdo mutuo de las partes.</p>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>POR "LA EMPRESA"</strong><br>
      GRUPO IT ARVIC S.A. DE C.V.<br>
      <span class="variable">[REPRESENTANTE LEGAL]</span>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>"EL CONSULTOR"</strong><br>
      <span class="variable">[NOMBRE COMPLETO]</span><br>
      RFC: <span class="variable">[RFC CONSULTOR]</span>
    </div>
  </div>
</body>
</html>
`
  },
  {
    id: 'MACHOTE_CONVENIO_PROYECTO',
    documentType: 'plantilla_convenio_proyecto',
    title: 'Convenio y Anexo de Asignación de Proyecto (Consultor)',
    category: 'Proyectos y Asignaciones',
    targetRole: 'consultor',
    description: 'Anexo específico para vincular a un consultor a un proyecto o bolsa de soporte con tarifas y alcances definidos.',
    fileName: 'ARVIC_Convenio_Anexo_Proyecto_Borrador.doc',
    mimeType: 'application/msword',
    isDraft: true,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Anexo de Asignación por Proyecto - Grupo IT ARVIC</title>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; }
  h1 { text-align: center; color: #0f1d3a; font-size: 16pt; margin-bottom: 5px; }
  h2 { text-align: center; color: #0284c7; font-size: 12pt; margin-top: 0; }
  .table-box { width: 100%; border-collapse: collapse; margin: 20px 0; }
  .table-box th, .table-box td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 10pt; }
  .table-box th { background: #f1f5f9; text-align: left; color: #0f1d3a; }
  .variable { background: #fef08a; padding: 2px 6px; font-weight: bold; }
  .signatures { margin-top: 40px; width: 100%; display: table; }
  .sig-col { display: table-cell; width: 50%; text-align: center; padding: 15px; }
  .sig-line { border-top: 1px solid #334155; width: 80%; margin: 35px auto 5px auto; }
</style>
</head>
<body>
  <h1>ANEXO DE ASIGNACIÓN Y ALCANCE DE PROYECTO</h1>
  <h2>DERIVADO DEL CONTRATO MARCO DE PRESTACIÓN DE SERVICIOS</h2>

  <table class="table-box">
    <tr><th>ID DE PROYECTO:</th><td><span class="variable">[ID_PROYECTO]</span></td></tr>
    <tr><th>NOMBRE DEL PROYECTO:</th><td><span class="variable">[NOMBRE_PROYECTO]</span></td></tr>
    <tr><th>EMPRESA / CLIENTE FINAL:</th><td><span class="variable">[NOMBRE_EMPRESA_CLIENTE]</span></td></tr>
    <tr><th>CONSULTOR ASIGNADO:</th><td><span class="variable">[NOMBRE_CONSULTOR]</span> (ID: <span class="variable">[USR####]</span>)</td></tr>
    <tr><th>MÓDULO / ESPECIALIDAD:</th><td><span class="variable">[MÓDULO_TECNOLÓGICO]</span></td></tr>
    <tr><th>TARIFA PACTADA CONSULTOR:</th><td>$<span class="variable">[0.00]</span> MXN por hora efectiva</td></tr>
    <tr><th>BOLSA / LÍMITE DE HORAS:</th><td><span class="variable">[NÚMERO_HORAS]</span> horas estimadas</td></tr>
    <tr><th>FECHA DE INICIO Y TÉRMINO:</th><td>Del <span class="variable">[DD/MM/AAAA]</span> al <span class="variable">[DD/MM/AAAA]</span></td></tr>
  </table>

  <p><strong>ALCANCE ESPECÍFICO DE ACTIVIDADES:</strong></p>
  <p><span class="variable">[Describir aquí las tareas principales, entregables y módulos a desarrollar o mantener durante la asignación...]</span></p>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>POR "LA EMPRESA"</strong><br>
      GRUPO IT ARVIC S.A. DE C.V.
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>"EL CONSULTOR"</strong><br>
      <span class="variable">[NOMBRE_CONSULTOR]</span>
    </div>
  </div>
</body>
</html>
`
  },
  {
    id: 'MACHOTE_NDA',
    documentType: 'plantilla_nda',
    title: 'Acuerdo de Confidencialidad y No Divulgación (NDA)',
    category: 'Legal y Confidencialidad',
    targetRole: 'ambos',
    description: 'Acuerdo bilateral de confidencialidad para proteger código fuente, secretos industriales e información corporativa.',
    fileName: 'ARVIC_Acuerdo_Confidencialidad_NDA_Borrador.doc',
    mimeType: 'application/msword',
    isDraft: true,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Acuerdo de Confidencialidad NDA - Grupo IT ARVIC</title>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; }
  h1 { text-align: center; color: #0f1d3a; font-size: 16pt; margin-bottom: 5px; }
  h2 { text-align: center; color: #0284c7; font-size: 11pt; margin-top: 0; }
  .variable { background: #fef08a; padding: 2px 6px; font-weight: bold; }
  .signatures { margin-top: 50px; width: 100%; display: table; }
  .sig-col { display: table-cell; width: 50%; text-align: center; padding: 15px; }
  .sig-line { border-top: 1px solid #334155; width: 80%; margin: 35px auto 5px auto; }
</style>
</head>
<body>
  <h1>ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN (NDA)</h1>
  <h2>GRUPO IT ARVIC</h2>

  <p>ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN QUE CELEBRAN POR UNA PARTE <strong>GRUPO IT ARVIC S.A. DE C.V.</strong> Y POR LA OTRA <span class="variable">[NOMBRE DE LA CONTRAPARTE: CONSULTOR O EMPRESA CLIENTE]</span>.</p>

  <p><strong>1. INFORMACIÓN CONFIDENCIAL:</strong> Se considera Información Confidencial todo dato técnico, código fuente, arquitecturas de software, credenciales de acceso, datos personales y financieros compartidos en el marco de los servicios contratados.</p>
  <p><strong>2. OBLIGACIÓN DE NO DIVULGACIÓN:</strong> La Parte Receptora se compromete a no reproducir, publicar, revelar ni transferir dicha información a terceros sin consentimiento previo y por escrito.</p>
  <p><strong>3. VIGENCIA DE LA OBLIGACIÓN:</strong> La obligación de confidencialidad subsistirá durante la relación contractual y por un periodo adicional de 5 (cinco) años contados a partir de su conclusión.</p>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>GRUPO IT ARVIC S.A. DE C.V.</strong>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>LA CONTRAPARTE</strong><br>
      <span class="variable">[NOMBRE O RAZÓN SOCIAL]</span>
    </div>
  </div>
</body>
</html>
`
  },
  {
    id: 'MACHOTE_CONTRATO_CLIENTE',
    documentType: 'plantilla_contrato_cliente',
    title: 'Contrato Marco Comercial de Servicios TI (Cliente / Empresa)',
    category: 'Clientes',
    targetRole: 'cliente',
    description: 'Contrato marco mercantil para la contratación de servicios de soporte tecnológico y asignación de consultoría a clientes.',
    fileName: 'ARVIC_Contrato_Marco_Comercial_Cliente_Borrador.doc',
    mimeType: 'application/msword',
    isDraft: true,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Contrato Marco Comercial de Servicios - Grupo IT ARVIC</title>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; }
  h1 { text-align: center; color: #0f1d3a; font-size: 16pt; margin-bottom: 5px; }
  h2 { text-align: center; color: #0284c7; font-size: 12pt; margin-top: 0; }
  .variable { background: #fef08a; padding: 2px 6px; font-weight: bold; }
  .signatures { margin-top: 50px; width: 100%; display: table; }
  .sig-col { display: table-cell; width: 50%; text-align: center; padding: 15px; }
  .sig-line { border-top: 1px solid #334155; width: 80%; margin: 35px auto 5px auto; }
</style>
</head>
<body>
  <h1>CONTRATO MARCO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS</h1>
  <h2>GRUPO IT ARVIC Y LA EMPRESA CONTRATANTE</h2>

  <p>CONTRATO MARCO QUE CELEBRAN <strong>GRUPO IT ARVIC S.A. DE C.V.</strong> ("EL PROVEEDOR") Y <span class="variable">[RAZÓN SOCIAL DE LA EMPRESA CLIENTE]</span> ("EL CLIENTE"), REPRESENTADA POR <span class="variable">[REPRESENTANTE LEGAL CLIENTE]</span>.</p>

  <p><strong>PRIMERA. SERVICIOS:</strong> EL PROVEEDOR prestará a EL CLIENTE servicios de consultoría, desarrollo de software, mantenimiento y soporte a sistemas conforme a los Anexos SOW que se firmen periódicamente.</p>
  <p><strong>SEGUNDA. TARIFAS Y FACTURACIÓN:</strong> Los servicios se facturarán mensualmente conforme al registro de horas aprobadas y los comprobantes emitidos en el Portal Institucional ARVIC, bajo la tarifa pactada por hora de <span class="variable">[$0.00 MXN]</span> más IVA.</p>
  <p><strong>TERCERA. NIVELES DE SERVICIO (SLA):</strong> Los tiempos de respuesta para tickets de soporte y asignación de especialistas se regirán conforme al catálogo de criticidad acordado en los Anexos de Servicio.</p>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>POR EL PROVEEDOR</strong><br>
      GRUPO IT ARVIC S.A. DE C.V.
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>POR EL CLIENTE</strong><br>
      <span class="variable">[RAZÓN SOCIAL CLIENTE]</span><br>
      RFC: <span class="variable">[RFC CLIENTE]</span>
    </div>
  </div>
</body>
</html>
`
  },
  {
    id: 'MACHOTE_SOW_CLIENTE',
    documentType: 'plantilla_sow_cliente',
    title: 'Anexo de Alcance de Servicios y Bolsa de Horas (SOW Cliente)',
    category: 'Clientes',
    targetRole: 'cliente',
    description: 'Declaración de Trabajo (Statement of Work) para formalizar bolsas de horas de soporte y proyectos específicos con el cliente.',
    fileName: 'ARVIC_Anexo_SOW_Bolsa_Horas_Borrador.doc',
    mimeType: 'application/msword',
    isDraft: true,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Anexo SOW - Declaración de Trabajo - Grupo IT ARVIC</title>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; }
  h1 { text-align: center; color: #0f1d3a; font-size: 16pt; margin-bottom: 5px; }
  h2 { text-align: center; color: #0284c7; font-size: 12pt; margin-top: 0; }
  .table-box { width: 100%; border-collapse: collapse; margin: 20px 0; }
  .table-box th, .table-box td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 10pt; }
  .table-box th { background: #f1f5f9; text-align: left; }
  .variable { background: #fef08a; padding: 2px 6px; font-weight: bold; }
  .signatures { margin-top: 40px; width: 100%; display: table; }
  .sig-col { display: table-cell; width: 50%; text-align: center; padding: 15px; }
  .sig-line { border-top: 1px solid #334155; width: 80%; margin: 35px auto 5px auto; }
</style>
</head>
<body>
  <h1>ANEXO SOW — DECLARACIÓN DE TRABAJO Y BOLSA DE SERVICIOS</h1>
  <h2>GRUPO IT ARVIC</h2>

  <table class="table-box">
    <tr><th>CLIENTE:</th><td><span class="variable">[RAZÓN SOCIAL DE LA EMPRESA]</span></td></tr>
    <tr><th>RFC:</th><td><span class="variable">[RFC CLIENTE]</span></td></tr>
    <tr><th>SERVICIO / PROYECTO:</th><td><span class="variable">[NOMBRE DE PROYECTO O BOLSA DE SOPORTE]</span></td></tr>
    <tr><th>HORAS CONTRATADAS:</th><td><span class="variable">[100]</span> horas mensuales</td></tr>
    <tr><th>TARIFA PACTADA CLIENTE:</th><td>$<span class="variable">[0.00]</span> MXN + IVA por hora</td></tr>
    <tr><th>VIGENCIA DEL PERIODO:</th><td><span class="variable">[FECHA INICIO]</span> a <span class="variable">[FECHA FIN]</span></td></tr>
  </table>

  <p><strong>ENTREGABLES Y SUPERVISIÓN:</strong></p>
  <p>Las horas consumidas se conciliarán mediante el Portal Cliente ARVIC en la vista de Desglose de Horas con justificaciones técnicas y testigos de actividades.</p>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>POR GRUPO IT ARVIC</strong>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <strong>POR EL CLIENTE</strong><br>
      <span class="variable">[REPRESENTANTE AUTORIZADO]</span>
    </div>
  </div>
</body>
</html>
`
  }
];

module.exports = {
  DEFAULT_MACHOTES
};
