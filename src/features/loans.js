/* features/loans — demandes de prêt — extrait de index.htm (logique inchangée) */
import { getCurrentProfile } from './profile.js';
import { loadWallet } from './wallet.js';
import { openChat } from './messages.js';
import { sb } from '../lib/supabase.js';

    export async function confirmerRetour(loanId) {
      if (!loanId) { alert('Prêt introuvable.'); return; }
      try {
        const me = await getCurrentProfile();
        if (!me) return;

        // Récupérer les infos du prêt pour le message + savoir à qui notifier
        const { data: loan, error: loanErr } = await sb.from('loans')
          .select('*, obj:object_id(titre)')
          .eq('id', loanId)
          .single();
        if (loanErr || !loan) { alert('Prêt introuvable.'); return; }

        if (loan.statut === 'termine') { alert('Ce prêt est déjà terminé.'); return; }

        if (!confirm('Confirmer que l\'objet t\'a bien été rendu ?\n\nLes ' + (loan.total_pts || 0) + ' points seront définitivement transférés de l\'emprunteur vers toi.')) return;

        // Appel de la fonction SQL atomique
        const { error: rpcErr } = await sb.rpc('confirmer_retour', { p_loan_id: loanId });
        if (rpcErr) {
          console.error('confirmer_retour error:', rpcErr);
          let m = rpcErr.message || 'Erreur';
          if (m.includes('prêteur')) m = '❌ Seul le prêteur peut confirmer le retour.';
          else if (m.includes('pas en cours')) m = 'Ce prêt n\'est plus en cours.';
          alert(m);
          return;
        }

        // Message "prêt terminé" dans le chat
        const emprunteurId = loan.emprunteur_id;
        const payload = {
          type: 'LOAN_RETURNED',
          object_titre: loan.obj?.titre || 'Objet',
          days: loan.jours || 0,
          pts_par_jour: (loan.jours ? Math.round((loan.total_pts || 0) / loan.jours) : 0),
          total: loan.total_pts || 0,
          loan_id: loanId
        };
        await sb.from('messages').insert({
          expediteur_id: me.id,
          destinataire_id: emprunteurId,
          contenu: 'LOAN_RETURNED::' + JSON.stringify(payload)
        });

        // Rafraîchir les points
        window.currentProfile = null;
        await getCurrentProfile();

        alert('🎉 Retour confirmé ! Tu as reçu ' + (loan.total_pts || 0) + ' points.');

        // Rafraîchir l'écran courant
        const activeScreen = document.querySelector('.ascreen.active')?.id;
        if (activeScreen === 'as-wallet' && typeof loadWallet === 'function') loadWallet();
        else if (activeScreen === 'as-chat') await openChat(emprunteurId);
      } catch (e) {
        console.error('confirmerRetour error:', e);
        alert('Erreur : ' + (e.message || e));
      }
    }

    /* --- Envoyer un nouveau message dans la conversation ouverte --- */
    export async function loanGetOriginal(messageId) {
      const { data: m, error } = await sb.from('messages').select('*').eq('id', messageId).single();
      if (error) throw error;
      const match = (m.contenu || '').match(/^(LOAN_REQUEST|LOAN_COUNTER)::(.+)$/);
      if (!match) throw new Error('Message invalide');
      return { msg: m, data: JSON.parse(match[2]) };
    }

    export async function loanAccept(messageId) {
      try {
        const { msg, data } = await loanGetOriginal(messageId);
        const me = await getCurrentProfile();
        if (!me) return;
        // L'expéditeur de la demande = l'emprunteur
        const emprunteurId = msg.expediteur_id;

        if (!confirm('Accepter ce prêt ?\n\n' + (data.object_titre || 'Objet') + '\n' +
          (data.days || 1) + ' jour(s) · ' + (data.total || 0) + ' pts seront bloqués chez l\'emprunteur.')) return;

        // Appel de la fonction SQL atomique : vérifie le solde, bloque les points, crée le prêt
        const { data: loanId, error: rpcErr } = await sb.rpc('accepter_pret', {
          p_object_id: data.object_id,
          p_emprunteur_id: emprunteurId,
          p_jours: data.days || 1,
          p_pts_jour: data.pts_par_jour || 0,
          p_message_id: messageId
        });

        if (rpcErr) {
          console.error('accepter_pret error:', rpcErr);
          // Messages d'erreur lisibles
          let m = rpcErr.message || 'Erreur';
          if (m.includes('insuffisant')) m = '❌ L\'emprunteur n\'a pas assez de points disponibles pour ce prêt.';
          else if (m.includes('Auto-prêt')) m = '❌ Tu ne peux pas accepter ta propre demande.';
          else if (m.includes('TES objets')) m = '❌ Tu ne peux accepter que pour tes propres objets.';
          alert(m);
          return;
        }

        // Envoyer la carte "accepté" dans le chat
        const payload = { type: 'LOAN_ACCEPT', ...data, loan_id: loanId };
        await sb.from('messages').insert({
          expediteur_id: me.id,
          destinataire_id: emprunteurId,
          contenu: 'LOAN_ACCEPT::' + JSON.stringify(payload)
        });

        // Rafraîchir le profil (points à jour)
        window.currentProfile = null;
        await getCurrentProfile();

        alert('✅ Prêt accepté ! Les points sont bloqués chez l\'emprunteur jusqu\'au retour de l\'objet.\n\nTu pourras confirmer le retour dans ton wallet ou la conversation.');
        await openChat(emprunteurId);
      } catch (e) {
        console.error('loanAccept error:', e);
        alert('Erreur : ' + (e.message || e));
      }
    }

    export async function loanRefuse(messageId) {
      try {
        const { msg, data } = await loanGetOriginal(messageId);
        const me = await getCurrentProfile();
        if (!me) return;
        if (!confirm('Refuser cette demande ?')) return;
        const responseTo = msg.expediteur_id;
        const payload = { type: 'LOAN_REFUSE', ...data };
        const { error } = await sb.from('messages').insert({
          expediteur_id: me.id,
          destinataire_id: responseTo,
          contenu: 'LOAN_REFUSE::' + JSON.stringify(payload)
        });
        if (error) throw error;
        await openChat(responseTo);
      } catch (e) {
        console.error('loanRefuse error:', e);
        alert('Erreur : ' + (e.message || e));
      }
    }

    export async function loanCounter(messageId) {
      try {
        const { msg, data } = await loanGetOriginal(messageId);
        const me = await getCurrentProfile();
        if (!me) return;
        const newDaysStr = prompt('Nouvelle durée proposée (en jours) :', data.days || 1);
        if (newDaysStr === null) return;
        const newDays = Math.max(1, parseInt(newDaysStr, 10) || 1);
        const newPtsStr = prompt('Prix proposé (pts/jour) :', data.pts_par_jour || 0);
        if (newPtsStr === null) return;
        const newPts = Math.max(0, parseInt(newPtsStr, 10) || 0);
        const responseTo = msg.expediteur_id;
        const payload = {
          type: 'LOAN_COUNTER',
          object_id: data.object_id,
          object_titre: data.object_titre,
          pts_par_jour: newPts,
          days: newDays,
          total: newDays * newPts
        };
        const { error } = await sb.from('messages').insert({
          expediteur_id: me.id,
          destinataire_id: responseTo,
          contenu: 'LOAN_COUNTER::' + JSON.stringify(payload)
        });
        if (error) throw error;
        await openChat(responseTo);
      } catch (e) {
        console.error('loanCounter error:', e);
        alert('Erreur : ' + (e.message || e));
      }
    }

    /* ============================================
       SYSTÈME D'AVIS (note + commentaire)
       ============================================ */
    export function renderLoanCard(type, data, m, isMine) {
      const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const days = data.days || 1;
      const total = data.total || 0;
      const titre = (data.object_titre || 'Objet').replace(/</g, '&lt;');

      let badge, color, intro, actions = '';
      if (type === 'LOAN_REQUEST') {
        badge = '📦 Demande d\'emprunt';
        color = '#1D9E75';
        intro = isMine
          ? 'Tu as envoyé une demande pour <strong>' + titre + '</strong>.'
          : 'Te demande d\'emprunter <strong>' + titre + '</strong>.';
        if (!isMine) {
          // Le propriétaire voit des boutons d'action
          actions =
            '<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">' +
              '<button type="button" onclick="loanAccept(\'' + m.id + '\')" style="padding:9px 12px;border:0;border-radius:8px;background:var(--g);color:white;font-family:inherit;font-size:13px;cursor:pointer;font-weight:500;">✓ Accepter</button>' +
              '<button type="button" onclick="loanRefuse(\'' + m.id + '\')" style="padding:9px 12px;border:0;border-radius:8px;background:#FEE2E2;color:#EF4444;font-family:inherit;font-size:13px;cursor:pointer;font-weight:500;">✕ Refuser</button>' +
            '</div>';
        }
      } else if (type === 'LOAN_ACCEPT') {
        badge = '✅ Demande acceptée';
        color = '#22C55E';
        intro = (isMine ? 'Tu as accepté' : 'A accepté') + ' la demande d\'emprunt pour <strong>' + titre + '</strong>.';
        // Le prêteur (celui qui a envoyé l'acceptation = isMine) peut confirmer le retour
        if (isMine && data.loan_id) {
          actions =
            '<div style="margin-top:10px;">' +
              '<button type="button" onclick="confirmerRetour(\'' + data.loan_id + '\')" style="width:100%;padding:10px 12px;border:0;border-radius:8px;background:var(--g);color:white;font-family:inherit;font-size:13px;cursor:pointer;font-weight:500;">📦 Confirmer le retour de l\'objet</button>' +
              '<div style="font-size:11px;color:var(--mu);margin-top:6px;text-align:center;">À cliquer quand l\'emprunteur t\'a rendu l\'objet. Les points seront alors transférés.</div>' +
            '</div>';
        }
      } else if (type === 'LOAN_RETURNED') {
        badge = '🎉 Prêt terminé';
        color = '#085041';
        intro = 'L\'objet <strong>' + titre + '</strong> a été rendu. ' + total + ' pts ont été transférés' + (isMine ? ' à toi' : '') + '.';
      } else if (type === 'LOAN_REFUSE') {
        badge = '✕ Demande refusée';
        color = '#EF4444';
        intro = (isMine ? 'Tu as refusé' : 'A refusé') + ' la demande d\'emprunt pour <strong>' + titre + '</strong>.';
      } else if (type === 'LOAN_COUNTER') {
        badge = '↔ Contre-proposition';
        color = '#F59E0B';
        intro = (isMine ? 'Tu proposes' : 'Te propose') + ' un ajustement pour <strong>' + titre + '</strong>.';
        if (!isMine) {
          actions =
            '<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">' +
              '<button type="button" onclick="loanAccept(\'' + m.id + '\')" style="padding:9px 12px;border:0;border-radius:8px;background:var(--g);color:white;font-family:inherit;font-size:13px;cursor:pointer;font-weight:500;">✓ Accepter</button>' +
              '<button type="button" onclick="loanRefuse(\'' + m.id + '\')" style="padding:9px 12px;border:0;border-radius:8px;background:#FEE2E2;color:#EF4444;font-family:inherit;font-size:13px;cursor:pointer;font-weight:500;">✕ Refuser</button>' +
            '</div>';
        }
      }

      return '<div style="align-self:stretch;background:#f7f7f4;border-radius:14px;padding:12px;margin:6px 0;border-left:3px solid ' + color + ';">' +
        '<div style="font-size:11px;color:' + color + ';text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:6px;">' + badge + '</div>' +
        '<div style="font-size:13px;color:var(--dk);margin-bottom:8px;">' + intro + '</div>' +
        '<div style="background:white;border-radius:8px;padding:8px 10px;font-size:13px;color:var(--dk);">' +
          '<div>📅 ' + days + ' jour' + (days > 1 ? 's' : '') + '</div>' +
          '<div>💎 ' + (data.pts_par_jour || 0) + ' pts/jour</div>' +
          '<div style="font-weight:500;margin-top:4px;">Total : ' + total + ' pts</div>' +
        '</div>' +
        actions +
        '<div style="font-size:10px;color:var(--mu);margin-top:6px;text-align:right;">' + time + '</div>' +
        '</div>';
    }

    /* --- Actions sur une demande de prêt --- */
