const mongoose = require('mongoose');
const { ROLES } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    telephone: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.ETUDIANT },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
