const { PhoneNumberUtil } = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();

// Valide un numero au format international (ex: "+226 70 11 22 33") selon les
// regles du pays (nombre de chiffres, etc.) via la base de Google (libphonenumber).
// Doublon serveur de la validation deja faite cote client par intl-tel-input.
function isValidPhoneNumber(full) {
  if (!full || typeof full !== 'string') return false;
  try {
    const parsed = phoneUtil.parse(full.trim());
    return phoneUtil.isValidNumber(parsed);
  } catch (e) {
    return false;
  }
}

module.exports = { isValidPhoneNumber };
