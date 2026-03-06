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
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                
                <!-- Header Corporativo -->
                <tr>
                  <td style="background-color: #1e3a8a; padding: 28px 40px; text-align: center;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            GRUPO IT ARVIC
                          </h1>
                          <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">
                            Portal de Gestión
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Contenido Principal -->
                <tr>
                  <td style="padding: 40px 40px 32px;">
                    
                    <!-- Saludo -->
                    <p style="color: #1e293b; font-size: 16px; margin: 0 0 6px; font-weight: 600; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                      Estimado/a ${userName},
                    </p>
                    
                    <!-- Mensaje principal -->
                    <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 16px 0 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                      Hemos recibido una solicitud para restablecer la contraseña asociada a su cuenta en el Portal de Gestión ARVIC.
                    </p>
                    <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 12px 0 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                      Para proceder con el restablecimiento, haga clic en el siguiente botón:
                    </p>

                    <!-- Botón de acción -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 28px 0;">
                          <a href="${resetUrl}" 
                             style="display: inline-block; background-color: #1e3a8a; color: #ffffff; text-decoration: none; padding: 14px 48px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            Restablecer contraseña
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Separador -->
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 8px 0 24px;">

                    <!-- Información de seguridad -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: #f8fafc; border-left: 3px solid #1e3a8a; padding: 16px 20px; border-radius: 0 4px 4px 0;">
                          <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            <strong style="color: #1e293b;">Información importante:</strong>
                          </p>
                          <ul style="color: #64748b; font-size: 13px; margin: 8px 0 0; padding-left: 20px; line-height: 1.8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            <li>Este enlace tiene una validez de <strong style="color: #1e293b;">1 hora</strong> a partir de su generación.</li>
                            <li>Si usted no realizó esta solicitud, puede ignorar este correo de manera segura.</li>
                            <li>Su contraseña actual permanecerá sin cambios hasta que complete el proceso.</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <!-- URL alternativa -->
                    <p style="color: #94a3b8; font-size: 11px; margin: 24px 0 0; line-height: 1.5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                      Si el botón no funciona correctamente, copie y pegue la siguiente dirección en su navegador:
                    </p>
                    <p style="margin: 6px 0 0;">
                      <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all; font-size: 11px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            Este es un correo electrónico automático generado por el sistema del Portal de Gestión ARVIC. 
                            Por favor, no responda a este mensaje.
                          </p>
                          <p style="color: #cbd5e1; font-size: 11px; margin: 12px 0 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            © ${currentYear} Grupo IT ARVIC — Todos los derechos reservados.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

              <!-- Nota de privacidad -->
              <p style="color: #94a3b8; font-size: 10px; margin: 16px 0 0; text-align: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                Este correo fue enviado a ${toEmail} porque se solicitó un restablecimiento de contraseña para esta cuenta.
              </p>
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

module.exports = { sendPasswordResetEmail };
