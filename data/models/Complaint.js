const mongoose = require('mongoose');
const { STATUSES, CATEGORIES, PRIORITIES, ROLES } = require('../constants');

const messageSchema = new mongoose.Schema(
  {
    auteurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    texte: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const complaintSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, unique: true },
    titre: { type: String, required: true },
    description: { type: String, required: true },
    categorie: { type: String, enum: CATEGORIES, default: 'Autre' },
    priorite: { type: String, enum: PRIORITIES, default: 'Normale' },
    statut: { type: String, enum: Object.values(STATUSES), default: STATUSES.NOUVEAU },
    auteurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
