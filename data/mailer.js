const nodemailer = require('nodemailer');

// Transport Gmail SMTP : necessite un "mot de passe d'application" Google
// (pas le mot de passe du compte), genere avec la validation en 2 etapes activee.
const transporter =
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      })
    : null;

// N'interrompt jamais le flux principal (creation de reclamation, etc.) :
// une erreur d'envoi est juste loguee, pas propagee.
async function envoyerEmail({ to, subject, text }) {
  if (!transporter) {
    console.warn('Email non envoye (EMAIL_USER/EMAIL_PASS absents du .env) :', subject);
    return;
  }
  try {
    await transporter.sendMail({ from: `"U-Report" <${process.env.EMAIL_USER}>`, to, subject, text });
  } catch (err) {
    console.error("Echec d'envoi d'email :", err.message);
  }
}

module.exports = { envoyerEmail };
