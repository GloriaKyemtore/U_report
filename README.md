# U-Report

Plateforme de gestion des réclamations universitaires.
Stack **Node.js / Express + EJS + Bootstrap 5**, données stockées dans **MongoDB Atlas** (Mongoose).

## Prérequis

- **Node.js** installé (vérifier avec `node --version`)
- Accès à la base **MongoDB Atlas** du projet (chaîne de connexion à demander en privé — voir plus bas)

## Installation

```bash
git clone https://github.com/GloriaKyemtore/U_report.git
cd U_report
npm install
```

`npm install` recrée le dossier `node_modules/`, qui n'est pas versionné (il se régénère à partir de `package.json`).

## Configuration (fichier `.env`)

Le fichier `.env` contient des secrets et **n'est pas sur GitHub**. Chaque personne crée le sien à partir du modèle fourni :

```bash
cp .env.example .env
```

Puis renseigner les trois valeurs dans `.env` :

| Variable         | Valeur                                                                                 |
|------------------|----------------------------------------------------------------------------------------|
| `MONGODB_URI`    | Chaîne de connexion MongoDB Atlas du projet — **à transmettre en privé, jamais sur GitHub**. |
| `SESSION_SECRET` | Chaîne aléatoire longue, propre à chaque personne. Générer avec la commande ci-dessous. |
| `NODE_ENV`       | `development` en local (`production` une fois hébergé).                                 |

Générer un `SESSION_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Lancement

```bash
npm start        # ou : npm run dev  (redémarre automatiquement à chaque modification)
```

Puis ouvrir **http://localhost:3000**

## ⚠️ Autorisation d'IP sur MongoDB Atlas

Atlas refuse par défaut les connexions depuis une IP inconnue. Si `npm start` affiche une erreur de
connexion à MongoDB alors que le `MONGODB_URI` est correct, il faut autoriser l'adresse dans Atlas :

**Tableau de bord Atlas → Network Access → Add IP Address** — ajouter son IP, ou `0.0.0.0/0` pour
autoriser toutes les adresses (plus simple à plusieurs, mais à réserver au développement).

## Comptes de démonstration

| Rôle     | Email               | Mot de passe   |
|----------|---------------------|----------------|
| Admin    | admin@ureport.bf    | admin123       |
| Étudiant | etudiant@ureport.bf | etudiant123    |

Ces deux comptes sont créés automatiquement au premier démarrage sur une base vide.
Pour retirer d'une base déjà remplie les comptes et réclamations de démo/test : `npm run purge-demo`.

## Fonctionnalités

- **Authentification** (bcrypt + sessions persistées en base) et inscription étudiant
- **RBAC** : accès filtré selon le rôle (étudiant / admin), demande/approbation d'accès admin
- **Dépôt de réclamation** : titre, catégorie, priorité, université, filière, téléphone → référence unique `UR-xxxx`
- **Champ téléphone international** : indicatifs par pays, format à tirets, validation du nombre de chiffres
- **Dashboard Étudiant** : suivi de ses tickets, filtre par statut, pagination
- **Dashboard Admin** : KPIs + graphiques Chart.js, table complète filtrable et paginée, export PDF
- **Fil de discussion** : échanges étudiant ↔ administration sur chaque ticket, notifications
- **Machine à états des tickets** : Nouveau → En cours → Résolu → Fermé (+ Rejeté), transitions contrôlées
- **Mon profil** et suppression de compte

## Sécurité

Rate-limiting sur l'authentification, protection CSRF sur les formulaires et l'AJAX, cookies de session
durcis (httpOnly, sameSite, `secure` en production), validation serveur des entrées.

## Travailler à plusieurs

- Ne jamais committer le fichier `.env` ni le `MONGODB_URI` (déjà exclus par `.gitignore`).
- Partager la chaîne de connexion Atlas par un canal privé (message), pas via GitHub.
- Utiliser la même `MONGODB_URI` permet de partager la même base (mêmes comptes, mêmes réclamations).
