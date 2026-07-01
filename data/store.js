/*
 * Facade d'acces aux donnees, adossee a MongoDB (Mongoose).
 * Les noms de fonctions exportees sont stables : server.js et les vues n'ont
 * pas besoin de connaitre le detail de stockage (Mongo, memoire, etc.).
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const { STATUSES, STATUS_FLOW, STATUS_BADGE, CATEGORIES, PRIORITIES, ROLES } = require('./constants');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const hash = (pwd) => bcrypt.hashSync(pwd, 10);
const validId = (id) => mongoose.isValidObjectId(id);

const store = {
  STATUSES,
  STATUS_FLOW,
  STATUS_BADGE,
  CATEGORIES,
  PRIORITIES,
  ROLES,

  // Utilisateurs
  findUserByEmail: (email) => User.findOne({ email: String(email).toLowerCase() }),
  findUserById: (id) => (validId(id) ? User.findById(id) : null),
  createUser: ({ nom, email, password, role }) =>
    User.create({
      nom,
      email,
      passwordHash: hash(password),
      role: role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.ETUDIANT,
    }),
  generateResetToken: async (user) => {
    user.resetToken = crypto.randomBytes(20).toString('hex');
    user.resetTokenExpires = Date.now() + RESET_TOKEN_TTL_MS;
    await user.save();
    return user.resetToken;
  },
  findUserByResetToken: (token) =>
    User.findOne({ resetToken: token, resetTokenExpires: { $gt: Date.now() } }),
  resetPassword: async (user, password) => {
    user.passwordHash = hash(password);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();
  },

  // Reclamations
  allComplaints: () => Complaint.find().sort({ createdAt: -1 }),
  complaintsByAuthor: (userId) => Complaint.find({ auteurId: userId }).sort({ createdAt: -1 }),
  findComplaintById: (id) => (validId(id) ? Complaint.findById(id) : null),
  createComplaint: async ({ titre, description, categorie, priorite, auteurId }) => {
    const seq = await Complaint.countDocuments();
    return Complaint.create({
      ref: 'UR-' + (2601 + seq),
      titre,
      description,
      categorie: CATEGORIES.includes(categorie) ? categorie : 'Autre',
      priorite: PRIORITIES.includes(priorite) ? priorite : 'Normale',
      statut: STATUSES.NOUVEAU,
      auteurId,
    });
  },
  addMessage: async (complaint, { auteurId, role, texte }) => {
    complaint.messages.push({ auteurId, role, texte });
    await complaint.save();
    return complaint.messages[complaint.messages.length - 1];
  },
  changeStatus: async (complaint, nextStatus) => {
    const allowed = STATUS_FLOW[complaint.statut] || [];
    if (!allowed.includes(nextStatus)) return false;
    complaint.statut = nextStatus;
    await complaint.save();
    return true;
  },

  // Statistiques (pour le dashboard admin / Chart.js)
  stats: async () => {
    const byStatus = {};
    Object.values(STATUSES).forEach((s) => (byStatus[s] = 0));
    const byCategory = {};
    CATEGORIES.forEach((c) => (byCategory[c] = 0));

    const [total, ouverts, resolus, utilisateurs, statusAgg, categoryAgg] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ statut: { $in: [STATUSES.NOUVEAU, STATUSES.EN_COURS] } }),
      Complaint.countDocuments({ statut: { $in: [STATUSES.RESOLU, STATUSES.FERME] } }),
      User.countDocuments(),
      Complaint.aggregate([{ $group: { _id: '$statut', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$categorie', count: { $sum: 1 } } }]),
    ]);

    statusAgg.forEach((r) => (byStatus[r._id] = r.count));
    categoryAgg.forEach((r) => (byCategory[r._id] = r.count));

    return { total, ouverts, resolus, utilisateurs, byStatus, byCategory };
  },
};

module.exports = store;
