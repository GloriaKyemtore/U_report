/*
 * Reference metier : statuts, categories, priorites, roles.
 * Partage entre les modeles Mongoose (validation des enums) et data/store.js.
 */

// Machine a etats des tickets : transitions autorisees
const STATUSES = {
  NOUVEAU: 'Nouveau',
  EN_COURS: 'En cours',
  RESOLU: 'Résolu',
  FERME: 'Fermé',
  REJETE: 'Rejeté',
};

const STATUS_FLOW = {
  [STATUSES.NOUVEAU]: [STATUSES.EN_COURS, STATUSES.REJETE],
  [STATUSES.EN_COURS]: [STATUSES.RESOLU, STATUSES.REJETE],
  [STATUSES.RESOLU]: [STATUSES.FERME, STATUSES.EN_COURS],
  [STATUSES.FERME]: [],
  [STATUSES.REJETE]: [],
};

const STATUS_BADGE = {
  [STATUSES.NOUVEAU]: 'bg-secondary',
  [STATUSES.EN_COURS]: 'bg-primary',
  [STATUSES.RESOLU]: 'bg-success',
  [STATUSES.FERME]: 'bg-dark',
  [STATUSES.REJETE]: 'bg-danger',
};

const CATEGORIES = [
  'Scolarité',
  'Infrastructure',
  'Informatique',
  'Restauration',
  'Bibliothèque',
  'Vie étudiante',
  'Autre',
];

const PRIORITIES = ['Basse', 'Normale', 'Haute', 'Urgente'];

const ROLES = { ETUDIANT: 'etudiant', ADMIN: 'admin' };

module.exports = { STATUSES, STATUS_FLOW, STATUS_BADGE, CATEGORIES, PRIORITIES, ROLES };
