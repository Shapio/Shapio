/* features/reviews — avis & notes — extrait de index.htm (logique inchangée) */
import { getCurrentProfile } from './profile.js';
import { loadWallet } from './wallet.js';
import { sb } from '../lib/supabase.js';

    window.reviewContext = null; // { loanId, destinataireId, objetTitre }
    window.reviewRating = 0;

    export function openReviewModal(loanId, destinataireId, objetTitre, destinataireNom) {
      window.reviewContext = { loanId, destinataireId, objetTitre };
      window.reviewRating = 0;
      setReviewStars(0);
      const sub = document.getElementById('review-subtitle');
      if (sub) sub.textContent = 'Note ton échange avec ' + (destinataireNom || 'ce membre') + (objetTitre ? ' pour « ' + objetTitre + ' »' : '');
      const comment = document.getElementById('review-comment');
      if (comment) comment.value = '';
      const modal = document.getElementById('review-modal');
      if (modal) modal.style.display = 'flex';
    }

    export function closeReviewModal() {
      const modal = document.getElementById('review-modal');
      if (modal) modal.style.display = 'none';
    }

    export function setReviewStars(n) {
      window.reviewRating = n;
      const container = document.getElementById('review-stars');
      if (container) {
        container.querySelectorAll('span').forEach(s => {
          const v = parseInt(s.getAttribute('data-star'), 10);
          s.textContent = (v <= n) ? '★' : '☆';
          s.style.color = (v <= n) ? '#F59E0B' : '#d8d8d2';
        });
      }
      const label = document.getElementById('review-stars-label');
      if (label) {
        const txt = ['Touche une étoile pour noter', 'Décevant', 'Moyen', 'Correct', 'Très bien', 'Excellent !'];
        label.textContent = txt[n] || txt[0];
      }
    }

    export async function submitReview() {
      if (!window.reviewContext) return;
      if (window.reviewRating < 1) { alert('Choisis une note (1 à 5 étoiles).'); return; }
      const me = await getCurrentProfile();
      if (!me) return;
      const { loanId, destinataireId } = window.reviewContext;
      const comment = (document.getElementById('review-comment')?.value || '').trim();
      const btn = document.getElementById('review-submit-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Publication…'; }

      try {
        const { error } = await sb.from('reviews').insert({
          auteur_id: me.id,
          destinataire_id: destinataireId,
          loan_id: loanId,
          note: window.reviewRating,
          commentaire: comment || null
        });
        if (error) throw error;

        // Recalculer la note moyenne du destinataire
        await recalcNoteMoyenne(destinataireId);

        closeReviewModal();
        alert('✅ Merci pour ton avis !');
        // Rafraîchir le wallet si on y est
        if (document.querySelector('.ascreen.active')?.id === 'as-wallet' && typeof loadWallet === 'function') loadWallet();
      } catch (e) {
        console.error('submitReview error:', e);
        if (e.code === '23505') alert('Tu as déjà laissé un avis pour ce prêt.');
        else alert('Erreur : ' + (e.message || e));
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Publier mon avis'; }
      }
    }

    export async function recalcNoteMoyenne(userId) {
      try {
        const { data: avis } = await sb.from('reviews').select('note').eq('destinataire_id', userId);
        if (avis && avis.length > 0) {
          const moy = avis.reduce((s, a) => s + (a.note || 0), 0) / avis.length;
          await sb.from('users').update({ note_moyenne: Math.round(moy * 10) / 10 }).eq('id', userId);
        }
      } catch (e) { console.error('recalcNoteMoyenne error:', e); }
    }

    // Vérifier si j'ai déjà laissé un avis pour un prêt donné
    export async function hasReviewed(loanId, auteurId) {
      try {
        const { data } = await sb.from('reviews').select('id').eq('loan_id', loanId).eq('auteur_id', auteurId).maybeSingle();
        return !!data;
      } catch (e) { return false; }
    }

    /* --- Confirmer le retour d'un objet (transfert définitif des points) --- */
