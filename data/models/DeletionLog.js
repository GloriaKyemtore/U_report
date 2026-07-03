const mongoose = require('mongoose');
const { ROLES } = require('../constants');

// Trace des comptes supprimes par leur titulaire, avec la raison indiquee
const deletionLogSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    raison: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeletionLog', deletionLogSchema);
