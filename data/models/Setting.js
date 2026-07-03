const mongoose = require('mongoose');

// Stockage cle/valeur generique pour des reglages globaux (ex: code d'invitation admin)
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model('Setting', settingSchema);
