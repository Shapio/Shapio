/* features/swipe — cartes swipe/match — extrait de index.htm (logique inchangée) */
import { CAT_ICONS, loadFavorites, openObjectFiche, refreshExplorer, toggleFavorite } from './objects.js';
import { loadMembers } from './profile.js';

    export const cards = [];
    export let ci = 0;

    export function renderCard(i, el) {
      if (!el) return;
      const c = cards[i % cards.length];
      const initials = c.owner.split(' ').map(w => w[0]).join('');
      el.innerHTML =
        '<div class="cphoto" style="background:' + c.bg + '">' +
        '<span style="font-size:68px" aria-hidden="true">' + c.icon + '</span>' +
        '<div class="cbadge">' + c.pts + ' pts</div>' +
        '<div class="cdist">' + c.dist + '</div>' +
        '</div>' +
        '<div class="cbody">' +
        '<div class="ctitle">' + c.title + '</div>' +
        '<div class="cowner">' +
        '<div class="cav" aria-hidden="true">' + initials + '</div>' +
        '<span>' + c.owner + '</span>' +
        '<span class="cstars" aria-label="Note ' + c.note + ' sur 5">★★★★★</span>' +
        '<span style="font-size:11px;color:var(--mu)">' + c.note + '</span>' +
        '</div>' +
        '<div class="ctags">' + c.tags.map(t => '<span class="ctag">' + t + '</span>').join('') + '</div>' +
        '</div>';
    }

    export function swipe(dir) {
      const f = document.getElementById('cfront');
      if (!f) return;
      if (dir === 'right') {
        f.classList.add('swright');
        setTimeout(() => {
          f.classList.remove('swright');
          document.getElementById('swipe-mode').style.display = 'none';
          document.getElementById('match-ov').style.display = 'block';
        }, 350);
      } else {
        f.classList.add('swleft');
        setTimeout(() => {
          ci++;
          f.classList.remove('swleft');
          renderCard(ci, f);
          renderCard(ci + 1, document.getElementById('cback'));
        }, 350);
      }
    }

    export function closeMatch() {
      document.getElementById('match-ov').style.display = 'none';
      document.getElementById('swipe-mode').style.display = 'block';
      ci++;
      renderCard(ci, document.getElementById('cfront'));
      renderCard(ci + 1, document.getElementById('cback'));
    }

    export function setSwipeMode(m) {
      const swipeEl = document.getElementById('swipe-mode');
      const browseEl = document.getElementById('browse-mode');
      const membersEl = document.getElementById('members-mode');
      const favorisEl = document.getElementById('favoris-mode');
      const filtersCat = document.getElementById('filters-cat');
      const tSwipe = document.getElementById('mt-swipe');
      const tBrowse = document.getElementById('mt-browse');
      const tMembers = document.getElementById('mt-members');
      const tFavoris = document.getElementById('mt-favoris');

      // Reset tous les onglets
      [tSwipe, tBrowse, tMembers, tFavoris].forEach(b => {
        if (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); }
      });

      // Reset toutes les vues
      if (swipeEl) swipeEl.style.display = 'none';
      if (browseEl) browseEl.style.display = 'none';
      if (membersEl) membersEl.style.display = 'none';
      if (favorisEl) favorisEl.style.display = 'none';

      if (m === 'swipe') {
        if (swipeEl) swipeEl.style.display = 'block';
        if (filtersCat) filtersCat.style.display = '';
        if (tSwipe) { tSwipe.classList.add('active'); tSwipe.setAttribute('aria-selected', 'true'); }
      } else if (m === 'members') {
        if (membersEl) membersEl.style.display = 'block';
        if (filtersCat) filtersCat.style.display = 'none';
        if (tMembers) { tMembers.classList.add('active'); tMembers.setAttribute('aria-selected', 'true'); }
        if (typeof loadMembers === 'function') loadMembers();
      } else if (m === 'favoris') {
        if (favorisEl) favorisEl.style.display = 'block';
        if (filtersCat) filtersCat.style.display = 'none';
        if (tFavoris) { tFavoris.classList.add('active'); tFavoris.setAttribute('aria-selected', 'true'); }
        if (typeof loadFavorites === 'function') loadFavorites();
      } else {
        // browse par défaut
        if (browseEl) browseEl.style.display = 'block';
        if (filtersCat) filtersCat.style.display = '';
        if (tBrowse) { tBrowse.classList.add('active'); tBrowse.setAttribute('aria-selected', 'true'); }
      }
    }

    export function setFilter(btn) {
      document.querySelectorAll('.fchip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const label = (btn.textContent || '').trim();
      // "Tout" = pas de filtre
      window.explorerCategory = (label === 'Tout') ? '' : label;
      if (typeof refreshExplorer === 'function') refreshExplorer();
    }

    /* ---------- VÉRIFICATION (signup étape 4) ---------- */
    export function renderSwipeCard() {
      const stack = document.getElementById('cstack');
      if (!stack) return;
      const filtered = window.swipeFiltered || [];
      const idx = window.swipeIndex || 0;
      if (filtered.length === 0 || idx >= filtered.length) {
        stack.innerHTML = '<div style="padding:60px 30px;text-align:center;color:var(--mu);font-size:14px;">Aucun objet à explorer pour l\'instant.<br><br>Reviens bientôt — les nouveaux objets s\'afficheront ici.</div>';
        return;
      }
      const o = filtered[idx];
      const c = CAT_ICONS[o.categorie] || CAT_ICONS['Autre'];
      const photo = (o.photos && o.photos[0])
        ? '<img src="' + o.photos[0] + '" style="width:100%;height:100%;object-fit:cover;" alt="' + o.titre + '"/>'
        : '<span aria-hidden="true" style="font-size:80px;">' + c.ico + '</span>';
      const ownerName = o.users ? (o.users.prenom + ' ' + (o.users.nom?.[0] || '') + '.') : 'Membre';
      const note = o.users?.note_moyenne > 0 ? o.users.note_moyenne : '–';
      stack.innerHTML = '<div class="scard front" onclick="openObjectFiche(\'' + o.id + '\')">' +
        '<div class="cphoto" style="background:' + c.bg + ';">' + photo +
        '<div class="cbadge">' + o.pts_par_jour + ' pts</div>' +
        '<div class="cdist">' + (o.ville || 'France') + '</div>' +
        '</div>' +
        '<div class="cbody">' +
        '<div class="ctitle">' + o.titre + '</div>' +
        '<div class="cowner">' +
        '<div class="cav" aria-hidden="true">' + ((o.users?.prenom?.[0] || '?') + (o.users?.nom?.[0] || '')) + '</div>' +
        '<span>' + ownerName + '</span>' +
        '<span class="cstars">★</span>' +
        '<span style="font-size:11px;color:var(--mu);">' + note + '</span>' +
        '</div>' +
        '<div class="ctags"><span class="ctag">' + o.categorie + '</span></div>' +
        '</div></div>';
    }

    /* --- Charger la liste des membres pour l'onglet Membres --- */
    export function swipeNext() {
      window.swipeIndex = (window.swipeIndex || 0) + 1;
      renderSwipeCard();
    }

    export async function swipeFavorite() {
      const obj = window.swipeFiltered?.[window.swipeIndex];
      if (!obj) return;
      if (!window.myFavorites.has(obj.id)) {
        await toggleFavorite(obj.id, null);
      }
      swipeNext();
    }

        /* --- Charger MES objets pour le profil --- */
