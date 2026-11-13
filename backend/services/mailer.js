const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM
} = require('../config/env');

let transport = null;

function getTransport() {
  if (transport) return transport;
  // Chargement differe : sans SMTP configure, le serveur demarre sans la dependance.
  const nodemailer = require('nodemailer');
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    requireTLS: SMTP_PORT !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
  return transport;
}

// Tests uniquement : remplace le transport SMTP par un double sans reseau.
function setTransport(customTransport) {
  transport = customTransport;
}

async function sendOtpEmail({ to, code, ttlMinutes }) {
  await getTransport().sendMail({
    from: { name: 'EVC Melissa', address: MAIL_FROM },
    to,
    subject: 'Votre code de connexion EVC Melissa',
    text: [
      'Bonjour,',
      '',
      `Votre code de vérification : ${code}`,
      '',
      `Il est valable ${ttlMinutes} minutes et ne sert qu'une fois.`,
      "Si vous n'avez pas demandé ce code, ignorez ce message.",
      '',
      'EVC Melissa'
    ].join('\n')
  });
}

module.exports = {
  sendOtpEmail,
  setTransport
};
