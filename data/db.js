const dns = require('dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Setting = require('./models/Setting');
const { STATUSES, ROLES } = require('./constants');

// Le resolveur DNS de certaines box locales ne repond pas aux requetes SRV
// qu'utilise mongodb+srv:// (necessaire pour Atlas) -> on force un DNS public
// pour cette recherche, sans toucher a la config reseau de la machine.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const hash = (pwd) => bcrypt.hashSync(pwd, 10);

async function seedIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return;

  const [admin, gloria, etudiantDemo] = await User.create([
    { nom: 'Akram OUEDRAOGO', email: 'admin@ureport.bf', passwordHash: hash('admin123'), role: ROLES.ADMIN },
    { nom: 'Gloria KYEMTORE', email: 'gloria@ureport.bf', passwordHash: hash('etudiant123'), role: ROLES.ETUDIANT },
    { nom: 'Etudiant Demo', email: 'etudiant@ureport.bf', passwordHash: hash('etudiant123'), role: ROLES.ETUDIANT },
  ]);

  await Complaint.create([
    {
      ref: 'UR-2601',
      titre: 'Wi-Fi instable au bâtiment C',
      description: 'La connexion Wi-Fi coupe toutes les 10 minutes dans les salles du bâtiment C, ce qui perturbe les cours en ligne.',
      categorie: 'Informatique',
      priorite: 'Haute',
      statut: STATUSES.EN_COURS,
      auteurId: gloria._id,
      messages: [
        { auteurId: gloria._id, role: ROLES.ETUDIANT, texte: 'Le problème persiste depuis lundi.' },
        { auteurId: admin._id, role: ROLES.ADMIN, texte: 'Merci, le service informatique a été notifié. Intervention prévue cette semaine.' },
      ],
    },
    {
      ref: 'UR-2602',
      titre: 'Erreur sur mon relevé de notes',
      description: 'Une note du semestre 3 est manquante sur mon relevé officiel.',
      categorie: 'Scolarité',
      priorite: 'Normale',
      statut: STATUSES.NOUVEAU,
      auteurId: etudiantDemo._id,
      messages: [],
    },
    {
      ref: 'UR-2603',
      titre: 'Chauffe-eau en panne (résidence B)',
      description: "Plus d'eau chaude dans la résidence B depuis 3 jours.",
      categorie: 'Infrastructure',
      priorite: 'Urgente',
      statut: STATUSES.RESOLU,
      auteurId: gloria._id,
      messages: [
        { auteurId: admin._id, role: ROLES.ADMIN, texte: 'Technicien passé, chauffe-eau remplacé. Pouvez-vous confirmer ?' },
      ],
    },
  ]);

  console.log('Base de données vide : comptes et réclamations de démo créés.');
}

async function seedAdminInviteCode() {
  const existing = await Setting.findOne({ key: 'adminInviteCode' });
  if (existing || !process.env.ADMIN_INVITE_CODE) return;
  await Setting.create({ key: 'adminInviteCode', value: process.env.ADMIN_INVITE_CODE });
}

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connexion MongoDB établie.');
  await seedIfEmpty();
  await seedAdminInviteCode();
}

module.exports = connectDB;
