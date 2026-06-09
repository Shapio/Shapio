/* features/messages — messagerie & notifications — extrait de index.htm (logique inchangée) */
import { getCurrentProfile } from './profile.js';
import { renderLoanCard } from './loans.js';
import { sb } from '../lib/supabase.js';
import { setTab } from '../lib/dom.js';

    export function shapioWelcomeCard() {
      return '<div role="button" tabindex="0" onclick="openShapioWelcome()" ' +
        'style="display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:6px;border-radius:14px;background:linear-gradient(135deg,rgba(8,80,65,0.06),rgba(29,158,117,0.06));border:1px solid rgba(8,80,65,0.1);cursor:pointer;">' +
        '<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#085041,#1D9E75);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:\'DM Serif Display\',serif;color:white;font-size:22px;">S</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:600;color:var(--dk);font-size:14px;margin-bottom:2px;display:flex;align-items:center;gap:5px;">Shapio <span style="background:var(--g);color:white;border-radius:50%;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;">✓</span></div>' +
          '<div style="font-size:12px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">👋 Bienvenue sur Shapio ! Quelques règles à connaître…</div>' +
        '</div>' +
        '<span style="color:var(--mu);">›</span>' +
        '</div>';
    }

    /* --- Ouvrir le message officiel Shapio (informatif) --- */
    export function openShapioWelcome() {
      setTab('shapio');
    }

    export async function loadMessages() {
      if (!sb) return;
      const listEl = document.getElementById('msgs-list');
      if (!listEl) return;
      const me = await getCurrentProfile();
      if (!me) return;

      try {
        // Récupérer tous les messages où je suis impliqué
        const { data: msgs, error } = await sb.from('messages')
          .select('*, expediteur:expediteur_id(id, prenom, nom, avatar_url), destinataire:destinataire_id(id, prenom, nom, avatar_url)')
          .or('expediteur_id.eq.' + me.id + ',destinataire_id.eq.' + me.id)
          .order('created_at', { ascending: false });
        if (error) throw error;

        if (!msgs || msgs.length === 0) {
          listEl.innerHTML = shapioWelcomeCard() +
            '<div style="padding:40px 24px 60px;text-align:center;color:var(--mu);">' +
            '<div style="font-size:40px;margin-bottom:12px;">💬</div>' +
            '<div style="font-size:14px;color:var(--dk);margin-bottom:4px;font-weight:500;">Aucun message pour l\'instant</div>' +
            '<div style="font-size:13px;line-height:1.5;">Quand tu contacteras un voisin pour emprunter un objet, vos échanges apparaîtront ici.</div>' +
            '</div>';
          return;
        }

        // Regrouper par interlocuteur (la conversation = entre deux personnes)
        const convs = {};
        for (const m of msgs) {
          const other = (m.expediteur_id === me.id) ? m.destinataire : m.expediteur;
          if (!other) continue;
          if (!convs[other.id]) {
            convs[other.id] = { user: other, last: m, count: 0 };
          }
          convs[other.id].count++;
        }

        const items = Object.values(convs).map(c => {
          const u = c.user;
          const name = (u.prenom || 'Membre') + ' ' + (u.nom?.[0] ? u.nom[0] + '.' : '');
          const initials = (u.prenom?.[0] || '?') + (u.nom?.[0] || '');
          const avatar = u.avatar_url
            ? '<div style="width:46px;height:46px;border-radius:50%;background:url(\'' + u.avatar_url + '\') center/cover no-repeat;flex-shrink:0;"></div>'
            : '<div style="width:46px;height:46px;border-radius:50%;background:var(--gl);display:flex;align-items:center;justify-content:center;font-family:\'DM Serif Display\',serif;color:var(--g);flex-shrink:0;">' + initials + '</div>';
          // Preview lisible (pour les messages structurés LOAN_*)
          let lastTxt = c.last.contenu || '';
          if (lastTxt.startsWith('LOAN_REQUEST::')) lastTxt = '📦 Demande d\'emprunt';
          else if (lastTxt.startsWith('LOAN_ACCEPT::')) lastTxt = '✅ Demande acceptée';
          else if (lastTxt.startsWith('LOAN_REFUSE::')) lastTxt = '✕ Demande refusée';
          else if (lastTxt.startsWith('LOAN_COUNTER::')) lastTxt = '↔ Contre-proposition';
          else lastTxt = lastTxt.slice(0, 60);
          return '<div role="button" tabindex="0" onclick="openChat(\'' + u.id + '\')" style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #f0f0ed;cursor:pointer;">' +
            avatar +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-weight:500;color:var(--dk);font-size:14px;margin-bottom:2px;">' + name + '</div>' +
              '<div style="font-size:12px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + lastTxt + '</div>' +
            '</div>' +
            '<span style="color:var(--mu);">›</span>' +
            '</div>';
        }).join('');

        listEl.innerHTML = shapioWelcomeCard() + items;
      } catch (err) {
        console.error('loadMessages error:', err);
        listEl.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--mu);font-size:13px;">Erreur de chargement.</div>';
      }
    }

    /* --- Ouvrir une conversation avec un user --- */
    export async function openChat(otherUserId) {
      if (!sb || !otherUserId) return;
      const me = await getCurrentProfile();
      if (!me) return;
      window.currentChatUserId = otherUserId;

      try {
        // Charger l'autre utilisateur
        const { data: other } = await sb.from('users').select('id, prenom, nom, avatar_url').eq('id', otherUserId).single();

        // Header du chat (nom + avatar)
        const chatName = document.getElementById('chat-name');
        if (chatName && other) chatName.textContent = (other.prenom || 'Membre') + ' ' + (other.nom?.[0] ? other.nom[0] + '.' : '');
        const chatAvatar = document.getElementById('chat-avatar');
        if (chatAvatar && other) {
          if (other.avatar_url) {
            chatAvatar.style.backgroundImage = "url('" + other.avatar_url + "')";
            chatAvatar.style.backgroundSize = 'cover';
            chatAvatar.style.backgroundPosition = 'center';
            chatAvatar.textContent = '';
          } else {
            chatAvatar.style.backgroundImage = '';
            chatAvatar.textContent = (other.prenom?.[0] || '?') + (other.nom?.[0] || '');
          }
        }

        // Charger les messages
        const { data: msgs, error } = await sb.from('messages')
          .select('*')
          .or('and(expediteur_id.eq.' + me.id + ',destinataire_id.eq.' + otherUserId + '),and(expediteur_id.eq.' + otherUserId + ',destinataire_id.eq.' + me.id + ')')
          .order('created_at', { ascending: true });
        if (error) throw error;

        const container = document.getElementById('chatmsgs');
        if (container) {
          container.innerHTML = (msgs || []).map(m => renderChatMessage(m, me.id)).join('');
          container.scrollTop = container.scrollHeight;
        }

        setTab('chat');
      } catch (err) {
        console.error('openChat error:', err);
        alert('Erreur : ' + (err.message || err));
      }
    }

    /* --- Render un message du chat (gère les demandes de prêt) --- */
    export function renderChatMessage(m, myId) {
      const isMine = m.expediteur_id === myId;
      const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const content = m.contenu || '';

      // Détection messages structurés
      const match = content.match(/^(LOAN_REQUEST|LOAN_ACCEPT|LOAN_REFUSE|LOAN_COUNTER|LOAN_RETURNED)::(.+)$/);
      if (match) {
        try {
          const type = match[1];
          const data = JSON.parse(match[2]);
          return renderLoanCard(type, data, m, isMine);
        } catch (e) { /* fallback texte brut */ }
      }

      // Message texte normal
      return '<div style="max-width:100%;display:flex;flex-direction:column;' + (isMine ? 'align-items:flex-end;' : 'align-items:flex-start;') + '">' +
        '<div class="mb ' + (isMine ? 'mout' : 'min') + '">' + content.replace(/</g, '&lt;') + '</div>' +
        '<div class="mt' + (isMine ? ' r' : '') + '">' + time + '</div>' +
        '</div>';
    }

    /* --- Carte spéciale de demande/réponse de prêt --- */
    export async function sendMessage() {
      const input = document.getElementById('chat-input');
      if (!input) return;
      const text = (input.value || '').trim();
      if (!text) return;
      const me = await getCurrentProfile();
      if (!me || !window.currentChatUserId) return;
      try {
        const { error } = await sb.from('messages').insert({
          expediteur_id: me.id,
          destinataire_id: window.currentChatUserId,
          contenu: text
        });
        if (error) throw error;
        input.value = '';
        await openChat(window.currentChatUserId); // recharger
      } catch (err) {
        console.error('sendMessage error:', err);
        alert('Erreur : ' + (err.message || err));
      }
    }
    export async function contactOwner() {
      const o = window.currentObject;
      if (!o || !o.users) { alert('Impossible de trouver le propriétaire.'); return; }
      const me = await getCurrentProfile();
      if (!me) { alert('Tu dois être connecté.'); return; }
      if (me.id === o.users.id) { alert('Tu es le propriétaire de cet objet.'); return; }

      try {
        // Envoyer un premier message pour démarrer la conversation
        const messageText = 'Bonjour, je suis intéressé(e) par ton objet "' + o.titre + '". Est-il disponible ?';
        const { error } = await sb.from('messages').insert({
          expediteur_id: me.id,
          destinataire_id: o.users.id,
          contenu: messageText
        });
        if (error) throw error;
        alert('✅ Message envoyé à ' + (o.users.prenom || 'au propriétaire') + ' ! Tu peux suivre la conversation dans tes messages.');
        setTab('msgs');
      } catch (err) {
        console.error('contactOwner error:', err);
        alert('Erreur lors de l\'envoi du message : ' + (err.message || err));
      }
    }

    /* ---------- NOTIFICATIONS ---------- */
    export function setNotifTab(btn, cat) {
      document.querySelectorAll('.nt-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const items = document.querySelectorAll('#nt-list .nt-item');
      let visibleCount = 0;
      items.forEach(it => {
        const show = (cat === 'all') || (it.getAttribute('data-cat') === cat);
        it.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });
      const empty = document.getElementById('nt-empty');
      if (empty) empty.style.display = (visibleCount === 0) ? 'block' : 'none';
    }

    export function clearNotifs() {
      document.querySelectorAll('#nt-list .nt-item').forEach(it => {
        it.classList.remove('unread');
        const dot = it.querySelector('.nt-dot');
        if (dot) dot.remove();
      });
      // Cacher le point rouge sur la cloche
      const dot = document.querySelector('.ibtn-dot');
      if (dot) dot.classList.add('hidden');
    }

    /* ---------- LEGAL OVERLAY ---------- */
    window.knownMessageCount = 0;
    window.lastSeenMessageCount = 0;
    window.notifInitialized = false;
    export let notifPollingTimer = null;

    export function playNotifSound() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        [880, 1108].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const start = now + i * 0.12;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.3);
        });
        setTimeout(() => { try { ctx.close(); } catch (e) {} }, 800);
      } catch (e) {}
    }

    export function updateMsgsBadge(unread) {
      const badge = document.getElementById('msgs-badge');
      if (!badge) return;
      if (unread > 0) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
      // Pastille cloche aussi
      const dot = document.getElementById('notif-dot');
      if (dot) dot.classList.toggle('hidden', unread === 0);
    }

    export async function checkNewMessages() {
      if (!sb) return;
      try {
        const me = await getCurrentProfile();
        if (!me) return;
        const { count, error } = await sb.from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('destinataire_id', me.id);
        if (error) { console.warn('[notif] erreur count:', error); return; }
        const total = count || 0;

        const activeScreen = document.querySelector('.ascreen.active')?.id;
        const onMessages = (activeScreen === 'as-msgs' || activeScreen === 'as-chat');

        // Première mesure : initialiser sans alerter
        if (!window.notifInitialized) {
          window.notifInitialized = true;
          window.knownMessageCount = total;
          window.lastSeenMessageCount = total;
          return;
        }

        const prev = window.knownMessageCount;
        window.knownMessageCount = total;

        // Nouveau(x) message(s) reçu(s)
        if (total > prev) {
          if (onMessages) {
            // On est sur les messages → rafraîchir la liste/chat en direct
            window.lastSeenMessageCount = total;
            if (activeScreen === 'as-msgs' && typeof loadMessages === 'function') loadMessages();
            else if (activeScreen === 'as-chat' && window.currentChatUserId && typeof openChat === 'function') {
              openChat(window.currentChatUserId);
            }
          } else {
            // Sinon : badge + son
            playNotifSound();
          }
        }

        // Badge = messages reçus non encore "vus"
        if (onMessages) window.lastSeenMessageCount = total;
        const unread = Math.max(0, total - window.lastSeenMessageCount);
        updateMsgsBadge(unread);
      } catch (e) {
        console.error('checkNewMessages error:', e);
      }
    }

    export function startNotificationPolling() {
      if (notifPollingTimer) return;
      setTimeout(checkNewMessages, 1500);
      notifPollingTimer = setInterval(checkNewMessages, 4000);
    }

