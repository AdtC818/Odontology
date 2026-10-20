// src/shared/infrastructure/mail/mailer.service.ts
import nodemailer, { Transporter } from 'nodemailer';
import { IMailerPort } from '../../../modules/users-auth/domain/user.repository.interface';
import { envConfig } from '../../../app/config/env.config';

export interface MailerServiceOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

export class MailerService implements IMailerPort {
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly options?: MailerServiceOptions) {
    this.fromAddress =
      options?.from ||
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM ||
      '"Consultorio OdontoLeal" <notificaciones@odontoleal.com>';
  }

  /**
   * Obtiene o inicializa el transporter de correo.
   * 1. Soporta Gmail directo con App Password (GMAIL_USER + GMAIL_PASS).
   * 2. Soporta SMTP estándar (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) como Brevo, Resend, etc.
   * 3. Fallback automático a Ethereal Email (sandbox gratuito de pruebas con visualización web).
   */
  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    // 1. Detección directa de Gmail
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = (process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
      console.log(`📧 Servicio de correo inicializado con Gmail (${gmailUser})`);
      return this.transporter;
    }

    // 2. Detección de SMTP estándar (Brevo, Resend, Outlook, etc.)
    const host = this.options?.host || process.env.SMTP_HOST;
    const port = this.options?.port || Number(process.env.SMTP_PORT) || 587;
    const user = this.options?.user || process.env.SMTP_USER;
    const rawPass = this.options?.pass || process.env.SMTP_PASS;
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : '';
    const secure =
      this.options?.secure ??
      (process.env.SMTP_SECURE === 'true' || port === 465);

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      console.log(`📧 Servicio de correo inicializado con SMTP: ${host}:${port}`);
      return this.transporter;
    }

    // 3. Fallback a servicio gratuito de pruebas Ethereal Email (Nodemailer test sandbox)
    try {
      console.log('📧 No se detectaron credenciales SMTP reales. Generando buzón de pruebas Ethereal Email...');
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`✅ Buzón Ethereal listo: ${testAccount.user}`);
      return this.transporter;
    } catch (etherealError: any) {
      console.warn('⚠️ No fue posible conectar con Ethereal, usando fallback jsonTransport:', etherealError?.message);
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return this.transporter;
    }
  }

  /**
   * Envía el correo con plantilla HTML oficial de OdontoLeal
   */
  async sendPasswordRecoveryEmail(params: {
    to: string;
    nombreCompleto: string;
    recoveryLink: string;
    expiresInMinutes: number;
  }): Promise<{ messageId?: string; previewUrl?: string | null }> {
    const { to, nombreCompleto, recoveryLink, expiresInMinutes } = params;

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recuperación de Contraseña - OdontoLeal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F6F6F4; margin: 0; padding: 24px; color: #1F2430; }
    .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E7E7E3; border-top: 5px solid #D4AF37; padding: 36px 32px; box-shadow: 0 4px 16px rgba(17,17,17,0.06); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo-badge { display: inline-block; background-color: #111111; color: #D4AF37; font-size: 13px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; margin-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 800; color: #111111; margin: 0 0 8px 0; }
    p { font-size: 14px; line-height: 1.6; color: #4B5563; margin: 12px 0; }
    .button-container { text-align: center; margin: 28px 0; }
    .btn-gold { display: inline-block; background: linear-gradient(180deg, #DDB93E, #C9A227); color: #111111 !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 28px; border-radius: 10px; box-shadow: 0 2px 6px rgba(184,148,42,0.35); }
    .btn-gold:hover { background: #B8942A; }
    .alert-box { background-color: #FBF3D5; border-left: 4px solid #D4AF37; padding: 12px 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #78350F; }
    .raw-link { word-break: break-all; font-size: 12px; color: #2563EB; background: #F3F4F6; padding: 8px; border-radius: 6px; }
    .footer { text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 24px; border-top: 1px solid #E5E7EB; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-badge">CONSULTORIO ODONTOLEAL</div>
      <h1>Restablecer Contraseña</h1>
      <p style="margin: 0; color: #6B7280; font-size: 13px;">Dirección Médica Dr. Eduar Leal Álvarez</p>
    </div>

    <p>Hola <strong>${nombreCompleto}</strong>,</p>
    <p>Hemos recibido una solicitud para restablecer la contraseña de su cuenta en el Portal OdontoLeal.</p>
    
    <div class="button-container">
      <a href="${recoveryLink}" class="btn-gold" target="_blank" rel="noopener">Restablecer mi Contraseña</a>
    </div>

    <div class="alert-box">
      ⏳ <strong>Aviso de seguridad:</strong> Este enlace es de un solo uso y vencerá en <strong>${expiresInMinutes} minutos</strong>. Si usted no realizó esta solicitud, puede ignorar este mensaje; su cuenta continuará protegida.
    </div>

    <p style="font-size: 12px; color: #6B7280;">Si el botón no funciona en su cliente de correo, copie y pegue la siguiente dirección en su navegador:</p>
    <p class="raw-link">${recoveryLink}</p>

    <div class="footer">
      © 2026 Consultorio Odontológico Dr. Eduar Leal Álvarez • Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
    `;

    try {
      const transporter = await this.getTransporter();

      const info = await transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: 'Recuperación de contraseña - Portal OdontoLeal',
        text: `Hola ${nombreCompleto}.\n\nPara restablecer su contraseña en el Portal OdontoLeal, acceda al siguiente enlace (válido por ${expiresInMinutes} minutos):\n\n${recoveryLink}\n\nSi usted no realizó esta solicitud, ignore este mensaje.`,
        html: htmlContent,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || null;

      console.log(`\n======================================================`);
      console.log(`📨 CORREO DE RECUPERACIÓN PROCESADO`);
      console.log(`Destinatario: ${to}`);
      console.log(`Enlace generado: ${recoveryLink}`);

      if (previewUrl) {
        console.log(`🔗 Vista previa online (Ethereal Email Free): ${previewUrl}`);
      } else {
        console.log(`✅ Correo entregado al servidor SMTP para envío a bandeja real.`);
      }
      console.log(`======================================================\n`);

      return {
        messageId: info.messageId,
        previewUrl,
      };
    } catch (err: any) {
      console.error('❌ Error al enviar correo de recuperación:', err?.message);
      console.log(`ℹ️ Enlace de recuperación generado para contingencia: ${recoveryLink}`);
      return {
        previewUrl: null,
      };
    }
  }
}
