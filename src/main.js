/* main.js — point d'entrée : styles, registre des handlers, init */
import './styles/tokens.css';
import './styles/landing.css';
import './styles/app.css';
import './styles/components.css';

import * as dom from './lib/dom.js';
import * as auth from './features/auth.js';
import * as profile from './features/profile.js';
import * as objects from './features/objects.js';
import * as loans from './features/loans.js';
import * as reviews from './features/reviews.js';
import * as messages from './features/messages.js';
import * as swipe from './features/swipe.js';
import * as wallet from './features/wallet.js';
import * as legal from './features/legal.js';
import { closeNav, go } from './lib/dom.js';
import { getCurrentProfile, updateProfileUI } from './features/profile.js';
import { loadHomeObjects } from './features/objects.js';
import { sb } from './lib/supabase.js';
import { startNotificationPolling } from './features/messages.js';

/* Les gestionnaires inline (onclick="...") du HTML appellent ces fonctions
   comme globales : on les ré-expose explicitement sur window. */
Object.assign(window, dom, auth, profile, objects, loans, reviews, messages, swipe, wallet, legal);

document.addEventListener('DOMContentLoaded', async () => {
  // Détecter si l'utilisateur arrive depuis un lien de reset password
  const hash = window.location.hash;
  if (hash && hash.includes('type=recovery')) {
    go('p-newpwd');
    return;
  }
  // Détecter si l'utilisateur arrive depuis un lien de confirmation email
  if (hash && hash.includes('type=signup')) {
    go('p-app');
    return;
  }

  // Vérifier si déjà connecté
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) {
    const profile = await getCurrentProfile();
    if (profile) {
      window.currentProfile = profile;
      updateProfileUI(profile);
      // Restaurer la session : aller directement dans l'app
      go('p-app');
      if (typeof loadHomeObjects === 'function') loadHomeObjects();
      startNotificationPolling();
    }
  }
  // Fermer menu mobile en cliquant dehors
  document.addEventListener('click', e => {
    const links = document.getElementById('navLinks');
    const toggle = document.getElementById('navToggle');
    if (!links || !toggle) return;
    if (!links.classList.contains('open')) return;
    if (!links.contains(e.target) && !toggle.contains(e.target)) closeNav();
  });
});
