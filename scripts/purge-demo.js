/*
 * Purge des comptes de demonstration et de test presents en base.
 * A lancer une seule fois : npm run purge-demo
 *
 * Le seed (data/db.js) ne s'execute que sur une base vide : il ne peut donc pas
 * nettoyer les comptes deja crees. Ce script s'en charge. Il est idempotent :
 * le relancer ne fait rien de plus.
 *
 * Conserve : admin@ureport.bf et etudiant@ureport.bf.
 */
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const User = require('../data/models/User');
const Complaint = require('../data/models/Complaint');
const { ROLES } = require('../data/constants');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const A_CONSERVER = ['admin@ureport.bf', 'etudiant@ureport.bf'];

// Comptes supprimes avec leurs reclamations, comme le fait l'application quand
// un etudiant supprime son compte (voir store.deleteUserAccount).
const A_SUPPRIMER = [
  'gloria@ureport.bf',
  'testsuppr@ureport.bf',
  'nouveladmin@ureport.bf',
  'vraiadmin@ureport.bf',
  'moelle@gmail.com',
];

// Reclamations creees par l'ancien seed. Les references sont recyclees
// (store.createComplaint numerote a partir du nombre de documents), donc on
// exige aussi le titre d'origine pour ne jamais viser une vraie reclamation.
const RECLAMATIONS_DEMO = [
  { ref: 'UR-2601', titre: 'Wi-Fi instable au bâtiment C' },
  { ref: 'UR-2602', titre: 'Erreur sur mon relevé de notes' },
  { ref: 'UR-2603', titre: 'Chauffe-eau en panne (résidence B)' },
];

// Garde-fou : ne jamais viser un compte a conserver, meme si la liste est
// modifiee par erreur plus tard.
function verifierListes() {
  const conflit = A_SUPPRIMER.filter((email) => A_CONSERVER.includes(email));
  if (conflit.length) {
    throw new Error(`${conflit.join(', ')} figure(nt) a la fois dans A_SUPPRIMER et A_CONSERVER.`);
  }
}

// Garde-fou : l'application interdit de supprimer le dernier administrateur,
// ce script doit respecter la meme regle.
async function verifierAdminsRestants() {
  const restants = await User.countDocuments({ role: ROLES.ADMIN, email: { $nin: A_SUPPRIMER } });
  if (restants === 0) {
    throw new Error('la purge ne laisserait aucun administrateur. Rien n\'a été supprimé.');
  }
}

async function purge() {
  verifierListes();
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connexion MongoDB établie.');
  await verifierAdminsRestants();

  for (const email of A_SUPPRIMER) {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`- ${email} : déjà absent, rien à faire.`);
      continue;
    }
    const { deletedCount } = await Complaint.deleteMany({ auteurId: user._id });
    await user.deleteOne();
    console.log(`- ${email} : compte supprimé (${deletedCount} réclamation(s) associée(s)).`);
  }

  for (const { ref, titre } of RECLAMATIONS_DEMO) {
    const { deletedCount } = await Complaint.deleteMany({ ref, titre });
    if (deletedCount) console.log(`- Réclamation de démo ${ref} supprimée.`);
  }

  const comptes = await User.find({}, 'email role').sort({ email: 1 });
  const reclamations = await Complaint.countDocuments();
  console.log(`\nComptes restants (${comptes.length}) :`);
  comptes.forEach((u) => console.log(`  ${u.email} (${u.role})`));
  console.log(`Réclamations restantes : ${reclamations}`);

  await mongoose.disconnect();
}

purge().catch((err) => {
  console.error('Purge interrompue :', err.message);
  process.exit(1);
});
