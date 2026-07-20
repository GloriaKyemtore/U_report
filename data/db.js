const dns = require('dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { ROLES } = require('./constants');

// Le resolveur DNS de certaines box locales ne repond pas aux requetes SRV
// qu'utilise mongodb+srv:// (necessaire pour Atlas) -> on force un DNS public
// pour cette recherche, sans toucher a la config reseau de la machine.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const hash = (pwd) => bcrypt.hashSync(pwd, 10);

async function seedIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return;

  await User.create([
    { nom: 'Akram OUEDRAOGO', email: 'admin@ureport.bf', passwordHash: hash('admin123'), role: ROLES.ADMIN },
    { nom: 'Etudiant Demo', email: 'etudiant@ureport.bf', passwordHash: hash('etudiant123'), role: ROLES.ETUDIANT },
  ]);

  console.log('Base de données vide : compte admin et compte étudiant de démo créés.');
}

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connexion MongoDB établie.');
  await seedIfEmpty();
}

module.exports = connectDB;
