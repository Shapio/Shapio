/* features/profile — profil, avis, confiance — extrait de index.htm (logique inchangée) */
import { CAT_ICONS, loadHomeObjects, loadMyObjects, openObjectFiche } from './objects.js';
import { clearError, go, setTab, showError } from '../lib/dom.js';
import { openChat } from './messages.js';
import { sb } from '../lib/supabase.js';

    export function verifierTelephone() {
      alert(
        "Cette fonctionnalité n'est pas encore disponible.\n\n" +
        "En attendant, merci d'envoyer un message au 06 65 10 69 20 en indiquant les informations suivantes afin de pouvoir valider votre compte :\n\n" +
        "• Shapio\n" +
        "• Nom & Prénom\n" +
        "• Adresse e-mail du compte"
      );
    }

    export async function getCurrentProfile() {
      if (!sb) return null;
      if (window.currentProfile) return window.currentProfile;
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) return null;
        let { data: profile } = await sb.from('users').select('*').eq('auth_id', session.user.id).maybeSingle();

        // Si pas de profil (INSERT à l'inscription a échoué car pas de session), on le crée maintenant
        if (!profile) {
          console.warn('Profil manquant → création de secours');
          const u = session.user;
          const meta = u.user_metadata || {};
          // Priorité aux métadonnées auth (persistent), puis sessionStorage en secours
          const villeFromSignup = meta.ville || sessionStorage.getItem('signup_ville') || '';
          const cpFromSignup = meta.code_postal || sessionStorage.getItem('signup_cp') || '';
          const prenom = meta.prenom || sessionStorage.getItem('signup_prenom') || (u.email?.split('@')[0] || 'Membre');
          const nom = meta.nom || sessionStorage.getItem('signup_nom') || '';
          const pseudo = (prenom + nom).toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.floor(Math.random() * 9999);
          const { data: newProfile, error: insertErr } = await sb.from('users').insert({
            auth_id: u.id,
            prenom, nom, pseudo,
            email: u.email,
            ville: villeFromSignup || 'Non renseignée',
            code_postal: cpFromSignup || null,
            points: 50,
            verifie_telephone: false,
            statut_verification: 'non_demande'
          }).select().maybeSingle();
          if (insertErr) console.error('Création de secours échouée:', insertErr);
          else profile = newProfile;
        }

        if (profile) {
          window.currentProfile = profile;
          updateProfileUI(profile);
        }
        return profile;
      } catch (e) {
        console.error('getCurrentProfile error:', e);
        return null;
      }
    }

    /* --- Ouvrir le formulaire d'édition du profil --- */
    export async function openEditProfile() {
      const profile = await getCurrentProfile();
      if (!profile) return;
      document.getElementById('ep-prenom').value = profile.prenom || '';
      document.getElementById('ep-nom').value = profile.nom || '';
      document.getElementById('ep-ville').value = profile.ville || '';
      document.getElementById('ep-cp').value = profile.code_postal || '';
      document.getElementById('ep-success').style.display = 'none';
      clearError('ep-error');
      go('p-editprofile');
    }

    /* --- Enregistrer les modifications du profil --- */
    export async function saveProfile() {
      clearError('ep-error');
      const profile = await getCurrentProfile();
      if (!profile) {
        showError('ep-error', 'Tu dois être connecté.');
        return;
      }
      const prenom = document.getElementById('ep-prenom').value.trim();
      const nom = document.getElementById('ep-nom').value.trim();
      const ville = document.getElementById('ep-ville').value.trim();
      const cp = document.getElementById('ep-cp').value.trim();

      if (!prenom || !nom || !ville) {
        showError('ep-error', 'Prénom, nom et ville sont obligatoires.');
        return;
      }

      const btn = document.querySelector('#p-editprofile .obtn');
      btn.textContent = 'Enregistrement…';
      btn.disabled = true;

      try {
        const { data, error } = await sb.from('users').update({
          prenom, nom, ville, code_postal: cp
        }).eq('id', profile.id).select().single();
        if (error) throw error;

        window.currentProfile = data;
        updateProfileUI(data);
        loadHomeObjects();
        loadMyObjects();

        document.getElementById('ep-success').style.display = 'block';
        btn.textContent = 'Enregistrer';
        btn.disabled = false;

        setTimeout(() => { go('p-app'); }, 1200);
      } catch (err) {
        console.error('Save profile error:', err);
        showError('ep-error', 'Erreur : ' + (err.message || 'impossible'));
        btn.textContent = 'Enregistrer';
        btn.disabled = false;
      }
    }

    /* --- Marquer la vérification d'identité en attente --- */
    export async function markVerifPending() {
      const profile = await getCurrentProfile();
      if (!profile) return;
      const btn = document.getElementById('verif-btn');
      btn.textContent = 'Envoi…';
      btn.disabled = true;
      try {
        const { error } = await sb.from('users').update({
          statut_verification: 'en_attente'
        }).eq('id', profile.id);
        if (error) throw error;

        window.currentProfile.statut_verification = 'en_attente';
        updateProfileUI(window.currentProfile);

        document.getElementById('verif-status').style.display = 'block';
        btn.textContent = 'Demande enregistrée ✓';
        btn.disabled = true;
      } catch (err) {
        alert('Erreur : ' + err.message);
        btn.textContent = "J'ai envoyé mes documents";
        btn.disabled = false;
      }
    }

    /* --- Vérifier réellement que l'email est confirmé --- */
    export function setProfileTab(tab) {
      const reglement = document.getElementById('ptab-content-reglement');
      // Sous-page règlement (accessible depuis paramètres)
      if (tab === 'reglement') {
        ['objets', 'avis', 'param'].forEach(t => {
          const c = document.getElementById('ptab-content-' + t);
          if (c) c.style.display = 'none';
        });
        if (reglement) reglement.style.display = 'block';
        return;
      }
      if (reglement) reglement.style.display = 'none';
      ['objets', 'avis', 'param'].forEach(t => {
        const btn = document.getElementById('ptab-' + t);
        const content = document.getElementById('ptab-content-' + t);
        if (btn) {
          if (t === tab) {
            btn.style.color = 'var(--g)';
            btn.style.borderBottom = '2px solid var(--g)';
            btn.style.fontWeight = '500';
          } else {
            btn.style.color = 'var(--mu)';
            btn.style.borderBottom = 'none';
            btn.style.fontWeight = '400';
          }
        }
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
      });
      // Charger les avis reçus quand on ouvre l'onglet Avis
      if (tab === 'avis' && typeof loadMyReviews === 'function') loadMyReviews();
    }

    /* --- Charger MES avis reçus (onglet Avis du profil) --- */
    /* --- Recalculer et afficher ma note moyenne (carte stats du profil) --- */
    export async function refreshMyNote() {
      if (!sb) return;
      const me = await getCurrentProfile();
      if (!me) return;
      try {
        const { data: avis } = await sb.from('reviews').select('note').eq('destinataire_id', me.id);
        const noteEl = document.getElementById('profile-note');
        if (avis && avis.length > 0) {
          const moy = avis.reduce((s, a) => s + (a.note || 0), 0) / avis.length;
          if (noteEl) noteEl.textContent = (Math.round(moy * 10) / 10).toFixed(1);
        } else if (noteEl) {
          noteEl.textContent = '–';
        }
      } catch (e) { console.error('refreshMyNote error:', e); }
    }

    export async function loadMyReviews() {
      if (!sb) return;
      const me = await getCurrentProfile();
      if (!me) return;
      const list = document.getElementById('profile-avis-list');
      if (!list) return;
      try {
        const { data: avis, error } = await sb.from('reviews')
          .select('*, auteur:auteur_id(id, prenom, nom, avatar_url)')
          .eq('destinataire_id', me.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        // Calculer la note moyenne en direct et l'afficher
        const noteEl = document.getElementById('profile-note');
        if (avis && avis.length > 0) {
          const moy = avis.reduce((s, a) => s + (a.note || 0), 0) / avis.length;
          if (noteEl) noteEl.textContent = (Math.round(moy * 10) / 10).toFixed(1);
        } else if (noteEl) {
          noteEl.textContent = '–';
        }
        if (!avis || avis.length === 0) {
          list.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--mu);font-size:13px;">Tu n\'as pas encore reçu d\'avis.<br>Ils apparaîtront ici après tes premiers prêts ou emprunts.</div>';
          return;
        }
        list.style.textAlign = 'left';
        list.style.padding = '0';
        list.innerHTML = renderAvisList(avis);
      } catch (e) {
        console.error('loadMyReviews error:', e);
      }
    }

    /* --- Rendu commun d'une liste d'avis (avec auteur cliquable) --- */
    export function renderAvisList(avis) {
      return avis.map(a => {
        const author = a.auteur || {};
        const initialeNom = author.nom?.[0] ? author.nom[0].toUpperCase() + '. ' : '';
        const authName = initialeNom + (author.prenom || 'Membre');
        const stars = '★'.repeat(a.note || 0) + '☆'.repeat(Math.max(0, 5 - (a.note || 0)));
        const d = a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric'}) : '';
        const clickAttr = author.id ? ' role="button" tabindex="0" onclick="openPublicProfile(\'' + author.id + '\')" style="cursor:pointer;"' : '';
        return '<div' + clickAttr + ' style="padding:12px;background:#f7f7f4;border-radius:12px;margin-bottom:8px;cursor:pointer;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:center;">' +
          '<div style="font-weight:500;color:var(--dk);font-size:13px;">' + authName + ' <span style="color:var(--mu);font-size:11px;">›</span></div>' +
          '<div style="color:#F59E0B;font-size:13px;">' + stars + '</div>' +
          '</div>' +
          (a.commentaire ? '<div style="font-size:13px;color:var(--dk);line-height:1.5;margin-bottom:4px;">' + a.commentaire.replace(/</g,'&lt;') + '</div>' : '') +
          '<div style="font-size:11px;color:var(--mu);">' + d + '</div>' +
          '</div>';
      }).join('');
    }

    /* --- Changer le mot de passe (utilisateur connecté) --- */
    export function tvc(el) {
      const checked = el.classList.toggle('sel');
      const chk = el.querySelector('.vcchk');
      if (chk) chk.textContent = checked ? '✓' : '';
      el.setAttribute('aria-checked', String(checked));
    }

    /* ---------- ONGLETS PROFIL ---------- */
    export function ptab(name, btn) {
      ['objets', 'avis', 'settings'].forEach(t => {
        const el = document.getElementById('pt-' + t);
        if (el) el.style.display = (t === name ? '' : 'none');
      });
      document.querySelectorAll('.ptab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    }

    /* ---------- WALLET ---------- */
    export function computeLevel(points) {
      // Niveau progressif : chaque palier de 25 points = +1 niveau
      // 50 pts (départ) = niveau 2, puis monte avec les points reçus
      return Math.max(1, Math.floor((points || 0) / 25) + 1);
    }

    export function updateProfileUI(profile) {
      if (!profile) return;

      // Initiales OU photo de profil
      const av = document.getElementById('profile-av');
      if (av) {
        if (profile.avatar_url) {
          av.style.backgroundImage = 'url(' + profile.avatar_url + ')';
          av.textContent = '';
        } else {
          av.style.backgroundImage = '';
          av.textContent = (profile.prenom?.[0] || '?') + (profile.nom?.[0] || '');
        }
      }

      // Couleur de la banderole
      const banner = document.getElementById('profile-banner');
      if (banner && profile.couleur_banniere) {
        banner.style.background = profile.couleur_banniere;
      }

      // Nom complet (gestion des valeurs manquantes)
      const nm = document.getElementById('profile-name');
      if (nm) {
        const fullName = [profile.prenom, profile.nom].filter(Boolean).join(' ').trim();
        nm.textContent = fullName || profile.pseudo || 'Mon profil';
      }

      // Badge vérifié
      const badge = document.getElementById('profile-badge');
      if (badge) badge.style.display = profile.verifie_identite ? 'inline-block' : 'none';
      const badgeFloat = document.getElementById('profile-badge-floating');
      if (badgeFloat) badgeFloat.style.display = profile.verifie_identite ? 'flex' : 'none';

      // Ville + code postal + date
      const ville = document.getElementById('profile-ville');
      if (ville) {
        const cp = profile.code_postal ? profile.code_postal + ' ' : '';
        ville.textContent = profile.ville ? (cp + profile.ville) : '–';
      }
      const since = document.getElementById('profile-since');
      if (since && profile.created_at) {
        const d = new Date(profile.created_at);
        const mois = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
        since.textContent = 'Membre depuis ' + mois[d.getMonth()] + ' ' + d.getFullYear();
      }

      // Stats profil
      const pts = document.getElementById('profile-pts');
      if (pts) pts.textContent = profile.points ?? 50;
      const prets = document.getElementById('profile-prets');
      if (prets) prets.textContent = profile.nb_prets ?? 0;
      const emprunts = document.getElementById('profile-emprunts');
      if (emprunts) emprunts.textContent = profile.nb_emprunts ?? 0;
      const note = document.getElementById('profile-note');
      if (note) note.textContent = profile.note_moyenne > 0 ? Number(profile.note_moyenne).toFixed(1) : '–';

      // Welcome accueil
      const welcome = document.getElementById('home-welcome');
      if (welcome) welcome.textContent = 'Bienvenue ' + (profile.prenom || '') + ' ! 👋';

      // Points partout (solde disponible = points - bloqués)
      const dispoPts = (profile.points ?? 50) - (profile.points_bloques ?? 0);
      const ppill = document.getElementById('ppill-points');
      if (ppill) ppill.textContent = dispoPts + ' pts';
      const wcn = document.querySelector('.wcn');
      if (wcn) wcn.textContent = dispoPts;
      const wcbar = document.querySelector('.wcbar');
      if (wcbar) wcbar.style.width = Math.min(dispoPts, 100) + '%';

      // Vérifications graduées 0/3 → 3/3
      updateTrustUI(profile);

      window.currentProfile = profile;

      // Charger objets après update
      if (typeof loadHomeObjects === 'function') loadHomeObjects();
      if (typeof loadMyObjects === 'function') loadMyObjects();
    }

    /* --- Mettre à jour la jauge de confiance 0/3 → 3/3 --- */
    export async function updateTrustUI(profile) {
      if (!profile) return;
      // Email vérifié = depuis Supabase Auth (auth.users.email_confirmed_at)
      let emailVerified = false;
      try {
        const { data: { user } } = await sb.auth.getUser();
        emailVerified = !!(user?.email_confirmed_at || user?.confirmed_at);
      } catch (e) { /* silent */ }

      const idVerified = !!profile.verifie_identite;
      const telVerified = !!profile.verifie_telephone;
      const idPending = profile.statut_verification === 'en_attente';

      // Score
      const score = (emailVerified ? 1 : 0) + (idVerified ? 1 : 0) + (telVerified ? 1 : 0);

      // Couleur (rouge 0, orange 1, vert 2+)
      let color, bg;
      if (score === 0) { color = '#EF4444'; bg = '#FEE2E2'; }
      else if (score === 1) { color = '#F59E0B'; bg = '#FEF3C7'; }
      else { color = 'var(--g)'; bg = '#D1FAE5'; }

      // Badge "x/3"
      const badge = document.getElementById('trust-badge');
      if (badge) {
        badge.textContent = score + '/3';
        badge.style.background = bg;
        badge.style.color = color;
      }
      // Barre de progression
      const bar = document.getElementById('trust-bar');
      if (bar) {
        bar.style.width = ((score / 3) * 100) + '%';
        bar.style.background = color;
      }

      // Ligne Email
      setTrustRow('trust-email', emailVerified, false, 'Email confirmé');
      // Ligne Identité (avec état "en attente" possible)
      setTrustRow('trust-id', idVerified, idPending, "Pièce d'identité");
      // Ligne Téléphone
      setTrustRow('trust-tel', telVerified, false, 'Numéro de téléphone');
    }

    export function setTrustRow(prefix, verified, pending, defaultLbl) {
      const ico = document.getElementById(prefix + '-ico');
      const lbl = document.getElementById(prefix + '-lbl');
      const btn = document.getElementById(prefix + '-btn');
      if (!ico || !lbl) return;
      if (verified) {
        ico.textContent = '✓';
        ico.style.background = 'var(--g)'; ico.style.color = 'white'; ico.style.border = '0';
        lbl.textContent = defaultLbl;
        lbl.style.color = '';
        if (btn) btn.style.display = 'none';
      } else if (pending) {
        ico.textContent = '⏳';
        ico.style.background = '#FEF3C7'; ico.style.color = '#92400E'; ico.style.border = '0';
        lbl.textContent = defaultLbl + ' — En cours de validation';
        lbl.style.color = 'var(--mu)';
        if (btn) btn.style.display = 'none';
      } else {
        ico.textContent = '–';
        ico.style.background = 'white'; ico.style.color = 'var(--mu)'; ico.style.border = '1px solid rgba(8,80,65,0.2)';
        lbl.textContent = defaultLbl;
        lbl.style.color = 'var(--mu)';
        if (btn) btn.style.display = 'inline-block';
      }
    }

    /* --- Renvoyer l'email de confirmation --- */
    export async function setBannerColor(color) {
      const banner = document.getElementById('profile-banner');
      if (banner) banner.style.background = color;
      try {
        const profile = await getCurrentProfile();
        if (!profile) return;
        const { error } = await sb.from('users').update({ couleur_banniere: color }).eq('id', profile.id);
        if (error) throw error;
        profile.couleur_banniere = color;
        window.currentProfile = profile;
      } catch (e) {
        console.error('setBannerColor error:', e);
      }
    }

    export async function previewProfilePhoto(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const av = document.getElementById('profile-av');

      // 1) Prévisualisation immédiate
      const reader = new FileReader();
      reader.onload = e => {
        if (av) {
          av.style.backgroundImage = 'url(' + e.target.result + ')';
          av.textContent = '';
        }
      };
      reader.readAsDataURL(file);

      // 2) Upload Supabase Storage + sauvegarde URL en base
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) { alert('Tu dois être connecté.'); return; }
        const profile = await getCurrentProfile();
        if (!profile) return;

        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = session.user.id + '/avatar.' + ext;

        const { error: upErr } = await sb.storage
          .from('avatars')
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;

        const { data: pub } = sb.storage.from('avatars').getPublicUrl(path);
        const url = pub.publicUrl + '?t=' + Date.now(); // cache-bust

        const { error: dbErr } = await sb.from('users').update({ avatar_url: url }).eq('id', profile.id);
        if (dbErr) throw dbErr;

        profile.avatar_url = url;
        window.currentProfile = profile;
        if (av) av.style.backgroundImage = 'url(' + url + ')';
      } catch (e) {
        console.error('previewProfilePhoto error:', e);
        alert('Erreur lors de l\'envoi de la photo : ' + (e.message || e));
      }
    }

    /* --- Calcul du niveau à partir des points --- */
    export async function openPublicProfile(userId) {
      if (!sb || !userId) return;
      const me = await getCurrentProfile();
      // Si c'est mon propre profil, rediriger vers l'onglet profil
      if (me && me.id === userId) { setTab('profil'); return; }

      window.viewingProfileUserId = userId;
      window.viewingProfileSource = (document.querySelector('.ascreen.active')?.id || 'as-home').replace('as-', '');

      try {
        // Charger l'utilisateur (toutes ses infos publiques)
        const { data: u, error } = await sb.from('users')
          .select('id, prenom, nom, ville, code_postal, points, note_moyenne, nb_prets, nb_emprunts, verifie_identite, verifie_telephone, statut_verification, avatar_url, couleur_banniere, created_at')
          .eq('id', userId)
          .single();
        if (error) throw error;

        // Banderole
        const banner = document.getElementById('pub-banner');
        if (banner) banner.style.background = u.couleur_banniere || 'var(--gl)';

        // Avatar
        const av = document.getElementById('pub-av');
        if (av) {
          if (u.avatar_url) {
            av.style.backgroundImage = "url('" + u.avatar_url + "')";
            av.textContent = '';
          } else {
            av.style.backgroundImage = '';
            av.textContent = (u.prenom?.[0] || '?') + (u.nom?.[0] || '');
          }
        }

        // Badge vérifié sur l'avatar
        const badge = document.getElementById('pub-badge');
        if (badge) badge.style.display = u.verifie_identite ? 'flex' : 'none';

        // Nom, ville, depuis
        const name = document.getElementById('pub-name');
        if (name) name.textContent = (u.prenom || 'Membre') + ' ' + (u.nom?.[0] ? u.nom[0] + '.' : '');
        const ville = document.getElementById('pub-ville');
        if (ville) {
          const cp = u.code_postal ? u.code_postal + ' ' : '';
          ville.textContent = '📍 ' + (u.ville ? (cp + u.ville) : 'France');
        }
        const since = document.getElementById('pub-since');
        if (since && u.created_at) {
          const d = new Date(u.created_at);
          const mois = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
          since.textContent = 'Membre depuis ' + mois[d.getMonth()] + ' ' + d.getFullYear();
        }

        // Stats
        const prets = document.getElementById('pub-prets');
        if (prets) prets.textContent = u.nb_prets ?? 0;
        const emp = document.getElementById('pub-emprunts');
        if (emp) emp.textContent = u.nb_emprunts ?? 0;
        const note = document.getElementById('pub-note');
        if (note) note.textContent = (u.note_moyenne > 0) ? u.note_moyenne.toFixed(1) : '–';

        // Niveau de confiance (on ne sait pas si son email est confirmé côté autre user, on suppose true par défaut s'il est connecté)
        // Pour le public, on ne peut PAS lire auth.users.email_confirmed_at d'un autre user via le client.
        // On affiche donc juste les 2 vérifs visibles : identité + téléphone.
        const idV = !!u.verifie_identite;
        const telV = !!u.verifie_telephone;
        const score = (idV ? 1 : 0) + (telV ? 1 : 0);
        // Note : on affiche /2 publiquement car email pas accessible
        let color, bg;
        if (score === 0) { color = '#EF4444'; bg = '#FEE2E2'; }
        else if (score === 1) { color = '#F59E0B'; bg = '#FEF3C7'; }
        else { color = 'var(--g)'; bg = '#D1FAE5'; }
        const tBadge = document.getElementById('pub-trust-badge');
        if (tBadge) { tBadge.textContent = score + '/2'; tBadge.style.background = bg; tBadge.style.color = color; }
        const tBar = document.getElementById('pub-trust-bar');
        if (tBar) { tBar.style.width = ((score / 2) * 100) + '%'; tBar.style.background = color; }
        const trustRows = document.getElementById('pub-trust-rows');
        if (trustRows) {
          const pending = u.statut_verification === 'en_attente';
          const idLine = idV ? '✓ Identité vérifiée' : (pending ? '⏳ Identité en cours de validation' : '– Identité non vérifiée');
          const telLine = telV ? '✓ Numéro de téléphone vérifié' : '– Téléphone non vérifié';
          trustRows.innerHTML = '<div style="padding:4px 0;color:' + (idV ? 'var(--dk)' : 'var(--mu)') + ';">' + idLine + '</div>' +
            '<div style="padding:4px 0;color:' + (telV ? 'var(--dk)' : 'var(--mu)') + ';">' + telLine + '</div>';
        }

        // Charger ses objets
        const grid = document.getElementById('pub-objects-grid');
        const empty = document.getElementById('pub-objects-empty');
        const { data: objs, error: oErr } = await sb.from('objects')
          .select('*')
          .eq('user_id', userId)
          .eq('disponible', true)
          .order('created_at', { ascending: false });
        if (oErr) console.error('pub objects error:', oErr);

        if (grid) {
          if (!objs || objs.length === 0) {
            grid.innerHTML = '<div id="pub-objects-empty" style="grid-column:1/-1;text-align:center;padding:24px 16px;color:var(--mu);font-size:13px;">Aucun objet publié.</div>';
          } else {
            grid.innerHTML = objs.map(o => {
              const c = (typeof CAT_ICONS !== 'undefined' && CAT_ICONS[o.categorie]) ? CAT_ICONS[o.categorie] : { bg: '#E1F5EE', ico: '📦' };
              const photo = (o.photos && o.photos[0])
                ? '<img src="' + o.photos[0] + '" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" alt="' + (o.titre || '') + '"/>'
                : '<span aria-hidden="true">' + c.ico + '</span>';
              return '<div class="bcard" role="button" tabindex="0" onclick="openObjectFiche(\'' + o.id + '\')">' +
                '<div class="bimg" style="background:' + c.bg + ';">' + photo +
                '<div class="bpts">' + (o.pts_par_jour || 0) + ' pts</div></div>' +
                '<div class="binfo"><div class="bname">' + (o.titre || 'Objet') + '</div>' +
                '<div class="bowner">' + (o.ville || 'France') + '</div></div></div>';
            }).join('');
          }
        }

        // Charger ses avis reçus
        const avisList = document.getElementById('pub-avis-list');
        const { data: avis, error: aErr } = await sb.from('reviews')
          .select('*, auteur:auteur_id(id, prenom, nom, avatar_url)')
          .eq('destinataire_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (aErr) console.error('pub avis error:', aErr);
        // Note moyenne calculée en direct
        const noteEl2 = document.getElementById('pub-note');
        if (avis && avis.length > 0) {
          const moy = avis.reduce((s, a) => s + (a.note || 0), 0) / avis.length;
          if (noteEl2) noteEl2.textContent = (Math.round(moy * 10) / 10).toFixed(1);
        } else if (noteEl2) {
          noteEl2.textContent = '–';
        }
        if (avisList) {
          if (!avis || avis.length === 0) {
            avisList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--mu);">Aucun avis pour l\'instant.</div>';
          } else {
            avisList.innerHTML = renderAvisList(avis);
          }
        }

        // Charger l'historique des échanges terminés
        const histList = document.getElementById('pub-history-list');
        if (histList) {
          try {
            const { data: hist } = await sb.from('loans')
              .select('*, obj:object_id(titre), emprunteur:emprunteur_id(prenom), preteur:preteur_id(prenom)')
              .or('emprunteur_id.eq.' + userId + ',preteur_id.eq.' + userId)
              .eq('statut', 'termine')
              .order('date_fin', { ascending: false })
              .limit(15);
            if (!hist || hist.length === 0) {
              histList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--mu);">Aucun échange terminé.</div>';
            } else {
              histList.innerHTML = hist.map(l => {
                const estPreteur = (l.preteur_id === userId);
                const titre = (l.obj?.titre || 'Objet').replace(/</g, '&lt;');
                const d = l.date_fin ? new Date(l.date_fin).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric'}) : '';
                const ico = estPreteur ? '🔼' : '🔽';
                const autre = estPreteur
                  ? ('a prêté à ' + (l.emprunteur?.prenom || 'un membre'))
                  : ('a emprunté à ' + (l.preteur?.prenom || 'un membre'));
                return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f7f7f4;border-radius:12px;margin-bottom:6px;">' +
                  '<div style="font-size:16px;">' + ico + '</div>' +
                  '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:13px;color:var(--dk);font-weight:500;">' + titre + '</div>' +
                    '<div style="font-size:11px;color:var(--mu);">' + autre + ' · ' + d + '</div>' +
                  '</div>' +
                  '</div>';
              }).join('');
            }
          } catch (e) {
            console.error('pub history error:', e);
            histList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--mu);">Historique indisponible.</div>';
          }
        }

        setTab('pubprofile');
      } catch (err) {
        console.error('openPublicProfile error:', err);
        alert('Impossible de charger ce profil.');
      }
    }

    export function closePublicProfile() {
      setTab(window.viewingProfileSource || 'home');
    }

    export async function contactFromPublic() {
      const userId = window.viewingProfileUserId;
      if (!userId) return;
      openChat(userId);
    }

    /* --- Voir une photo en grand (plein écran) --- */
    export function openPhotoZoom(url) {
      if (!url) return;
      let ov = document.getElementById('photo-zoom-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'photo-zoom-overlay';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out;';
        ov.onclick = function () { ov.style.display = 'none'; };
        ov.innerHTML = '<img id="photo-zoom-img" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;" alt="Photo en grand"/>' +
          '<button type="button" aria-label="Fermer" style="position:absolute;top:18px;right:18px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,0.15);color:white;font-size:22px;cursor:pointer;">×</button>';
        document.body.appendChild(ov);
      }
      document.getElementById('photo-zoom-img').src = url;
      ov.style.display = 'flex';
    }

    export async function loadMembers() {
      if (!sb) return;
      const listEl = document.getElementById('members-list');
      const countEl = document.getElementById('members-count');
      if (!listEl) return;

      const me = await getCurrentProfile();
      // Barre de recherche dédiée à l'onglet Membres (fallback sur explorer-search)
      const search = (document.getElementById('members-search')?.value || document.getElementById('explorer-search')?.value || '').toLowerCase().trim();
      const cityFilter = (document.getElementById('explorer-city')?.value || '').toLowerCase().trim();

      try {
        const { data: users, error } = await sb.from('users')
          .select('id, prenom, nom, ville, code_postal, note_moyenne, nb_prets, nb_emprunts, verifie_identite, verifie_telephone, avatar_url, couleur_banniere, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;

        // Filtres : exclure soi-même + recherche nom + filtre ville
        const filtered = (users || []).filter(u => {
          if (me && u.id === me.id) return false;
          if (search) {
            const fullName = ((u.prenom || '') + ' ' + (u.nom || '')).toLowerCase();
            if (!fullName.includes(search)) return false;
          }
          if (cityFilter) {
            const uc = (u.ville || '').toLowerCase();
            if (!uc.includes(cityFilter) && !cityFilter.includes(uc)) return false;
          }
          return true;
        });

        if (countEl) countEl.textContent = filtered.length + ' membre' + (filtered.length > 1 ? 's' : '');

        if (filtered.length === 0) {
          listEl.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--mu);font-size:13px;">' +
            (search || cityFilter ? 'Aucun membre ne correspond à ta recherche.' : 'Aucun membre pour l\'instant.') +
            '</div>';
          return;
        }

        listEl.innerHTML = filtered.map(u => {
          const name = (u.prenom || 'Membre') + ' ' + (u.nom?.[0] ? u.nom[0] + '.' : '');
          const initials = (u.prenom?.[0] || '?') + (u.nom?.[0] || '');
          const avatar = u.avatar_url
            ? '<div style="width:56px;height:56px;border-radius:50%;background:url(\'' + u.avatar_url + '\') center/cover no-repeat;flex-shrink:0;"></div>'
            : '<div style="width:56px;height:56px;border-radius:50%;background:var(--gl);display:flex;align-items:center;justify-content:center;font-family:\'DM Serif Display\',serif;color:var(--g);font-size:18px;flex-shrink:0;">' + initials + '</div>';

          // Niveau de confiance (sur /2 publiquement comme dans le profil public)
          const idV = !!u.verifie_identite;
          const telV = !!u.verifie_telephone;
          const score = (idV ? 1 : 0) + (telV ? 1 : 0);
          let tColor, tBg;
          if (score === 0) { tColor = '#EF4444'; tBg = '#FEE2E2'; }
          else if (score === 1) { tColor = '#F59E0B'; tBg = '#FEF3C7'; }
          else { tColor = 'var(--g)'; tBg = '#D1FAE5'; }

          // Date d'inscription (utile pour repérer les comptes récents)
          let sinceTxt = '';
          if (u.created_at) {
            const d = new Date(u.created_at);
            const now = new Date();
            const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
            if (diffDays < 7) sinceTxt = '🆕 Nouveau';
            else if (diffDays < 30) sinceTxt = 'Inscrit il y a ' + diffDays + ' jours';
            else {
              const mois = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
              sinceTxt = 'Depuis ' + mois[d.getMonth()] + ' ' + d.getFullYear();
            }
          }

          const note = (u.note_moyenne > 0) ? '⭐ ' + u.note_moyenne.toFixed(1) : '⭐ –';
          const prets = (u.nb_prets || 0) + ' prêt' + ((u.nb_prets || 0) > 1 ? 's' : '');
          const emprunts = (u.nb_emprunts || 0) + ' empr.';

          return '<div role="button" tabindex="0" onclick="openPublicProfile(\'' + u.id + '\')" ' +
            'onkeypress="if(event.key===\'Enter\')openPublicProfile(\'' + u.id + '\')" ' +
            'style="display:flex;gap:12px;padding:14px;background:#f7f7f4;border-radius:14px;cursor:pointer;align-items:center;">' +
            avatar +
            '<div style="flex:1;min-width:0;">' +
              '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">' +
                '<div style="font-weight:500;color:var(--dk);font-size:14px;">' + name + '</div>' +
                (idV ? '<span style="background:var(--g);color:white;border-radius:50%;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;">✓</span>' : '') +
              '</div>' +
              '<div style="font-size:12px;color:var(--mu);margin-bottom:4px;">📍 ' + (u.ville ? ((u.code_postal ? u.code_postal + ' ' : '') + u.ville) : 'France') + ' · ' + sinceTxt + '</div>' +
              '<div style="display:flex;gap:6px;flex-wrap:wrap;font-size:11px;">' +
                '<span style="background:' + tBg + ';color:' + tColor + ';padding:2px 8px;border-radius:100px;font-weight:600;">' + score + '/2 confiance</span>' +
                '<span style="color:var(--mu);">' + note + '</span>' +
                '<span style="color:var(--mu);">' + prets + '</span>' +
                '<span style="color:var(--mu);">' + emprunts + '</span>' +
              '</div>' +
            '</div>' +
            '<span style="color:var(--mu);">›</span>' +
            '</div>';
        }).join('');
      } catch (err) {
        console.error('loadMembers error:', err);
        listEl.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--mu);font-size:13px;">Erreur de chargement.</div>';
      }
    }

    /* --- Swipe actions (skip / like) --- */
