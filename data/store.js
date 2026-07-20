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
const AdminRequest = require('./models/AdminRequest');
const DeletionLog = require('./models/DeletionLog');
const { STATUSES, STATUS_FLOW, STATUS_BADGE, CATEGORIES, PRIORITIES, ROLES } = require('./constants');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PAGE_SIZE = 10; // reclamations affichees par page dans les tableaux de bord
const hash = (pwd) => bcrypt.hashSync(pwd, 10);
const validId = (id) => mongoose.isValidObjectId(id);
const unreadField = (user) => (user.role === ROLES.ADMIN ? 'nonLuAdmin' : 'nonLuEtudiant');
const unreadFilter = (user) =>
  user.role === ROLES.ADMIN ? { nonLuAdmin: true } : { auteurId: user.id, nonLuEtudiant: true };

// Recupere une page de reclamations correspondant a `filter`, triees de la plus
// recente a la plus ancienne. Renvoie aussi le total et le nombre de pages pour
// construire la navigation. `page` est ramene dans [1, pages] pour rester valide
// meme si le client demande une page hors limites.
async function pageOfComplaints(filter, page) {
  const total = await Complaint.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, parseInt(page, 10) || 1), pages);
  const items = await Complaint.find(filter)
    .sort({ createdAt: -1 })
    .skip((current - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);
  return { items, total, page: current, pages };
}

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
  createUser: ({ nom, email, telephone, password, role }) =>
    User.create({
      nom,
      email,
      telephone: telephone || '',
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
  verifyPassword: (user, password) => bcrypt.compareSync(password || '', user.passwordHash),
  // Mise a jour du profil par l'utilisateur lui-meme (nom, telephone, et
  // eventuellement mot de passe). L'email n'est pas modifiable (identifiant).
  updateProfile: async (user, { nom, telephone, newPassword }) => {
    if (nom) user.nom = nom;
    user.telephone = telephone || '';
    if (newPassword) user.passwordHash = hash(newPassword);
    await user.save();
    return user;
  },
  countAdmins: () => User.countDocuments({ role: ROLES.ADMIN }),
  // Suppression definitive du compte a la demande de son titulaire : on garde
  // une trace (nom/email/role/raison) et on retire ses reclamations si etudiant
  // (un admin n'est jamais auteur de reclamation).
  deleteUserAccount: async (user, raison) => {
    await DeletionLog.create({ nom: user.nom, email: user.email, role: user.role, raison });
    if (user.role === ROLES.ETUDIANT) {
      await Complaint.deleteMany({ auteurId: user._id });
    }
    await user.deleteOne();
  },

  // Reclamations
  // Listes completes (sans pagination) : servent a l'export PDF et aux stats.
  allComplaints: (statut) => Complaint.find(statut ? { statut } : {}).sort({ createdAt: -1 }),
  complaintsByAuthor: (userId, statut) =>
    Complaint.find({ auteurId: userId, ...(statut ? { statut } : {}) }).sort({ createdAt: -1 }),
  // Versions paginees pour l'affichage des tableaux de bord. Renvoient les
  // reclamations de la page demandee + de quoi construire la navigation.
  allComplaintsPage: (statut, page) => pageOfComplaints(statut ? { statut } : {}, page),
  complaintsByAuthorPage: (userId, statut, page) =>
    pageOfComplaints({ auteurId: userId, ...(statut ? { statut } : {}) }, page),
  findComplaintById: (id) => (validId(id) ? Complaint.findById(id) : null),
  createComplaint: async ({ titre, description, universite, filiere, telephone, categorie, priorite, auteurId }) => {
    const seq = await Complaint.countDocuments();
    return Complaint.create({
      ref: 'UR-' + (2601 + seq),
      titre,
      description,
      universite,
      filiere,
      telephone: telephone || '',
      categorie: CATEGORIES.includes(categorie) ? categorie : 'Autre',
      priorite: PRIORITIES.includes(priorite) ? priorite : 'Normale',
      statut: STATUSES.NOUVEAU,
      auteurId,
    });
  },
  addMessage: async (complaint, { auteurId, role, texte }) => {
    complaint.messages.push({ auteurId, role, texte });
    // Notifie l'autre partie (etudiant <-> admin) qu'il y a une nouvelle activite
    if (role === ROLES.ADMIN) complaint.nonLuEtudiant = true;
    else complaint.nonLuAdmin = true;
    // validateModifiedOnly : ne pas faire echouer la sauvegarde sur d'anciennes
    // reclamations qui n'ont pas encore universite/filiere (champs ajoutes apres coup)
    await complaint.save({ validateModifiedOnly: true });
    return complaint.messages[complaint.messages.length - 1];
  },
  changeStatus: async (complaint, nextStatus) => {
    const allowed = STATUS_FLOW[complaint.statut] || [];
    if (!allowed.includes(nextStatus)) return false;
    complaint.statut = nextStatus;
    complaint.nonLuEtudiant = true;
    await complaint.save({ validateModifiedOnly: true });
    return true;
  },
  markAsRead: async (complaint, role) => {
    if (role === ROLES.ADMIN) complaint.nonLuAdmin = false;
    else complaint.nonLuEtudiant = false;
    await complaint.save({ validateModifiedOnly: true });
  },
  unreadCount: (user) => Complaint.countDocuments(unreadFilter(user)),
  unreadList: (user) =>
    Complaint.find(unreadFilter(user)).sort({ updatedAt: -1 }).limit(8).select('ref titre statut'),
  markAllAsRead: (user) =>
    Complaint.updateMany(unreadFilter(user), { [unreadField(user)]: false }),
  deleteComplaint: (complaint) => complaint.deleteOne(),
  updateComplaint: async (complaint, { titre, description, universite, filiere, telephone, categorie, priorite }) => {
    complaint.titre = titre;
    complaint.description = description;
    complaint.universite = universite;
    complaint.filiere = filiere;
    complaint.telephone = telephone || '';
    complaint.categorie = CATEGORIES.includes(categorie) ? categorie : complaint.categorie;
    complaint.priorite = PRIORITIES.includes(priorite) ? priorite : complaint.priorite;
    await complaint.save();
    return complaint;
  },
  // L'etudiant ne peut modifier/supprimer que si l'admin n'a pas encore vu
  // la reclamation ET qu'elle n'est pas deja en cours de traitement
  canModify: (complaint) => complaint.nonLuAdmin === true && complaint.statut !== STATUSES.EN_COURS,

  // Demandes d'acces administrateur : le futur admin soumet nom/email/mot de
  // passe/motif, un administrateur existant approuve (compte cree) ou refuse.
  createAdminRequest: ({ nom, email, telephone, password, motif }) =>
    AdminRequest.create({ nom, email, telephone: telephone || '', passwordHash: hash(password), motif }),
  findPendingAdminRequestByEmail: (email) =>
    AdminRequest.findOne({ email: String(email).toLowerCase(), statut: 'en_attente' }),
  pendingAdminRequests: () => AdminRequest.find({ statut: 'en_attente' }).sort({ createdAt: 1 }),
  approveAdminRequest: async (requestId) => {
    if (!validId(requestId)) return null;
    const demande = await AdminRequest.findOne({ _id: requestId, statut: 'en_attente' });
    if (!demande) return null;
    if (await User.findOne({ email: demande.email })) {
      demande.statut = 'refusee';
      await demande.save();
      return null; // un compte existe deja entre-temps pour cet email
    }
    const user = await User.create({
      nom: demande.nom, email: demande.email, telephone: demande.telephone || '',
      passwordHash: demande.passwordHash, role: ROLES.ADMIN,
    });
    demande.statut = 'approuvee';
    await demande.save();
    return user;
  },
  rejectAdminRequest: async (requestId) => {
    if (!validId(requestId)) return false;
    const demande = await AdminRequest.findOne({ _id: requestId, statut: 'en_attente' });
    if (!demande) return false;
    demande.statut = 'refusee';
    await demande.save();
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
