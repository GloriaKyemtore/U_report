/*
 * U-Report - Plateforme de gestion des reclamations universitaires
 * Serveur Express + EJS + Bootstrap 5. Stockage MongoDB (Mongoose).
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const store = require('./data/store');
const connectDB = require('./data/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Transmet les erreurs des handlers async au middleware d'erreur d'Express
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Configuration ----------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'u-report-secret-dev-only',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());

// Variables disponibles dans toutes les vues
app.use(asyncHandler(async (req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.STATUS_BADGE = store.STATUS_BADGE;
  res.locals.ROLES = store.ROLES;
  res.locals.STATUSES = store.STATUSES;
  res.locals.canModify = store.canModify;
  res.locals.pendingAdminRequestCount =
    req.session.user && req.session.user.role === store.ROLES.ADMIN
      ? (await store.pendingAdminRequests()).length
      : 0;
  res.locals.unreadCount = req.session.user ? await store.unreadCount(req.session.user) : 0;
  res.locals.notifications = req.session.user ? await store.unreadList(req.session.user) : [];
  next();
}));

// --- Middlewares d authentification / RBAC ----------------------------------
function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Veuillez vous connecter pour continuer.');
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== store.ROLES.ADMIN) {
    req.flash('error', "Accès réservé à l'administration.");
    return res.redirect('/dashboard');
  }
  next();
}

function requireEtudiant(req, res, next) {
  if (req.session.user.role === store.ROLES.ADMIN) {
    req.flash('error', "L'administration traite les réclamations mais n'en dépose pas.");
    return res.redirect('/dashboard');
  }
  next();
}

// --- Helper : formatage de date ---------------------------------------------
app.locals.formatDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

// ============================================================================
//  ROUTES
// ============================================================================

// Accueil
app.get('/', asyncHandler(async (req, res) => {
  res.render('index', { stats: await store.stats(), categories: store.CATEGORIES });
}));

// --- Authentification -------------------------------------------------------
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login');
});

app.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await store.findUserByEmail(email || '');
  const bcrypt = require('bcryptjs');
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    req.flash('error', 'Email ou mot de passe incorrect.');
    return res.redirect('/login');
  }
  req.session.user = { id: user.id, nom: user.nom, email: user.email, role: user.role };
  req.flash('success', `Bienvenue, ${user.nom} !`);
  res.redirect('/dashboard');
}));

app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register');
});

app.post('/register', asyncHandler(async (req, res) => {
  const { nom, email, password, role, motif, indicatif, telephone } = req.body;
  if (!nom || !email || !password) {
    req.flash('error', 'Tous les champs sont obligatoires.');
    return res.redirect('/register');
  }
  if (password.length < 8) {
    req.flash('error', 'Le mot de passe doit contenir au moins 8 caractères.');
    return res.redirect('/register');
  }
  if (await store.findUserByEmail(email)) {
    req.flash('error', 'Un compte existe déjà avec cet email.');
    return res.redirect('/register');
  }
  // Numero optionnel : on ne prefixe l'indicatif que si un numero a ete saisi
  const numero = (telephone || '').trim();
  const telephoneComplet = numero ? `${indicatif || '+226'} ${numero}` : '';
  // Un compte administrateur n'est jamais cree directement : il passe par une
  // demande, examinee par un administrateur existant depuis son tableau de bord.
  if (role === store.ROLES.ADMIN) {
    if (!motif || !motif.trim()) {
      req.flash('error', "Veuillez indiquer le motif de votre demande d'accès administrateur.");
      return res.redirect('/register');
    }
    if (await store.findPendingAdminRequestByEmail(email)) {
      req.flash('error', 'Une demande est déjà en attente pour cet email.');
      return res.redirect('/register');
    }
    await store.createAdminRequest({ nom, email, telephone: telephoneComplet, password, motif: motif.trim() });
    req.flash('success', "Votre demande d'accès administrateur a été envoyée. Vous pourrez vous connecter dès qu'un administrateur l'aura approuvée.");
    return res.redirect('/login');
  }
  const user = await store.createUser({ nom, email, telephone: telephoneComplet, password, role: store.ROLES.ETUDIANT });
  req.session.user = { id: user.id, nom: user.nom, email: user.email, role: user.role };
  req.flash('success', 'Compte créé avec succès !');
  res.redirect('/dashboard');
}));

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.post('/compte/supprimer', requireAuth, asyncHandler(async (req, res) => {
  const raison = (req.body.raison || '').trim();
  if (!raison) {
    req.flash('error', 'Veuillez indiquer une raison avant de supprimer votre compte.');
    return res.redirect('/dashboard');
  }
  const user = await store.findUserById(req.session.user.id);
  if (!user) return res.redirect('/logout');
  if (user.role === store.ROLES.ADMIN && (await store.countAdmins()) <= 1) {
    req.flash('error', 'Vous êtes le seul administrateur : impossible de supprimer ce compte.');
    return res.redirect('/dashboard');
  }
  await store.deleteUserAccount(user, raison);
  req.session.user = null;
  req.flash('success', 'Votre compte a été supprimé. Vous pouvez revenir quand vous le souhaitez en créant un nouveau compte.');
  res.redirect('/');
}));

// --- Mot de passe oublié -----------------------------------------------------
app.get('/forgot-password', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/forgot-password', { resetLink: null });
});

app.post('/forgot-password', asyncHandler(async (req, res) => {
  const user = await store.findUserByEmail(req.body.email || '');
  if (!user) {
    req.flash('error', "Aucun compte n'est associé à cet email.");
    return res.redirect('/forgot-password');
  }
  const token = await store.generateResetToken(user);
  res.render('auth/forgot-password', { resetLink: '/reset-password/' + token });
}));

app.get('/reset-password/:token', asyncHandler(async (req, res) => {
  const user = await store.findUserByResetToken(req.params.token);
  if (!user) {
    req.flash('error', 'Lien de réinitialisation invalide ou expiré.');
    return res.redirect('/forgot-password');
  }
  res.render('auth/reset-password', { token: req.params.token });
}));

app.post('/reset-password/:token', asyncHandler(async (req, res) => {
  const user = await store.findUserByResetToken(req.params.token);
  if (!user) {
    req.flash('error', 'Lien de réinitialisation invalide ou expiré.');
    return res.redirect('/forgot-password');
  }
  const { password, confirmPassword } = req.body;
  if (!password || password.length < 8) {
    req.flash('error', 'Le mot de passe doit contenir au moins 8 caractères.');
    return res.redirect('/reset-password/' + req.params.token);
  }
  if (password !== confirmPassword) {
    req.flash('error', 'Les mots de passe ne correspondent pas.');
    return res.redirect('/reset-password/' + req.params.token);
  }
  await store.resetPassword(user, password);
  req.flash('success', 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.');
  res.redirect('/login');
}));

// --- Demandes d'acces administrateur -----------------------------------------
app.post('/admin/demandes/:id/approuver', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const user = await store.approveAdminRequest(req.params.id);
  req.flash(
    user ? 'success' : 'error',
    user ? `Compte administrateur créé pour ${user.email}.` : "Impossible d'approuver cette demande (email déjà utilisé entre-temps ou demande introuvable)."
  );
  res.redirect('/dashboard');
}));

app.post('/admin/demandes/:id/refuser', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const ok = await store.rejectAdminRequest(req.params.id);
  req.flash(ok ? 'success' : 'error', ok ? 'Demande refusée.' : 'Demande introuvable.');
  res.redirect('/dashboard');
}));

// --- Tableau de bord (aiguillage selon le role) -----------------------------
app.get('/dashboard', requireAuth, asyncHandler(async (req, res) => {
  const statutFilter = Object.values(store.STATUSES).includes(req.query.statut) ? req.query.statut : '';
  if (req.session.user.role === store.ROLES.ADMIN) {
    return res.render('dashboard/admin', {
      complaints: await store.allComplaints(statutFilter),
      stats: await store.stats(),
      statutFilter,
      adminRequests: await store.pendingAdminRequests(),
    });
  }
  res.render('dashboard/etudiant', {
    complaints: await store.complaintsByAuthor(req.session.user.id, statutFilter),
    statutFilter,
  });
}));

// Fragment HTML (AJAX) pour filtrer le tableau de bord sans recharger la page
function renderPartial(req, view, locals) {
  return new Promise((resolve, reject) => {
    req.app.render(view, locals, (err, html) => (err ? reject(err) : resolve(html)));
  });
}

app.get('/dashboard/filtre', requireAuth, asyncHandler(async (req, res) => {
  const statutFilter = Object.values(store.STATUSES).includes(req.query.statut) ? req.query.statut : '';
  if (req.session.user.role === store.ROLES.ADMIN) {
    const complaints = await store.allComplaints(statutFilter);
    const html = await renderPartial(req, 'partials/admin-rows', {
      complaints,
      STATUS_BADGE: store.STATUS_BADGE,
    });
    return res.json({ count: complaints.length, html });
  }
  const complaints = await store.complaintsByAuthor(req.session.user.id, statutFilter);
  const html = await renderPartial(req, 'partials/etudiant-cards', {
    complaints,
    statutFilter,
    STATUS_BADGE: store.STATUS_BADGE,
    canModify: store.canModify,
  });
  res.json({ count: complaints.length, html });
}));

// --- Reclamations -----------------------------------------------------------
app.get('/reclamations/nouvelle', requireAuth, requireEtudiant, (req, res) => {
  res.render('complaints/new', {
    categories: store.CATEGORIES,
    priorities: store.PRIORITIES,
  });
});

app.post('/reclamations', requireAuth, requireEtudiant, asyncHandler(async (req, res) => {
  const { titre, description, universite, filiere, categorie, priorite } = req.body;
  if (!titre || !universite || !filiere) {
    req.flash('error', "Le titre, l'université et la filière sont obligatoires.");
    return res.redirect('/reclamations/nouvelle');
  }
  const c = await store.createComplaint({
    titre, description, universite, filiere, categorie, priorite, auteurId: req.session.user.id,
  });
  req.flash('success', `Réclamation ${c.ref} déposée avec succès.`);
  res.redirect('/reclamations/' + c.id);
}));

app.post('/reclamations/:id/supprimer', requireAuth, requireEtudiant, asyncHandler(async (req, res) => {
  const complaint = await store.findComplaintById(req.params.id);
  if (!complaint) return res.redirect('/dashboard');
  const isOwner = String(complaint.auteurId) === req.session.user.id;
  if (!isOwner || !store.canModify(complaint)) {
    req.flash('error', 'Cette réclamation ne peut plus être supprimée (déjà consultée par l\'administration ou en cours de traitement).');
    return res.redirect('/dashboard');
  }
  await store.deleteComplaint(complaint);
  req.flash('success', `Réclamation ${complaint.ref} supprimée.`);
  res.redirect('/dashboard');
}));

app.get('/reclamations/:id/modifier', requireAuth, requireEtudiant, asyncHandler(async (req, res) => {
  const complaint = await store.findComplaintById(req.params.id);
  if (!complaint) {
    req.flash('error', 'Réclamation introuvable.');
    return res.redirect('/dashboard');
  }
  const isOwner = String(complaint.auteurId) === req.session.user.id;
  if (!isOwner || !store.canModify(complaint)) {
    req.flash('error', 'Cette réclamation ne peut plus être modifiée (déjà consultée par l\'administration ou en cours de traitement).');
    return res.redirect('/dashboard');
  }
  res.render('complaints/edit', {
    complaint,
    categories: store.CATEGORIES,
    priorities: store.PRIORITIES,
  });
}));

app.post('/reclamations/:id/modifier', requireAuth, requireEtudiant, asyncHandler(async (req, res) => {
  const complaint = await store.findComplaintById(req.params.id);
  if (!complaint) return res.redirect('/dashboard');
  const isOwner = String(complaint.auteurId) === req.session.user.id;
  if (!isOwner || !store.canModify(complaint)) {
    req.flash('error', 'Cette réclamation ne peut plus être modifiée (déjà consultée par l\'administration ou en cours de traitement).');
    return res.redirect('/dashboard');
  }
  const { titre, description, universite, filiere, categorie, priorite } = req.body;
  if (!titre || !universite || !filiere) {
    req.flash('error', "Le titre, l'université et la filière sont obligatoires.");
    return res.redirect('/reclamations/' + complaint.id + '/modifier');
  }
  await store.updateComplaint(complaint, { titre, description, universite, filiere, categorie, priorite });
  req.flash('success', `Réclamation ${complaint.ref} mise à jour.`);
  res.redirect('/reclamations/' + complaint.id);
}));

app.get('/reclamations/:id', requireAuth, asyncHandler(async (req, res) => {
  const complaint = await store.findComplaintById(req.params.id);
  if (!complaint) {
    req.flash('error', 'Réclamation introuvable.');
    return res.redirect('/dashboard');
  }
  const user = req.session.user;
  const isOwner = String(complaint.auteurId) === user.id;
  if (!isOwner && user.role !== store.ROLES.ADMIN) {
    req.flash('error', "Vous n'avez pas accès à cette réclamation.");
    return res.redirect('/dashboard');
  }
  await store.markAsRead(complaint, user.role);

  // Resout les auteurs (reclamation + messages) une fois, pour un lookup synchrone dans la vue
  const authorIds = [...new Set([complaint.auteurId, ...complaint.messages.map((m) => m.auteurId)].map(String))];
  const authors = await Promise.all(authorIds.map((id) => store.findUserById(id)));
  const authorById = Object.fromEntries(authorIds.map((id, i) => [id, authors[i]]));

  res.render('complaints/show', {
    complaint,
    auteur: authorById[String(complaint.auteurId)],
    findUser: (id) => authorById[String(id)],
    nextStatuses: store.STATUS_FLOW[complaint.statut] || [],
  });
}));

// Fil de discussion : ajouter un message
app.post('/reclamations/:id/messages', requireAuth, asyncHandler(async (req, res) => {
  const complaint = await store.findComplaintById(req.params.id);
  if (!complaint) return res.redirect('/dashboard');
  const user = req.session.user;
  const isOwner = String(complaint.auteurId) === user.id;
  if (!isOwner && user.role !== store.ROLES.ADMIN) return res.redirect('/dashboard');
  const texte = (req.body.texte || '').trim();
  if (texte) {
    await store.addMessage(complaint, { auteurId: user.id, role: user.role, texte });
  }
  res.redirect('/reclamations/' + complaint.id);
}));

// Changement de statut (admin uniquement) - machine a etats
app.post('/reclamations/:id/statut', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const complaint = await store.findComplaintById(req.params.id);
  if (!complaint) return res.redirect('/dashboard');
  const ok = await store.changeStatus(complaint, req.body.statut);
  req.flash(ok ? 'success' : 'error', ok ? `Statut mis à jour : ${complaint.statut}.` : 'Transition de statut non autorisée.');
  res.redirect('/reclamations/' + complaint.id);
}));

// --- Notifications (polling cote client) ------------------------------------
app.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const [count, items] = await Promise.all([
    store.unreadCount(req.session.user),
    store.unreadList(req.session.user),
  ]);
  res.json({
    count,
    items: items.map((c) => ({ id: c.id, ref: c.ref, titre: c.titre })),
  });
}));

app.post('/notifications/read', requireAuth, asyncHandler(async (req, res) => {
  await store.markAllAsRead(req.session.user);
  res.json({ ok: true });
}));

// --- 404 --------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).render('404');
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`U-Report démarré sur http://localhost:${PORT}`);
      console.log('Comptes de démo :');
      console.log('  Admin    -> admin@ureport.bf / admin123');
      console.log('  Étudiant -> gloria@ureport.bf / etudiant123');
    });
  })
  .catch((err) => {
    console.error('Impossible de se connecter à MongoDB :', err.message);
    process.exit(1);
  });
