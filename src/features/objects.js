/* features/objects — objets, favoris, fiche, ajout — extrait de index.htm (logique inchangée) */
import { clearError, go, setTab, showError } from '../lib/dom.js';
import { getCurrentProfile, loadMembers, openPhotoZoom } from './profile.js';
import { openChat } from './messages.js';
import { renderSwipeCard, swipe } from './swipe.js';
import { sb } from '../lib/supabase.js';

    export async function openMyObject(objectId) {
      if (!sb) return;
      try {
        const { data: o, error } = await sb.from('objects').select('*').eq('id', objectId).single();
        if (error) throw error;

        window.currentMyObject = o;

        // Remplir le formulaire
        const photoEl = document.getElementById('myobj-photo');
        const catIcons = { 'Tech': '📱', 'Bricolage': '🔧', 'Maison': '🏠', 'Sport': '⚽', 'Jardinage': '🌱', 'Cuisine': '🍳', 'Loisirs': '🎮', 'Autre': '📦' };
        if (photoEl) {
          if (o.photos && o.photos[0]) {
            photoEl.innerHTML = `<img src="${o.photos[0]}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" alt="${o.titre}"/>`;
            photoEl.style.padding = '0';
          } else {
            photoEl.innerHTML = catIcons[o.categorie] || '📦';
          }
        }
        document.getElementById('myobj-titre').value = o.titre || '';
        document.getElementById('myobj-desc').value = o.description || '';
        document.getElementById('myobj-cat').value = o.categorie || 'Autre';
        document.getElementById('myobj-pts').value = o.pts_par_jour || 10;
        document.getElementById('myobj-duree').value = o.duree_max || 7;
        document.getElementById('myobj-etat').value = o.etat || 'be';
        document.getElementById('myobj-dispo').checked = o.disponible !== false;
        document.getElementById('myobj-success').style.display = 'none';
        clearError('myobj-error');

        go('p-myobject');
      } catch (err) {
        console.error('openMyObject error:', err);
        alert('Impossible de charger cet objet.');
      }
    }

    /* --- Enregistrer les modifications de mon objet --- */
    export async function saveMyObject() {
      clearError('myobj-error');
      if (!window.currentMyObject) return;
      const id = window.currentMyObject.id;

      const titre = document.getElementById('myobj-titre').value.trim();
      const desc = document.getElementById('myobj-desc').value.trim();
      const cat = document.getElementById('myobj-cat').value;
      const pts = parseInt(document.getElementById('myobj-pts').value) || 10;
      const duree = parseInt(document.getElementById('myobj-duree').value) || 7;
      const etat = document.getElementById('myobj-etat').value;
      const dispo = document.getElementById('myobj-dispo').checked;

      if (!titre) { showError('myobj-error', 'Le titre est obligatoire.'); return; }
      if (pts < 1 || pts > 1000) { showError('myobj-error', 'Le prix doit être entre 1 et 1000 points.'); return; }
      if (duree < 1 || duree > 365) { showError('myobj-error', 'La durée doit être entre 1 et 365 jours.'); return; }

      const btn = document.querySelector('#p-myobject .obtn');
      btn.textContent = 'Enregistrement…'; btn.disabled = true;

      try {
        const { error } = await sb.from('objects').update({
          titre, description: desc, categorie: cat,
          pts_par_jour: pts, duree_max: duree, etat, disponible: dispo
        }).eq('id', id);

        if (error) throw error;

        document.getElementById('myobj-success').style.display = 'block';
        btn.textContent = 'Enregistrer'; btn.disabled = false;

        loadMyObjects();
        loadHomeObjects();

        setTimeout(() => { go('p-app'); setTab('profil'); }, 1200);
      } catch (err) {
        console.error('saveMyObject error:', err);
        showError('myobj-error', 'Erreur : ' + err.message);
        btn.textContent = 'Enregistrer'; btn.disabled = false;
      }
    }

    /* --- Supprimer mon objet --- */
    export async function deleteMyObject() {
      if (!window.currentMyObject) return;
      if (!confirm('Supprimer définitivement "' + window.currentMyObject.titre + '" ?')) return;

      try {
        const { error } = await sb.from('objects').delete().eq('id', window.currentMyObject.id);
        if (error) throw error;

        loadMyObjects();
        loadHomeObjects();
        alert('Objet supprimé.');
        go('p-app'); setTab('profil');
      } catch (err) {
        console.error('deleteMyObject error:', err);
        alert('Erreur : ' + err.message);
      }
    }

    /* --- Charger l'historique des transactions du wallet --- */
    /* ============================================
       FAVORIS
       ============================================ */
    window.myFavorites = new Set(); // ids d'objets favoris

    export async function loadFavoritesSet() {
      if (!sb) return;
      try {
        const me = await getCurrentProfile();
        if (!me) return;
        const { data } = await sb.from('favoris').select('object_id').eq('user_id', me.id);
        window.myFavorites = new Set((data || []).map(f => f.object_id));
      } catch (e) { console.error('loadFavoritesSet error:', e); }
    }

    export async function toggleFavorite(objectId, btnEl) {
      if (!sb || !objectId) return;
      const me = await getCurrentProfile();
      if (!me) return;
      const isFav = window.myFavorites.has(objectId);
      try {
        if (isFav) {
          await sb.from('favoris').delete().eq('user_id', me.id).eq('object_id', objectId);
          window.myFavorites.delete(objectId);
        } else {
          await sb.from('favoris').insert({ user_id: me.id, object_id: objectId });
          window.myFavorites.add(objectId);
        }
        // Mettre à jour le bouton visuel
        if (btnEl) {
          const nowFav = window.myFavorites.has(objectId);
          btnEl.textContent = nowFav ? '♥' : '♡';
          btnEl.style.color = nowFav ? '#EF4444' : '';
        }
        // Rafraîchir l'onglet favoris si ouvert
        const fmode = document.getElementById('favoris-mode');
        if (fmode && fmode.style.display !== 'none') loadFavorites();
      } catch (e) {
        console.error('toggleFavorite error:', e);
        alert('Erreur : ' + (e.message || e));
      }
    }

    export async function loadFavorites() {
      if (!sb) return;
      const listEl = document.getElementById('favoris-list');
      const countEl = document.getElementById('favoris-count');
      if (!listEl) return;
      const me = await getCurrentProfile();
      if (!me) return;
      try {
        const { data: favs, error } = await sb.from('favoris')
          .select('object_id, obj:object_id(*, users(id, prenom, nom, ville, note_moyenne))')
          .eq('user_id', me.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        const objets = (favs || []).map(f => f.obj).filter(Boolean);
        if (countEl) countEl.textContent = objets.length + ' objet' + (objets.length > 1 ? 's' : '') + ' en favori';
        if (objets.length === 0) {
          listEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--mu);font-size:13px;">💛 Aucun favori pour l\'instant.<br>Touche le cœur sur un objet pour l\'ajouter ici.</div>';
          return;
        }
        listEl.innerHTML = objets.map(o => {
          const c = (typeof CAT_ICONS !== 'undefined' && CAT_ICONS[o.categorie]) ? CAT_ICONS[o.categorie] : { bg: '#E1F5EE', ico: '📦' };
          const photo = (o.photos && o.photos[0])
            ? '<img src="' + o.photos[0] + '" style="width:100%;height:100%;object-fit:cover;" alt="' + (o.titre || '') + '"/>'
            : '<span aria-hidden="true">' + c.ico + '</span>';
          return '<div class="bcard" role="button" tabindex="0" onclick="openObjectFiche(\'' + o.id + '\')">' +
            '<div class="bimg" style="background:' + c.bg + ';">' + photo +
            '<div class="bpts">' + (o.pts_par_jour || 0) + ' pts</div></div>' +
            '<div class="binfo"><div class="bname">' + (o.titre || 'Objet') + '</div>' +
            '<div class="bowner">' + (o.ville || 'France') + '</div></div></div>';
        }).join('');
      } catch (e) {
        console.error('loadFavorites error:', e);
        listEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--mu);font-size:13px;">Erreur de chargement.</div>';
      }
    }

    window.homeRadius = 50;
    window.explorerRadius = 9999;
    window.explorerSearch = '';
    window.explorerCity = '';
    window.explorerCategory = '';

    /* --- Distance approximative basée sur la ville (sans géocoding) --- */
    // Simple : on considère même ville = 0 km, sinon on ne sait pas (on renvoie 999)
    export function approxDistance(ville1, ville2) {
      if (!ville1 || !ville2) return 9999;
      const v1 = ville1.toLowerCase().trim();
      const v2 = ville2.toLowerCase().trim();
      if (v1 === v2) return 0;
      // Si une contient l'autre (banlieue): considérer 5km
      if (v1.includes(v2) || v2.includes(v1)) return 5;
      return 9999; // Inconnu
    }

    /* --- Icônes par catégorie --- */
    export const CAT_ICONS = {
      'Tech': { ico: '📱', bg: '#E1F5EE' },
      'Bricolage': { ico: '🔧', bg: '#FAEEDA' },
      'Maison': { ico: '🏠', bg: '#FAECE7' },
      'Sport': { ico: '⚽', bg: '#E1F5EE' },
      'Jardinage': { ico: '🌱', bg: '#E1F5EE' },
      'Cuisine': { ico: '🍳', bg: '#FAEEDA' },
      'Loisirs': { ico: '🎮', bg: '#EEEDFE' },
      'Autre': { ico: '📦', bg: '#F3F4F6' }
    };

    /* --- Card builders --- */
    export function buildNearCard(o) {
      const c = CAT_ICONS[o.categorie] || CAT_ICONS['Autre'];
      const photo = (o.photos && o.photos[0])
        ? '<img src="' + o.photos[0] + '" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" alt="' + o.titre + '"/>'
        : '<span aria-hidden="true">' + c.ico + '</span>';
      const ownerName = o.users ? (o.users.prenom + ' ' + (o.users.nom?.[0] || '') + '.') : 'Membre';
      return '<div class="ncard" role="button" tabindex="0" onclick="openObjectFiche(\'' + o.id + '\')">' +
        '<div class="nimg" style="background:' + c.bg + ';">' + photo +
        '<div class="npts">' + o.pts_par_jour + ' pts</div>' +
        '</div>' +
        '<div class="ninfo">' +
        '<div class="nname">' + o.titre + '</div>' +
        '<div class="ndist">' + (o.ville || 'France') + ' · ' + ownerName + '</div>' +
        '</div></div>';
    }

    export function buildBrowseCard(o) {
      const c = CAT_ICONS[o.categorie] || CAT_ICONS['Autre'];
      const photo = (o.photos && o.photos[0])
        ? '<img src="' + o.photos[0] + '" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" alt="' + o.titre + '"/>'
        : '<span aria-hidden="true">' + c.ico + '</span>';
      const ownerName = o.users ? (o.users.prenom + ' ' + (o.users.nom?.[0] || '') + '.') : 'Membre';
      const note = o.users?.note_moyenne > 0 ? ('★ ' + o.users.note_moyenne) : '★ –';
      return '<div class="bcard" role="button" tabindex="0" onclick="openObjectFiche(\'' + o.id + '\')">' +
        '<div class="bimg" style="background:' + c.bg + ';">' + photo +
        '<div class="bpts">' + o.pts_par_jour + ' pts</div>' +
        '</div>' +
        '<div class="binfo">' +
        '<div class="bname">' + o.titre + '</div>' +
        '<div class="bowner">' + ownerName + ' · ' + note + ' · ' + (o.ville || 'France') + '</div>' +
        '</div></div>';
    }

    /* --- Charger tous les objets pour la home --- */
    export async function loadHomeObjects() {
      if (!sb) return;
      const profile = await getCurrentProfile();
      const discoverEl = document.getElementById('home-discover');

      try {
        let query = sb.from('objects')
          .select('*, users(prenom, nom, note_moyenne, verifie_identite, ville)')
          .eq('disponible', true)
          .order('created_at', { ascending: false });

        if (profile?.id) {
          query = query.neq('user_id', profile.id);
        }

        const { data: allObjects, error } = await query;
        if (error) throw error;
        const objects = allObjects || [];

        // Stocker globalement
        window.allObjects = objects;

        // Grille façon Vinted (tous les objets, plus récents d'abord)
        if (discoverEl) {
          if (objects.length === 0) {
            discoverEl.innerHTML = '<div style="grid-column:1/-1;padding:40px 20px;color:var(--mu);font-size:13px;text-align:center;">Aucun objet disponible pour l\'instant.<br>Sois le premier à publier ! 🌻</div>';
          } else {
            discoverEl.innerHTML = objects.map(buildBrowseCard).join('');
          }
        }

        // Mettre à jour aussi explorer
        if (typeof refreshExplorer === 'function') refreshExplorer();
      } catch (err) {
        console.error('loadHomeObjects error:', err);
        if (discoverEl) discoverEl.innerHTML = '<div style="grid-column:1/-1;padding:20px;color:var(--mu);font-size:13px;text-align:center;">Erreur de chargement</div>';
      }
    }

    /* --- Filtre rayon home --- */
    export function setHomeRadius(km, ev) {
      window.homeRadius = km;
      document.querySelectorAll('.radius-chip').forEach(c => {
        c.classList.remove('active-radius');
        c.style.background = 'white';
        c.style.color = 'var(--dk)';
        c.style.borderColor = 'rgba(8,80,65,0.2)';
      });
      if (ev?.target) {
        ev.target.classList.add('active-radius');
        ev.target.style.background = 'var(--g)';
        ev.target.style.color = 'white';
        ev.target.style.borderColor = 'var(--g)';
      }
      loadHomeObjects();
    }

    /* --- Filtre rayon explorer --- */
    export function setExplorerRadius(km, ev) {
      window.explorerRadius = km;
      document.querySelectorAll('.exp-radius').forEach(c => {
        c.classList.remove('active-radius');
        c.style.background = 'white';
        c.style.color = 'var(--dk)';
        c.style.borderColor = 'rgba(8,80,65,0.2)';
      });
      if (ev?.target) {
        ev.target.classList.add('active-radius');
        ev.target.style.background = 'var(--g)';
        ev.target.style.color = 'white';
        ev.target.style.borderColor = 'var(--g)';
      }
      refreshExplorer();
    }

    /* --- Filtrer explorer par recherche/ville/rayon --- */
    export function filterExplorer() {
      window.explorerSearch = (document.getElementById('explorer-search')?.value || '').toLowerCase().trim();
      window.explorerCity = (document.getElementById('explorer-city')?.value || '').toLowerCase().trim();
      refreshExplorer();
      // Si l'onglet membres est actif, recharger aussi la liste membres
      const membersMode = document.getElementById('members-mode');
      if (membersMode && membersMode.style.display !== 'none') {
        if (typeof loadMembers === 'function') loadMembers();
      }
    }

    /* --- Refresh swipe et browse selon filtres --- */
    export function refreshExplorer() {
      const all = window.allObjects || [];
      const search = window.explorerSearch || '';
      const cityFilter = window.explorerCity || '';
      const radius = window.explorerRadius || 9999;
      const profile = window.currentProfile;
      const refCity = cityFilter || profile?.ville || '';

      // Filtrer
      let filtered = all.filter(o => {
        if (search && !(o.titre?.toLowerCase().includes(search) || o.description?.toLowerCase().includes(search))) return false;
        // Filtre catégorie
        if (window.explorerCategory && o.categorie !== window.explorerCategory) return false;
        // Filtre ville : matching texte direct sur la ville de l'objet
        if (cityFilter) {
          const objCity = (o.ville || '').toLowerCase().trim();
          if (!objCity.includes(cityFilter) && !cityFilter.includes(objCity)) return false;
        } else if (refCity && radius < 9999) {
          if (approxDistance(o.ville, refCity) > radius) return false;
        }
        return true;
      });

      // Browse mode
      const browseGrid = document.getElementById('browse-grid');
      const browseCount = document.getElementById('browse-count');
      if (browseGrid) {
        if (filtered.length === 0) {
          browseGrid.innerHTML = '<div style="grid-column:1/-1;padding:40px 20px;text-align:center;color:var(--mu);font-size:13px;">Aucun objet ne correspond à ta recherche.<br>Essaie d\'élargir les filtres.</div>';
        } else {
          browseGrid.innerHTML = filtered.map(buildBrowseCard).join('');
        }
      }
      if (browseCount) {
        browseCount.textContent = filtered.length + ' objet' + (filtered.length > 1 ? 's' : '') + ' disponible' + (filtered.length > 1 ? 's' : '');
      }

      // Swipe mode - show first card
      window.swipeFiltered = filtered;
      window.swipeIndex = 0;
      renderSwipeCard();
    }

    /* --- Render swipe card --- */
    export async function loadMyObjects() {
      if (!sb || !window.currentProfile) return;
      const grid = document.getElementById('my-objects-grid');
      if (!grid) return;

      try {
        const { data: objects, error } = await sb.from('objects')
          .select('*')
          .eq('user_id', window.currentProfile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const catIcons = {
          'Tech': { ico: '📱', bg: '#E1F5EE' },
          'Bricolage': { ico: '🔧', bg: '#FAEEDA' },
          'Maison': { ico: '🏠', bg: '#FAECE7' },
          'Sport': { ico: '⚽', bg: '#E1F5EE' },
          'Jardinage': { ico: '🌱', bg: '#E1F5EE' },
          'Cuisine': { ico: '🍳', bg: '#FAEEDA' },
          'Loisirs': { ico: '🎮', bg: '#EEEDFE' },
          'Autre': { ico: '📦', bg: '#F3F4F6' }
        };

        const addBtn = `<button type="button" class="pocard" onclick="setTab(\'addobj\')" style="border-style:dashed;display:flex;align-items:center;justify-content:center;min-height:120px;background:#f7f7f4;cursor:pointer;font-family:inherit;width:100%;">
          <div style="text-align:center;">
            <div style="font-size:20px;color:var(--mu);" aria-hidden="true">+</div>
            <div style="font-size:11px;color:var(--mu);margin-top:3px;">Ajouter</div>
          </div>
        </button>`;

        if (!objects || objects.length === 0) {
          grid.innerHTML = '<div id="my-objects-empty" style="grid-column:1/-1;text-align:center;padding:24px 16px;color:var(--mu);font-size:13px;">Aucun objet publié pour l\'instant.</div>' + addBtn;
          return;
        }

        grid.innerHTML = objects.map(o => {
          const c = catIcons[o.categorie] || catIcons['Autre'];
          const photo = (o.photos && o.photos[0]) ? `<img src="${o.photos[0]}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" alt="${o.titre}"/>` : `<span aria-hidden="true">${c.ico}</span>`;
          const statusClass = o.disponible ? 'post-on' : 'post-off';
          const statusLbl = o.disponible ? 'Dispo' : 'Indispo';
          return `<div class="pocard" role="button" tabindex="0" onclick="openMyObject('${o.id}')">
            <div class="poimg" style="background:${c.bg};">${photo}
              <div class="popts">${o.pts_par_jour} pts</div>
              <div class="post ${statusClass}">${statusLbl}</div>
            </div>
            <div class="poinfo">
              <div class="ponm">${o.titre}</div>
              <div class="popr">0 prêts</div>
            </div>
          </div>`;
        }).join('') + addBtn;
      } catch (err) {
        console.error('Erreur mes objets:', err);
      }
    }

    /* --- Ouvrir la fiche d'un objet réel --- */
    /* --- Ouvrir le profil public d'un autre membre --- */
    export async function openObjectFiche(objectId) {
      if (!sb || !objectId) return;
      try {
        const { data: o, error } = await sb.from('objects')
          .select('*, users(id, prenom, nom, ville, code_postal, note_moyenne, nb_prets, verifie_identite, created_at, avatar_url)')
          .eq('id', objectId)
          .single();
        if (error) throw error;
        window.currentObject = o;

        // État favori du cœur
        const fsave = document.getElementById('fsavebtn');
        if (fsave) {
          const isFav = window.myFavorites.has(o.id);
          fsave.textContent = isFav ? '♥' : '♡';
          fsave.style.color = isFav ? '#EF4444' : '';
        }

        const c = (typeof CAT_ICONS !== 'undefined' && CAT_ICONS[o.categorie]) ? CAT_ICONS[o.categorie] : { bg: '#E1F5EE', ico: '📦' };

        // Photo / emoji
        const photo = document.getElementById('fiche-photo');
        const emoji = document.getElementById('fiche-photo-emoji');
        if (photo) {
          // Retirer une éventuelle img précédente
          const oldImg = photo.querySelector('.fphoto-img');
          if (oldImg) oldImg.remove();
          if (o.photos && o.photos[0]) {
            photo.style.background = '#f0f0ed';
            if (emoji) emoji.style.display = 'none';
            const img = document.createElement('img');
            img.className = 'fphoto-img';
            img.src = o.photos[0];
            img.alt = o.titre || 'Objet';
            img.onclick = function () { openPhotoZoom(o.photos[0]); };
            photo.appendChild(img);
          } else {
            photo.style.background = c.bg;
            if (emoji) { emoji.style.display = ''; emoji.textContent = c.ico; }
          }
        }

        // Titre, prix
        const titre = document.getElementById('fiche-titre');
        if (titre) titre.textContent = o.titre || 'Objet';
        const pts = document.getElementById('fiche-pts');
        if (pts) pts.textContent = o.pts_par_jour ?? '–';
        const fbarPts = document.getElementById('fbar-pts');
        if (fbarPts) fbarPts.textContent = (o.pts_par_jour ?? '–') + ' pts';

        // Métas
        const ville = document.getElementById('fiche-ville');
        if (ville) ville.textContent = o.ville || (o.users?.ville) || 'France';
        const note = document.getElementById('fiche-note');
        if (note) note.textContent = (o.users?.note_moyenne > 0) ? o.users.note_moyenne.toFixed(1) : '–';
        const dispo = document.getElementById('fiche-dispo');
        if (dispo) dispo.textContent = o.disponible ? 'Disponible' : 'Indisponible';
        const lieu = document.getElementById('fiche-lieu');
        if (lieu) {
          const cp = o.code_postal ? o.code_postal + ' ' : '';
          const v = o.ville || o.users?.ville || '';
          lieu.textContent = '📍 ' + (v ? (cp + v) : 'France');
        }
        const desc = document.getElementById('fiche-desc');
        if (desc) desc.textContent = o.description || 'Pas de description.';

        // Propriétaire
        const u = o.users || {};
        const oname = document.getElementById('fiche-owner-name');
        if (oname) oname.textContent = (u.prenom || 'Membre') + ' ' + (u.nom?.[0] ? u.nom[0] + '.' : '');
        const oav = document.getElementById('fiche-owner-av');
        if (oav) {
          if (u.avatar_url) {
            oav.style.background = "url('" + u.avatar_url + "') center/cover no-repeat";
            oav.textContent = '';
          } else {
            oav.style.background = '';
            oav.textContent = (u.prenom?.[0] || '?') + (u.nom?.[0] || '');
          }
        }
        const osub = document.getElementById('fiche-owner-sub');
        if (osub) {
          const parts = [];
          if (u.note_moyenne > 0) parts.push('⭐ ' + u.note_moyenne.toFixed(1));
          if (u.nb_prets > 0) parts.push(u.nb_prets + ' prêts');
          if (u.verifie_identite) parts.push('✓ Vérifié');
          osub.textContent = parts.length ? parts.join(' · ') : 'Nouveau membre';
        }

        // Durée
        const ficheDuree = document.getElementById('fiche-duree-max');
        if (ficheDuree) {
          const d = o.duree_max || 7;
          ficheDuree.textContent = d === 1 ? '1 jour' : d < 7 ? d + ' jours' : d === 7 ? '1 semaine' : d === 14 ? '2 semaines' : d === 30 ? '1 mois' : d + ' jours';
        }

        setTab('fiche');
      } catch (err) {
        console.error('openObjectFiche error:', err);
        alert('Impossible de charger cet objet.');
      }
    }

    /* --- Charger la liste des conversations (Messages) --- */
    // Carte de bienvenue Shapio (toujours en haut de la liste)
    export function openFiche() {
      const active = document.querySelector('.ni.active');
      window.prevTab = (active && active.id) ? active.id.replace('ni-', '') : 'home';
      setTab('fiche');
    }

    export function backFromFiche() {
      setTab(window.prevTab || 'home');
    }

    export function toggleFSave() {
      const o = window.currentObject;
      if (!o) return;
      const b = document.getElementById('fsavebtn');
      toggleFavorite(o.id, b);
      if (b) b.setAttribute('aria-pressed', String(window.myFavorites.has(o.id)));
    }

    export async function showFicheConfirm() {
      const o = window.currentObject;
      if (!o) return;
      // Remplir les infos dynamiquement
      const titre = document.getElementById('confirm-objet-titre');
      if (titre) titre.textContent = o.titre || 'Objet';
      const prix = document.getElementById('confirm-objet-prix');
      if (prix) prix.textContent = (o.pts_par_jour || 0) + ' pts / jour';
      const dureeMax = o.duree_max || 30;
      const daysInput = document.getElementById('confirm-days');
      if (daysInput) {
        daysInput.value = 1;
        daysInput.max = dureeMax;
      }
      const maxInfo = document.getElementById('confirm-max-info');
      if (maxInfo) maxInfo.textContent = 'Durée maximale autorisée par le prêteur : ' + dureeMax + ' jour' + (dureeMax > 1 ? 's' : '');
      // Mémoriser mon solde disponible
      const me = await getCurrentProfile();
      window.myAvailablePoints = me ? ((me.points ?? 0) - (me.points_bloques ?? 0)) : 0;
      updateConfirmTotal();
      document.getElementById('fiche-confirm').style.display = 'block';
      document.getElementById('fbar').style.display = 'none';
    }

    export function hideFicheConfirm() {
      document.getElementById('fiche-confirm').style.display = 'none';
      document.getElementById('fbar').style.display = 'flex';
    }

    export function adjustConfirmDays(delta) {
      const input = document.getElementById('confirm-days');
      if (!input) return;
      let v = parseInt(input.value, 10) || 1;
      const max = parseInt(input.max, 10) || 60;
      v = Math.max(1, Math.min(max, v + delta));
      input.value = v;
      updateConfirmTotal();
    }

    export function updateConfirmTotal() {
      const o = window.currentObject;
      if (!o) return;
      const input = document.getElementById('confirm-days');
      const days = Math.max(1, parseInt(input?.value, 10) || 1);
      const pts = o.pts_par_jour || 0;
      const total = days * pts;
      const totalEl = document.getElementById('confirm-total');
      if (totalEl) {
        totalEl.textContent = total + ' pts';
        // Alerte si solde insuffisant
        const dispo = window.myAvailablePoints ?? 9999;
        if (total > dispo) {
          totalEl.style.color = '#EF4444';
          totalEl.innerHTML = total + ' pts ⚠️<div style="font-size:11px;font-weight:400;margin-top:4px;">Solde insuffisant (' + dispo + ' pts dispo)</div>';
        } else {
          totalEl.style.color = '';
        }
      }
      const lblEl = document.getElementById('confirm-days-label');
      if (lblEl) lblEl.textContent = days > 1 ? 'jours' : 'jour';
    }

    export async function confirmFicheRequest() {
      const o = window.currentObject;
      if (!o || !o.users) { alert('Erreur : objet introuvable.'); return; }
      const me = await getCurrentProfile();
      if (!me) { alert('Tu dois être connecté.'); return; }
      if (me.id === o.users.id) { alert('Tu es le propriétaire de cet objet.'); return; }

      const daysInput = document.getElementById('confirm-days');
      const days = Math.max(1, parseInt(daysInput?.value, 10) || 1);
      const pts = o.pts_par_jour || 0;
      const total = days * pts;

      // Vérifier le solde disponible
      const dispo = (me.points ?? 0) - (me.points_bloques ?? 0);
      if (total > dispo) {
        alert('❌ Solde insuffisant.\n\nIl te faut ' + total + ' points pour cette demande, mais tu n\'as que ' + dispo + ' points disponibles.\n\nPrête des objets pour gagner des points !');
        return;
      }

      hideFicheConfirm();

      try {
        // Message structuré que l'autre partie pourra reconnaître
        // Format : LOAN_REQUEST||{json} pour qu'on puisse parser côté affichage
        const payload = {
          type: 'LOAN_REQUEST',
          object_id: o.id,
          object_titre: o.titre,
          pts_par_jour: pts,
          days: days,
          total: total
        };
        const messageText = 'LOAN_REQUEST::' + JSON.stringify(payload);
        const { error } = await sb.from('messages').insert({
          expediteur_id: me.id,
          destinataire_id: o.users.id,
          contenu: messageText
        });
        if (error) throw error;
        alert('✅ Demande envoyée à ' + (o.users.prenom || 'au propriétaire') + ' !\n' +
              days + ' jour' + (days > 1 ? 's' : '') + ' · ' + total + ' pts à bloquer.\n\n' +
              'Tu peux suivre la conversation dans tes messages.');
        // Ouvrir directement la conversation pour qu'il voie le message
        openChat(o.users.id);
      } catch (err) {
        console.error('confirmFicheRequest error:', err);
        alert('Erreur : ' + (err.message || err));
      }
    }

    /* ---------- SWIPE (vidé - utilise window.swipeFiltered) ---------- */
    export function openPhotoPicker() {
      const fileInput = document.getElementById('ao-photo-file');
      if (fileInput) fileInput.click();
    }

    /* Lecture du fichier sélectionné et aperçu */
    export function handlePhotoSelected(input) {
      if (!input.files || !input.files[0]) return;
      const file = input.files[0];

      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        alert('Merci de choisir une image (JPG, PNG, GIF…).');
        input.value = '';
        return;
      }

      // Vérifier la taille (5 Mo max)
      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        alert('Cette image est trop lourde. Taille max : 5 Mo.');
        input.value = '';
        return;
      }

      // Lire et afficher l'aperçu
      const reader = new FileReader();
      reader.onload = function (e) {
        const photoBtn = document.getElementById('ao-photo-btn');
        if (!photoBtn) return;
        photoBtn.innerHTML =
          '<img src="' + e.target.result + '" alt="Aperçu de la photo" ' +
          'style="width:100%;height:100%;object-fit:cover;border-radius:13px;" />' +
          '<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);color:white;font-size:11px;padding:4px 10px;border-radius:100px;">Modifier</div>';
        photoBtn.style.padding = '0';
        photoBtn.style.position = 'relative';
        photoBtn.style.overflow = 'hidden';
      };
      reader.onerror = function () {
        alert('Impossible de lire cette image.');
      };
      reader.readAsDataURL(file);
    }

    export async function handleAddObject() {
      clearError('ao-error');
      const title = document.getElementById('ao-title').value.trim();
      const desc = document.getElementById('ao-desc')?.value.trim() || '';
      const cat = document.querySelector('.ao-cat.active')?.textContent || 'Autre';
      const etat = document.getElementById('ao-state').value || 'be';
      const pts = parseInt(document.getElementById('ao-pts-input').value) || 10;
      const quartier = document.getElementById('ao-quartier')?.value.trim() || '';
      const fileInput = document.getElementById('ao-photo-file');
      const file = fileInput?.files?.[0];

      if (!title) {
        showError('ao-error', 'Merci de donner un titre à ton objet.');
        return;
      }
      if (!window.currentProfile) {
        showError('ao-error', 'Tu dois être connecté pour publier.');
        return;
      }
      if (pts < 1 || pts > 1000) {
        showError('ao-error', 'Le prix doit être entre 1 et 1000 points.');
        return;
      }

      const btn = document.querySelector('.ao-submit');
      btn.textContent = 'Publication…';
      btn.disabled = true;

      try {
        let photoUrl = null;

        // Upload photo if present
        if (file) {
          const ext = file.name.split('.').pop();
          const filename = window.currentProfile.id + '_' + Date.now() + '.' + ext;
          const { data: uploadData, error: uploadError } = await sb.storage
            .from('objects')
            .upload(filename, file, { cacheControl: '3600', upsert: false });

          if (uploadError) throw uploadError;

          const { data: urlData } = sb.storage.from('objects').getPublicUrl(filename);
          photoUrl = urlData.publicUrl;
        }

        // Insert object
        const { error: insertError } = await sb.from('objects').insert({
          user_id: window.currentProfile.id,
          titre: title,
          description: desc,
          categorie: cat,
          pts_par_jour: pts,
          disponible: true,
          ville: window.currentProfile.ville || '',
          code_postal: window.currentProfile.code_postal || '',
          photos: photoUrl ? [photoUrl] : [],
          etat: etat
        });

        if (insertError) throw insertError;

        // Réinitialiser le formulaire (sans le détruire)
        document.getElementById('ao-title').value = '';
        if (document.getElementById('ao-desc')) document.getElementById('ao-desc').value = '';
        if (document.getElementById('ao-pts-input')) document.getElementById('ao-pts-input').value = '10';
        if (document.getElementById('ao-quartier')) document.getElementById('ao-quartier').value = '';
        if (fileInput) fileInput.value = '';
        // Réinitialiser l'aperçu photo
        const photoBtn = document.getElementById('ao-photo-btn');
        if (photoBtn) {
          photoBtn.style.backgroundImage = '';
          photoBtn.innerHTML = '<div class="ao-photo-ico" aria-hidden="true">📷</div>' +
            '<div class="ao-photo-txt">Ajouter une photo</div>' +
            '<div class="ao-photo-sub">JPG, PNG · 5 Mo max</div>';
        }
        btn.textContent = 'Publier mon objet';
        btn.disabled = false;

        // Afficher un overlay de succès temporaire (sans détruire le formulaire)
        const ov = document.getElementById('ao-success-overlay');
        if (ov) ov.style.display = 'flex';

        // Recharger les listes en arrière-plan
        if (typeof loadHomeObjects === 'function') loadHomeObjects();
        if (typeof loadMyObjects === 'function') loadMyObjects();
      } catch (err) {
        console.error('Erreur publication:', err);
        showError('ao-error', 'Erreur : ' + (err.message || 'impossible de publier'));
        btn.textContent = 'Publier mon objet';
        btn.disabled = false;
      }
    }

    /* --- État global filtres --- */
    export function aoCat(btn) {
      document.querySelectorAll('.ao-cat').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    }

    /* Synchroniser le slider et l'input number du prix */
    export function syncPtsFromInput() {
      const input = document.getElementById('ao-pts-input');
      const range = document.getElementById('ao-pts-range');
      let v = parseInt(input.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      if (v > 1000) {
        v = 1000;
        input.value = 1000;
      }
      range.value = v;
    }

    export function syncPtsFromRange() {
      const input = document.getElementById('ao-pts-input');
      const range = document.getElementById('ao-pts-range');
      input.value = range.value;
    }

    /* Sélection de photo : ouvrir le sélecteur de fichier */
