const nodemailer = require('nodemailer');

// Crear transporter de Gmail
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
 * Envía un email de recuperación de contraseña
 * @param {string} toEmail - Email del destinatario
 * @param {string} resetUrl - URL completa con el token de reset
 * @param {string} userName - Nombre del usuario
 */
async function sendPasswordResetEmail(toEmail, resetUrl, userName) {
  const currentYear = new Date().getFullYear();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || `Portal ARVIC <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Solicitud de restablecimiento de contraseña — Portal ARVIC',
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 50px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 2px;">
                      GRUPO IT ARVIC
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #0f172a; font-size: 18px; margin: 0 0 15px; font-weight: 600;">
                      Recuperación de Acceso
                    </h2>
                    
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 25px;">
                      Hola <strong>${userName}</strong>,<br><br>
                      Hemos recibido una solicitud formal para restablecer la credencial de acceso de su cuenta en el Portal de Gestión.
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 10px 0 35px;">
                          <a href="${resetUrl}" 
                             style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.5px; transition: background-color 0.2s;">
                            Restablecer mi contraseña
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                      Este enlace seguro expirará en 1 hora. Si usted no solicitó este cambio, puede ignorar este mensaje; su cuenta sigue estando protegida.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 25px 40px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">
                      © ${currentYear} Grupo IT ARVIC. Todos los derechos reservados.
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
  const toEmail = process.env.EMAIL_USER; // Enviar a la misma cuenta de servicio o a otra configurada
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || `Portal ARVIC <${process.env.EMAIL_USER}>`,
    to: toEmail,
    replyTo: userEmail,
    subject: `[Soporte Técnico] Nueva solicitud de ${fromUser}`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"></head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 50px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 2px;">
                      SOPORTE TÉCNICO
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #0f172a; font-size: 16px; margin: 0 0 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Nuevo Requerimiento
                    </h2>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Usuario Solicitante</span><br>
                          <strong style="color: #1e293b; font-size: 15px;">${fromUser}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Correo de Contacto</span><br>
                          <strong style="color: #0284c7; font-size: 15px;">${userEmail}</strong>
                        </td>
                      </tr>
                    </table>

                    <div style="background-color: #f1f5f9; border-left: 4px solid #0284c7; padding: 20px; border-radius: 0 8px 8px 0;">
                      <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Descripción del Problema</span>
                      <p style="color: #1e293b; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">
                      Portal de Gestión ARVIC — Notificación Automática
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
  console.log('📧 Email de soporte enviado | MessageId:', info.messageId);
  return info;
}

module.exports = { sendPasswordResetEmail, sendSupportEmail };
