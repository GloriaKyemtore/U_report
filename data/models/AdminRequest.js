const mongoose = require('mongoose');

// Demande d'acces administrateur : soumise par un futur admin, approuvee ou
// refusee par un administrateur existant depuis son tableau de bord.
const adminRequestSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    telephone: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    motif: { type: String, required: true },
    statut: { type: String, enum: ['en_attente', 'approuvee', 'refusee'], default: 'en_attente' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminRequest', adminRequestSchema);
