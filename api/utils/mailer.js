const nodemailer = require('nodemailer');

// Crear transporter de Gmail con configuración optimizada para entrega
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verificar conexión al iniciar
transporter.verify()
  .then(() => console.log('✅ Servidor de email conectado (Gmail)'))
  .catch(err => console.error('❌ Error conectando email:', err.message));

/**
 * Envía un email de recuperación de contraseña optimizado para bandeja de entrada principal
 * @param {string} toEmail - Email del destinatario
 * @param {string} resetUrl - URL completa con el token de reset
 * @param {string} userName - Nombre del usuario
 */
async function sendPasswordResetEmail(toEmail, resetUrl, userName) {
  const currentYear = new Date().getFullYear();
  const senderEmail = process.env.EMAIL_USER || 'hecmanloans@gmail.com';
  
  const mailOptions = {
    from: `"Grupo IT ARVIC" <${senderEmail}>`,
    to: toEmail,
    replyTo: senderEmail,
    subject: 'Restablecimiento de contraseña - Portal Grupo IT ARVIC',
    text: `Hola ${userName},\n\nHemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Portal Grupo IT ARVIC.\n\nPara restablecer tu contraseña, ingresa al siguiente enlace:\n${resetUrl}\n\nEste enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este mensaje.\n\nAtentamente,\nGrupo IT ARVIC\nPortal de Gestión`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecimiento de Contraseña</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                
                <!-- Encabezado Corporativo -->
                <tr>
                  <td style="background-color: #0f172a; padding: 28px 36px; text-align: left; border-bottom: 3px solid #0284c7;">
                    <span style="color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                      Grupo IT ARVIC
                    </span>
                    <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Portal de Servicios y Gestión Corporativa</p>
                  </td>
                </tr>

                <!-- Contenido -->
                <tr>
                  <td style="padding: 36px 36px 28px 36px;">
                    <h2 style="color: #1e293b; font-size: 17px; margin: 0 0 16px 0; font-weight: 600;">
                      Recuperación de Contraseña
                    </h2>
                    
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                      Hola <strong>${userName}</strong>,<br><br>
                      Se ha generado una solicitud para restablecer la contraseña de acceso a tu cuenta en el Portal ARVIC.
                    </p>

                    <!-- Botón CTA Principal -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" 
                             style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 6px; font-size: 14px; font-weight: 600; text-align: center;">
                            Restablecer Contraseña
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 12px 0;">
                      Si el botón anterior no funciona en tu gestor de correo, copia y pega el siguiente enlace directo en tu navegador:
                    </p>
                    <p style="word-break: break-all; font-size: 12px; line-height: 1.4; background-color: #f8fafc; padding: 10px 12px; border-radius: 4px; border: 1px solid #e2e8f0; color: #0284c7; margin: 0 0 24px 0;">
                      ${resetUrl}
                    </p>

                    <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; padding-top: 16px; border-top: 1px solid #f1f5f9;">
                      Por seguridad, este enlace es válido durante 1 hora. Si no realizaste esta solicitud, puedes desestimar este correo con total tranquilidad.
                    </p>
                  </td>
                </tr>

                <!-- Pie de Página -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
                      © ${currentYear} Grupo IT ARVIC. Todos los derechos reservados.<br>
                      Mensaje transaccional de seguridad enviado a ${toEmail}.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    headers: {
      'X-Priority': '3',
      'Importance': 'normal',
      'Auto-Submitted': 'auto-generated'
    }
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('📧 Email de reset enviado a:', toEmail, '| MessageId:', info.messageId);
  return info;
}

/**
 * Envía un email de soporte desde el Chatbot
 * @param {string} fromUser - Nombre del usuario que solicita soporte
 * @param {string} userEmail - Email del usuario que solicita soporte
 * @param {string} message - El mensaje o problema descrito
 */
async function sendSupportEmail(fromUser, userEmail, message) {
  const currentYear = new Date().getFullYear();
  const toEmail = process.env.EMAIL_USER || 'hecmanloans@gmail.com';
  const senderEmail = process.env.EMAIL_USER || 'hecmanloans@gmail.com';
  
  const mailOptions = {
    from: `"Grupo IT ARVIC" <${senderEmail}>`,
    to: toEmail,
    replyTo: userEmail,
    subject: `Solicitud de Soporte Técnico - ${fromUser}`,
    text: `Solicitud de Soporte Técnico\n\nUsuario: ${fromUser}\nCorreo: ${userEmail}\n\nMensaje:\n${message}\n\n--\nPortal Grupo IT ARVIC`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"></head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="background-color: #0f172a; padding: 24px 36px; text-align: left; border-bottom: 3px solid #0284c7;">
                    <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 1px;">SOPORTE TÉCNICO ARVIC</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 36px;">
                    <p style="color: #475569; font-size: 14px; margin: 0 0 15px 0;"><strong>Usuario solicitante:</strong> ${fromUser}</p>
                    <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0;"><strong>Correo de contacto:</strong> <a href="mailto:${userEmail}" style="color: #0284c7;">${userEmail}</a></p>
                    <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 15px; border-radius: 4px; color: #1e293b; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">
                      ${message}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8fafc; padding: 16px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">Portal ARVIC © ${currentYear}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('📧 Email de soporte enviado | MessageId:', info.messageId);
  return info;
}

/**
 * Envía un email de activación de cuenta / onboarding optimizado para Bandeja de Entrada Principal
 * @param {string} toEmail - Email del destinatario
 * @param {string} activationUrl - URL con token de activación
 * @param {string} userName - Nombre del usuario
 * @param {string} role - Rol asignado ('consultor', 'cliente', 'admin')
 */
async function sendAccountActivationEmail(toEmail, activationUrl, userName, role = 'consultor') {
  const currentYear = new Date().getFullYear();
  const senderEmail = process.env.EMAIL_USER || 'hecmanloans@gmail.com';
  const roleName = role === 'cliente' ? 'Cliente' : role === 'admin' ? 'Administrador' : 'Consultor';
  
  const mailOptions = {
    from: `"Grupo IT ARVIC" <${senderEmail}>`,
    to: toEmail,
    replyTo: senderEmail,
    subject: `Activación de cuenta - Portal Grupo IT ARVIC`,
    text: `Hola ${userName},\n\nSe ha creado tu cuenta en el Portal Grupo IT ARVIC con el rol de ${roleName}.\n\nPara activar tu cuenta y configurar tu contraseña personal, por favor ingresa al siguiente enlace seguro:\n${activationUrl}\n\nEste enlace es de uso único. Una vez activada tu cuenta, podrás acceder a tus servicios, captura de horas y expediente digital.\n\nAtentamente,\nGrupo IT ARVIC\nPortal de Gestión Corporativa`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Activación de Cuenta</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                
                <!-- Encabezado Corporativo -->
                <tr>
                  <td style="background-color: #0f172a; padding: 28px 36px; text-align: left; border-bottom: 3px solid #0284c7;">
                    <span style="color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                      Grupo IT ARVIC
                    </span>
                    <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Portal de Servicios y Gestión Corporativa</p>
                  </td>
                </tr>

                <!-- Contenido -->
                <tr>
                  <td style="padding: 36px 36px 28px 36px;">
                    <h2 style="color: #1e293b; font-size: 17px; margin: 0 0 16px 0; font-weight: 600;">
                      Bienvenido al Portal ARVIC
                    </h2>
                    
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                      Hola <strong>${userName}</strong>,<br><br>
                      Se ha generado tu registro en el <strong>Portal Grupo IT ARVIC</strong> con el perfil de <strong>${roleName}</strong>.
                    </p>

                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                      Para completar el proceso de alta y definir tu contraseña de acceso, haz clic en el siguiente botón:
                    </p>

                    <!-- Botón CTA Principal -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                      <tr>
                        <td align="center">
                          <a href="${activationUrl}" 
                             style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 6px; font-size: 14px; font-weight: 600; text-align: center;">
                            Activar Cuenta y Definir Contraseña
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0;">
                      Si el botón anterior no responde en tu gestor de correo, copia y pega el siguiente enlace directo en tu navegador:
                    </p>
                    <p style="word-break: break-all; font-size: 12px; line-height: 1.4; background-color: #f8fafc; padding: 10px 12px; border-radius: 4px; border: 1px solid #e2e8f0; color: #0284c7; margin: 0 0 24px 0;">
                      ${activationUrl}
                    </p>

                    <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; padding-top: 16px; border-top: 1px solid #f1f5f9;">
                      Este enlace es de un solo uso y exclusivo para la activación inicial de tu cuenta. Si no reconoces este registro, puedes comunicarte con el área de soporte de Grupo IT ARVIC.
                    </p>
                  </td>
                </tr>

                <!-- Pie de Página -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
                      © ${currentYear} Grupo IT ARVIC. Todos los derechos reservados.<br>
                      Mensaje transaccional enviado a ${toEmail} para la activación de usuario.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    headers: {
      'X-Priority': '3',
      'Importance': 'normal',
      'Auto-Submitted': 'auto-generated'
    }
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('📧 Email de activación enviado a:', toEmail, '| MessageId:', info.messageId);
  return info;
}

/**
 * Notificación de Estado de Reporte de Horas (Aprobado o Rechazado)
 */
async function sendReportStatusEmail({ toEmail, userName, status, hours, projectName, feedback = null, date = null }) {
  try {
    if (!toEmail) return null;
    const currentYear = new Date().getFullYear();
    const senderEmail = process.env.EMAIL_USER || 'hecmanloans@gmail.com';
    const isApproved = status === 'Aprobado';
    const statusColor = isApproved ? '#16a34a' : '#dc2626';
    const statusBg = isApproved ? '#dcfce7' : '#fee2e2';
    const statusLabel = isApproved ? 'Horas Aprobadas' : 'Reporte con Observaciones';
    const dateFormatted = date ? new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Reciente';

    const mailOptions = {
      from: `"Grupo IT ARVIC - Gestión" <${senderEmail}>`,
      to: toEmail,
      replyTo: senderEmail,
      subject: `${statusLabel}: ${hours}h en ${projectName || 'Servicio'} - Portal ARVIC`,
      text: `Hola ${userName},\n\nTu reporte de ${hours} hora(s) para "${projectName || 'Servicio'}" ha sido marcado como: ${status}.\n${feedback ? `\nObservaciones:\n${feedback}\n` : ''}\nPuedes consultar el detalle en el Portal de Consultores.\n\nAtentamente,\nGrupo IT ARVIC`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"></head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 35px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #0284c7;">
                      <span style="color: #ffffff; font-size: 17px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                        Grupo IT ARVIC
                      </span>
                      <p style="color: #94a3b8; font-size: 11px; margin: 3px 0 0 0;">Actualización de Registro de Horas</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 32px;">
                      <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0;">
                        Hola <strong>${userName}</strong>,
                      </p>
                      <div style="background-color: ${statusBg}; border-left: 4px solid ${statusColor}; padding: 14px 18px; border-radius: 6px; margin: 0 0 20px 0;">
                        <span style="display: block; font-size: 16px; font-weight: 700; color: ${statusColor}; margin-bottom: 4px;">
                          ${status === 'Aprobado' ? '✓ Reporte Aprobado' : '✕ Reporte Rechazado / Requiere Corrección'}
                        </span>
                        <span style="font-size: 13px; color: #334155;">
                          Tu reporte de <strong>${hours} hora(s)</strong> para <strong>${projectName || 'el servicio asignado'}</strong> correspondiente a la fecha <em>${dateFormatted}</em> ha sido evaluado por el administrador.
                        </span>
                      </div>

                      ${feedback ? `
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
                          <strong style="color: #334155; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">
                            Observaciones del Administrador:
                          </strong>
                          <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5; font-style: italic;">
                            "${feedback}"
                          </p>
                        </div>
                      ` : ''}

                      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
                        ${isApproved 
                          ? 'Estas horas han sido consolidadas satisfactoriamente para tu próximo corte de honorarios.' 
                          : 'Por favor ingresa a tu portal para ajustar la descripción u horas y reenviarlo a revisión.'}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                        © ${currentYear} Grupo IT ARVIC. Notificación transaccional del sistema.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email de estatus de reporte enviado a:', toEmail, '| MessageId:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Error enviando email de estatus de reporte:', err.message);
    return null;
  }
}

/**
 * Notificación de Documento / Convenio / SOW pendiente de firma electrónica
 */
async function sendContractPendingSignEmail({ toEmail, recipientName, documentTitle, projectName, portalUrl = 'https://portal.grupoitarvic.com' }) {
  try {
    if (!toEmail) return null;
    const currentYear = new Date().getFullYear();
    const senderEmail = process.env.EMAIL_USER || 'hecmanloans@gmail.com';

    const mailOptions = {
      from: `"Grupo IT ARVIC - Legal" <${senderEmail}>`,
      to: toEmail,
      replyTo: senderEmail,
      subject: `Firma requerida: ${documentTitle} - Portal ARVIC`,
      text: `Estimado(a) ${recipientName},\n\nSe ha emitido un nuevo documento legal pendiente de tu formalización y firma electrónica:\n\nDocumento: ${documentTitle}\nProyecto/Servicio: ${projectName || 'Asignación'}\n\nPor favor ingresa a tu portal en el apartado "Mis Contratos y Convenios" o "Expediente Digital" para revisar la versión en PDF oficial o Word y registrar tu firma electrónica:\n${portalUrl}\n\nAtentamente,\nDirección Jurídica y Operativa\nGrupo IT ARVIC`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"></head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 35px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #0284c7;">
                      <span style="color: #ffffff; font-size: 17px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                        Grupo IT ARVIC
                      </span>
                      <p style="color: #94a3b8; font-size: 11px; margin: 3px 0 0 0;">Formalización Contractual Electrónica</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 32px;">
                      <h2 style="color: #0f172a; font-size: 16px; margin: 0 0 14px 0;">
                        Documento Legal Listo para Firma
                      </h2>
                      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 18px 0;">
                        Estimado(a) <strong>${recipientName}</strong>,<br><br>
                        Se ha generado formalmente el documento <strong>${documentTitle}</strong> asociado al proyecto/servicio <strong>${projectName || 'asignado'}</strong>.
                      </p>

                      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 14px; margin-bottom: 22px;">
                        <span style="color: #1d4ed8; font-weight: 600; font-size: 13px; display: block; margin-bottom: 4px;">
                          <i class="fa-solid fa-file-contract"></i> Validez y Formalización:
                        </span>
                        <p style="margin: 0; color: #1e3a8a; font-size: 12px; line-height: 1.5;">
                          Puedes descargar la versión en <strong>PDF oficial con membrete</strong> o en <strong>Word (.doc)</strong> directamente desde tu portal, así como formalizar mediante el panel de firma electrónica.
                        </p>
                      </div>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 15px 0 25px 0;">
                        <tr>
                          <td align="center">
                            <a href="${portalUrl}" 
                               style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                              Ir a Firmar Documento
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
                        Este documento cuenta con cadena de integridad digital. Si tienes dudas respecto a las cláusulas o tarifas pactadas, contáctanos a través del chat interno del portal.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                        © ${currentYear} Grupo IT ARVIC. Aviso legal y contractual confidencial.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email de solicitud de firma enviado a:', toEmail, '| MessageId:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Error enviando email de solicitud de firma:', err.message);
    return null;
  }
}

/**
 * Notificación al Administrador cuando un documento es formalizado/firmado
 */
async function sendContractSignedNotificationToAdmin({ signerName, signerRole, documentTitle, projectName, toEmail = null }) {
  try {
    const targetEmail = toEmail || process.env.EMAIL_USER || 'hecmanloans@gmail.com';
    const currentYear = new Date().getFullYear();
    const senderEmail = process.env.EMAIL_USER || 'hecmanloans@gmail.com';

    const mailOptions = {
      from: `"Portal ARVIC - Alertas" <${senderEmail}>`,
      to: targetEmail,
      replyTo: senderEmail,
      subject: `[Firma Registrada] ${signerName} ha firmado: ${documentTitle}`,
      text: `Notificación para Administración:\n\nEl usuario ${signerName} (${signerRole}) ha formalizado y firmado electrónicamente el documento:\n- Documento: ${documentTitle}\n- Proyecto: ${projectName || 'N/A'}\n- Fecha: ${new Date().toLocaleString('es-MX')}\n\nPuedes consultar el documento firmado en el panel de Expedientes de Administración.\n\n--\nPortal Grupo IT ARVIC`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"></head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="background-color: #0f172a; padding: 20px 30px; border-bottom: 3px solid #16a34a;">
                      <span style="color: #ffffff; font-size: 16px; font-weight: 700;">ALERTA ADMINISTRATIVA: FIRMA DE CONTRATO</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 30px;">
                      <p style="color: #1e293b; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
                        Se ha registrado una nueva formalización electrónica con éxito en el sistema:
                      </p>
                      <ul style="color: #475569; font-size: 13px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                        <li><strong>Firmante:</strong> ${signerName} (${signerRole})</li>
                        <li><strong>Documento:</strong> ${documentTitle}</li>
                        <li><strong>Proyecto / Servicio:</strong> ${projectName || 'General'}</li>
                        <li><strong>Fecha de formalización:</strong> ${new Date().toLocaleString('es-MX')}</li>
                      </ul>
                      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; color: #166534; font-size: 12px;">
                        ✓ El estatus del documento ha cambiado a <strong>Formalizado / Firmado</strong> y está disponible para consulta o descarga en el panel de control.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8fafc; padding: 14px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #94a3b8; font-size: 11px; margin: 0;">Portal ARVIC © ${currentYear}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Notificación de firma enviada a admin:', targetEmail, '| MessageId:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Error enviando email de notificación de firma a admin:', err.message);
    return null;
  }
}

module.exports = { 
  sendPasswordResetEmail, 
  sendSupportEmail, 
  sendAccountActivationEmail,
  sendReportStatusEmail,
  sendContractPendingSignEmail,
  sendContractSignedNotificationToAdmin
};

