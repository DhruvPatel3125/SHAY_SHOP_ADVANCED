const nodemailer = require('nodemailer');

// Create transporter using env-configured SMTP (Gmail recommended here)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465 (SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Fix: allow self-signed/mitm corporate proxies; set to true in trusted envs only
    rejectUnauthorized: false,
  },
});

// Simple wrapper to send an email
async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { transporter, sendMail };