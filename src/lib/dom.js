/* lib/dom — navigation & helpers UI — extrait de index.htm (logique inchangée) */
import { getCurrentProfile, refreshMyNote, updateProfileUI } from '../features/profile.js';
import { loadFavoritesSet, loadHomeObjects, loadMyObjects } from '../features/objects.js';
import { loadMessages, startNotificationPolling } from '../features/messages.js';
import { loadWallet } from '../features/wallet.js';
import { swipe } from '../features/swipe.js';

    /* =============================================================
       SHAPIO - Script principal
       Démo navigable. Tous les états sont en mémoire (rien n'est
       envoyé à un backend dans cette version).
       ============================================================= */

    'use strict';

    /* ---------- NAVIGATION ENTRE PAGES ---------- */
    window.prevTab = 'home';

    export function go(id) {
      const target = document.getElementById(id);
      if (!target) return;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      target.classList.add('active');
      window.scrollTo(0, 0);
      // Update aria pour landing nav
      closeNav();
      // Démarrer les notifications dès qu'on entre dans l'app
      if (id === 'p-app' && typeof startNotificationPolling === 'function') {
        startNotificationPolling();
        if (typeof loadFavoritesSet === 'function') loadFavoritesSet();
      }
    }

    export function setTab(tab) {
      // Charger les données dynamiques selon l'onglet
      if (tab === 'wallet' && typeof loadWallet === 'function') loadWallet();
      if (tab === 'profil') {
        if (typeof loadMyObjects === 'function') loadMyObjects();
        getCurrentProfile().then(p => { if (p) updateProfileUI(p); });
        if (typeof refreshMyNote === 'function') refreshMyNote();
      }
      if (tab === 'home' && typeof loadHomeObjects === 'function') loadHomeObjects();
      if (tab === 'addobj') {
        const ov = document.getElementById('ao-success-overlay');
        if (ov) ov.style.display = 'none';
      }
      if (tab === 'msgs' && typeof loadMessages === 'function') loadMessages();
      if (tab === 'notif' || tab === 'msgs' || tab === 'chat') {
        const dot = document.getElementById('notif-dot');
        if (dot) dot.classList.add('hidden');
        // On considère tous les messages actuels comme "vus"
        if (window.lastSeenMessageCount !== undefined) {
          window.lastSeenMessageCount = window.knownMessageCount || window.lastSeenMessageCount;
        }
        const badge = document.getElementById('msgs-badge');
        if (badge) badge.style.display = 'none';
      }

      document.querySelectorAll('.ascreen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.ni').forEach(n => {
        n.classList.remove('active');
        n.removeAttribute('aria-current');
      });
      const m = {
        home: 'as-home',
        swipe: 'as-swipe',
        msgs: 'as-msgs',
        chat: 'as-chat',
        shapio: 'as-shapio',
        wallet: 'as-wallet',
        profil: 'as-profil',
        fiche: 'as-fiche',
        pubprofile: 'as-pubprofile',
        addobj: 'as-addobj',
        notif: 'as-notif'
      };
      const nm = {
        home: 'ni-home',
        swipe: 'ni-swipe',
        msgs: 'ni-msgs',
        wallet: 'ni-wallet',
        profil: 'ni-profil'
      };
      const screen = m[tab] && document.getElementById(m[tab]);
      if (screen) screen.classList.add('active');
      const navItem = nm[tab] && document.getElementById(nm[tab]);
      if (navItem) {
        navItem.classList.add('active');
        navItem.setAttribute('aria-current', 'page');
      }
      if (tab !== 'chat' && tab !== 'fiche' && tab !== 'addobj' && tab !== 'notif' && tab !== 'pubprofile' && tab !== 'shapio') {
        window.prevTab = tab;
      }
      // Bouton swipe flottant : visible seulement sur l'accueil
      window.scrollTo(0, 0);
    }

    /* ---------- LANDING : MENU MOBILE ---------- */
    export function toggleNav() {
      const links = document.getElementById('navLinks');
      const toggle = document.getElementById('navToggle');
      if (!links || !toggle) return;
      const isOpen = links.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    }

    export function closeNav() {
      const links = document.getElementById('navLinks');
      const toggle = document.getElementById('navToggle');
      if (!links || !toggle) return;
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
    }

    /* ---------- AUTHENTIFICATION (factice) ---------- */
    export function showError(elId, msg) {
      const el = document.getElementById(elId);
      if (el) el.textContent = msg;
    }

    export function clearError(elId) {
      showError(elId, '');
    }

    export function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

