/* features/wallet — portefeuille de points — extrait de index.htm (logique inchangée) */
import { confirmerRetour } from './loans.js';
import { getCurrentProfile } from './profile.js';
import { openReviewModal } from './reviews.js';
import { sb } from '../lib/supabase.js';

    export async function loadWallet() {
      if (!sb) return;
      window.currentProfile = null; // forcer le rechargement des points
      const profile = await getCurrentProfile();
      if (!profile) return;

      // Solde principal
      const points = profile.points ?? 50;
      const bloques = profile.points_bloques ?? 0;
      const disponible = points - bloques;

      const wcn = document.querySelector('#as-wallet .wcn');
      if (wcn) wcn.textContent = disponible;
      const wcbar = document.querySelector('#as-wallet .wcbar');
      if (wcbar) wcbar.style.width = Math.min(disponible, 100) + '%';
      const blockEl = document.getElementById('wallet-bloques');
      if (blockEl) blockEl.textContent = bloques + ' pts';

      const loansEl = document.getElementById('wallet-loans');
      const txList = document.getElementById('wallet-transactions');

      try {
        // Charger tous mes prêts (en tant qu'emprunteur OU prêteur)
        const { data: loans, error } = await sb.from('loans')
          .select('*, obj:object_id(titre), emprunteur:emprunteur_id(prenom, nom), preteur:preteur_id(prenom, nom)')
          .or('emprunteur_id.eq.' + profile.id + ',preteur_id.eq.' + profile.id)
          .order('created_at', { ascending: false });
        if (error) throw error;

        const enCours = (loans || []).filter(l => l.statut === 'en_cours');
        const termines = (loans || []).filter(l => l.statut === 'termine');

        // Charger les avis que J'AI déjà laissés (pour ne pas reproposer)
        let reviewedLoanIds = new Set();
        try {
          const { data: myReviews } = await sb.from('reviews').select('loan_id').eq('auteur_id', profile.id);
          (myReviews || []).forEach(r => { if (r.loan_id) reviewedLoanIds.add(r.loan_id); });
        } catch (e) { /* pas grave */ }

        // --- Prêts en cours ---
        if (loansEl) {
          if (enCours.length === 0) {
            loansEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--mu);font-size:13px;background:#f7f7f4;border-radius:14px;">Aucun prêt en cours.</div>';
          } else {
            loansEl.innerHTML = enCours.map(l => {
              const jeSuisPreteur = (l.preteur_id === profile.id);
              const titre = (l.obj?.titre || 'Objet').replace(/</g, '&lt;');
              const autre = jeSuisPreteur
                ? ('Emprunté par ' + (l.emprunteur?.prenom || 'un membre'))
                : ('Prêté par ' + (l.preteur?.prenom || 'un membre'));
              const roleColor = jeSuisPreteur ? '#1D9E75' : '#F59E0B';
              const roleLabel = jeSuisPreteur ? '🔼 Tu prêtes' : '🔽 Tu empruntes';
              let btn = '';
              if (jeSuisPreteur) {
                btn = '<button type="button" onclick="confirmerRetour(\'' + l.id + '\')" style="width:100%;margin-top:10px;padding:9px;border:0;border-radius:8px;background:var(--g);color:white;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;">📦 Confirmer le retour</button>';
              } else {
                btn = '<div style="margin-top:8px;font-size:11px;color:var(--mu);text-align:center;">En attente de confirmation du retour par le prêteur.</div>';
              }
              return '<div style="background:white;border:1px solid rgba(8,80,65,0.1);border-radius:14px;padding:14px;margin-bottom:10px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">' +
                  '<div style="font-size:14px;font-weight:500;color:var(--dk);">' + titre + '</div>' +
                  '<span style="font-size:10px;font-weight:600;color:' + roleColor + ';white-space:nowrap;">' + roleLabel + '</span>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--mu);margin-bottom:4px;">' + autre + '</div>' +
                '<div style="font-size:12px;color:var(--dk);">📅 ' + (l.jours || 0) + ' jour(s) · 💎 ' + (l.total_pts || 0) + ' pts ' + (jeSuisPreteur ? 'à recevoir' : 'bloqués') + '</div>' +
                btn +
                '</div>';
            }).join('');
          }
        }

        // --- Historique des transactions ---
        const dateInscription = new Date(profile.created_at);
        const dateStr = dateInscription.toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});

        let txHtml = '';
        // Prêts terminés = transactions
        for (const l of termines) {
          const jeSuisPreteur = (l.preteur_id === profile.id);
          const titre = (l.obj?.titre || 'Objet').replace(/</g, '&lt;');
          const d = l.date_fin ? new Date(l.date_fin).toLocaleDateString('fr-FR', {day:'numeric', month:'long'}) : '';
          const montant = jeSuisPreteur ? ('+' + (l.total_pts || 0)) : ('-' + (l.total_pts || 0));
          const color = jeSuisPreteur ? '#1D9E75' : '#EF4444';
          const ico = jeSuisPreteur ? '🔼' : '🔽';
          const label = jeSuisPreteur ? ('Prêt de "' + titre + '"') : ('Emprunt de "' + titre + '"');
          // Bouton avis si pas encore noté
          const autreId = jeSuisPreteur ? l.emprunteur_id : l.preteur_id;
          const autreNom = jeSuisPreteur ? (l.emprunteur?.prenom || 'ce membre') : (l.preteur?.prenom || 'ce membre');
          const dejaNote = reviewedLoanIds.has(l.id);
          const avisBtn = dejaNote
            ? '<div style="font-size:11px;color:var(--g);margin-top:8px;">✓ Avis laissé</div>'
            : '<button type="button" onclick="openReviewModal(\'' + l.id + '\',\'' + autreId + '\',\'' + (l.obj?.titre || 'Objet').replace(/'/g, "\\'") + '\',\'' + autreNom.replace(/'/g, "\\'") + '\')" style="margin-top:8px;padding:7px 12px;border:1px solid var(--g);border-radius:8px;background:white;color:var(--g);font-family:inherit;font-size:12px;cursor:pointer;">⭐ Laisser un avis</button>';
          txHtml += '<div style="background:white;border:1px solid rgba(8,80,65,0.08);border-radius:14px;padding:14px;margin-bottom:8px;">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
              '<div style="width:38px;height:38px;background:#f7f7f4;border-radius:50%;display:flex;align-items:center;justify-content:center;">' + ico + '</div>' +
              '<div style="flex:1;"><div style="font-size:14px;font-weight:500;color:var(--dk);">' + label + '</div>' +
              '<div style="font-size:11px;color:var(--mu);">' + d + '</div></div>' +
              '<div style="font-size:14px;font-weight:600;color:' + color + ';">' + montant + ' pts</div>' +
            '</div>' +
            avisBtn +
            '</div>';
        }
        // Bonus inscription (toujours en bas)
        txHtml += '<div style="background:white;border:1px solid rgba(8,80,65,0.08);border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px;">' +
          '<div style="width:38px;height:38px;background:#E1F5EE;border-radius:50%;display:flex;align-items:center;justify-content:center;">🎁</div>' +
          '<div style="flex:1;"><div style="font-size:14px;font-weight:500;color:var(--dk);">Bonus inscription</div>' +
          '<div style="font-size:11px;color:var(--mu);">Bienvenue sur Shapio · ' + dateStr + '</div></div>' +
          '<div style="font-size:14px;font-weight:600;color:#1D9E75;">+50 pts</div></div>';

        if (txList) txList.innerHTML = txHtml;

        // Stats résumées
        const gagnes = termines.filter(l => l.preteur_id === profile.id).reduce((s, l) => s + (l.total_pts || 0), 0);
        const depenses = termines.filter(l => l.emprunteur_id === profile.id).reduce((s, l) => s + (l.total_pts || 0), 0);
        const gagnesEl = document.getElementById('wallet-gagnes');
        const depEl = document.getElementById('wallet-depenses');
        const evolEl = document.getElementById('wallet-month-evol');
        if (gagnesEl) gagnesEl.textContent = '+' + gagnes + ' pts';
        if (depEl) depEl.textContent = depenses + ' pts';
        if (evolEl) evolEl.textContent = (gagnes - depenses >= 0 ? '+' : '') + (gagnes - depenses) + ' pts';
      } catch (err) {
        console.error('loadWallet error:', err);
        if (loansEl) loansEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--mu);font-size:13px;">Erreur de chargement.</div>';
      }
    }

    /* --- Switch entre les onglets du profil --- */
    export function setWalletTab(btn) {
      document.querySelectorAll('.wtab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      // Future : filtrer la liste des transactions
    }

    export function decrementPoints(amount) {
      const ppill = document.getElementById('ppill-points');
      if (!ppill) return;
      const match = ppill.textContent.match(/(\d+)/);
      if (!match) return;
      const current = parseInt(match[1], 10);
      const next = Math.max(0, current - amount);
      ppill.textContent = next + ' pts';
    }

    /* ---------- AJOUTER UN OBJET ---------- */
