import nodemailer from 'nodemailer';

let transporter = null;

const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

export const sendMail = async ({ to, subject, text, html }) => {
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP is not configured');
    }
    console.log(`\n[mail preview] to: ${to}\nsubject: ${subject}\n${text}\n`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || `Vaultrix <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
