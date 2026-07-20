# U-Report

Plateforme de gestion des réclamations universitaires — **MVP sans base de données**.

Basé sur la répartition des tâches du projet U-Report (stack Node.js/Express + EJS + Bootstrap 5).
Les données sont stockées **en mémoire** (fichier `data/store.js`) et réinitialisées à chaque
redémarrage. Il suffira de remplacer ce module par des modèles Mongoose lorsque MongoDB sera branché.

## Installation

```bash
cd u-report
npm install
npm start
```

Puis ouvrir http://localhost:3000

## Comptes de démonstration

| Rôle     | Email               | Mot de passe   |
|----------|---------------------|----------------|
| Admin    | admin@ureport.bf    | admin123       |
| Étudiant | etudiant@ureport.bf | etudiant123    |

Ces deux comptes ne sont créés qu'au premier démarrage sur une base vide.
Pour retirer les comptes et réclamations de démo d'une base déjà remplie :
`npm run purge-demo`.

## Fonctionnalités (MVP)

- **Authentification** (bcrypt + sessions) et inscription étudiant
- **RBAC** : accès filtré selon le rôle (étudiant / admin)
- **Dépôt de réclamation** : titre, catégorie, priorité, description → référence unique `UR-xxxx`
- **Dashboard Étudiant** : suivi de ses tickets et de leur statut
- **Dashboard Admin** : KPIs + graphiques Chart.js (par statut / par catégorie) + table complète
- **Fil de discussion** : échanges étudiant ↔ administration sur chaque ticket
- **Machine à états des tickets** : Nouveau → En cours → Résolu → Fermé (+ Rejeté), transitions contrôlées

## Prochaine étape

Remplacer `data/store.js` par une connexion MongoDB Atlas + schémas Mongoose
(`Utilisateurs`, `Réclamations`), conformément au planning du projet.
