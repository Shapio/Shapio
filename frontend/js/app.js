import * as api from './api.js';
import { showLegal } from './modals.js';

// ── State ──
let currentUser = null;
let currentFicheItem = null;
let swipeItems = [];
let swipeIndex = 0;
let prevTab = 'home';
let currentChatUserId = null;

// ── Helpers ──
const $ = id => document.getElementById(id);
const safe = (v, fb = '?') => v || fb;
const initials = name => (name || '').split(' ').map(w => w[0]).join('') || '?';
const fmtTime = iso => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return d.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
};
const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return d.toLocaleDateString('fr', { month: 'long', year: 'numeric' });
};

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:12px;font-size:13px;font-family:'DM Sans',sans-serif;z-index:99999;color:white;background:${type === 'error' ? '#E24B4A' : 'var(--gm)'};box-shadow:0 4px 16px rgba(0,0,0,0.15);`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Navigation ──
function go(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'p-app' && api.isLoggedIn()) loadApp();
}

function setTab(tab) {
  document.querySelectorAll('.ascreen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));

  const screenMap = { home: 'as-home', swipe: 'as-swipe', msgs: 'as-msgs', chat: 'as-chat', wallet: 'as-wallet', profil: 'as-profil', fiche: 'as-fiche' };
  const navMap = { home: 'ni-home', swipe: 'ni-swipe', msgs: 'ni-msgs', wallet: 'ni-wallet', profil: 'ni-profil' };

  if (screenMap[tab]) $(screenMap[tab]).classList.add('active');
  if (navMap[tab]) $(navMap[tab]).classList.add('active');
  if (tab !== 'chat' && tab !== 'fiche') prevTab = tab;
  window.scrollTo(0, 0);

  if (tab === 'home') loadHome();
  if (tab === 'swipe') loadSwipe();
  if (tab === 'msgs') loadMessages();
  if (tab === 'wallet') loadWallet();
  if (tab === 'profil') loadProfile();
}

// ══════════════════════════════════════
// LOGIN
// ══════════════════════════════════════
async function handleLogin() {
  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  const btn = $('login-btn');
  const err = $('login-error');

  if (!email || !password) { err.textContent = 'Remplissez tous les champs'; return; }
  btn.textContent = 'Connexion...'; btn.disabled = true; err.textContent = '';

  try {
    const data = await api.auth.login(email, password);
    api.saveToken(data.token);
    api.saveUserId(data.userId);
    go('p-app');
  } catch (e) {
    err.textContent = e.message;
  } finally {
    btn.textContent = 'Se connecter →'; btn.disabled = false;
  }
}

// ══════════════════════════════════════
// REGISTER
// ══════════════════════════════════════
let registerData = {};

function handleSignupStep1() {
  const fn = $('reg-firstname').value.trim();
  const ln = $('reg-lastname').value.trim();
  const em = $('reg-email').value.trim();
  const ci = $('reg-city').value.trim();
  const err = $('reg-error-1');
  if (!fn || !ln || !em || !ci) { err.textContent = 'Remplissez tous les champs'; return; }
  err.textContent = '';
  registerData = { first_name: fn, last_name: ln, email: em, city: ci };
  go('p-s2');
}

async function handleSignupStep2() {
  const ph = $('reg-phone').value.trim();
  const err = $('reg-error-2');
  if (!ph) { err.textContent = 'Numéro requis'; return; }
  err.textContent = '';
  registerData.phone = '+33' + ph.replace(/\s/g, '');
  try {
    await api.phone.sendCode(registerData.phone);
    go('p-s3');
  } catch (e) { err.textContent = e.message; }
}

async function handleVerifyOTP() {
  const inputs = document.querySelectorAll('#otp-row input');
  const code = Array.from(inputs).map(i => i.value).join('');
  const err = $('reg-error-3');
  if (code.length < 4) { err.textContent = 'Entrez le code à 4 chiffres'; return; }
  err.textContent = '';
  try {
    await api.phone.verify(registerData.phone, code);
    go('p-s4');
  } catch (e) { err.textContent = e.message; }
}

async function handleSignupStep4() {
  const pw = $('reg-password').value;
  const err = $('reg-error-4');
  if (!pw || pw.length < 6) { err.textContent = 'Mot de passe de 6 caractères minimum'; return; }
  err.textContent = '';
  registerData.password = pw;
  const btn = $('reg-final-btn');
  btn.textContent = 'Création...'; btn.disabled = true;
  try {
    const data = await api.auth.register(registerData);
    api.saveToken(data.token); api.saveUserId(data.userId);
    if (registerData.phone) { try { await api.phone.confirm(registerData.phone); } catch (e) { } }
    go('p-app');
  } catch (e) { err.textContent = e.message; }
  finally { btn.textContent = 'Créer mon compte →'; btn.disabled = false; }
}

function handleLogout() {
  api.clearToken(); currentUser = null; go('p-landing');
}

// ══════════════════════════════════════
// LOAD APP
// ══════════════════════════════════════
async function loadApp() {
  try {
    currentUser = await api.users.me();
    $('header-pts').textContent = currentUser.points + ' pts';
    loadHome();
    loadNotifBadge();
  } catch (e) { api.clearToken(); go('p-landing'); }
}

// ══════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════
async function loadNotifBadge() {
  try {
    const data = await api.notifications.get();
    const badge = $('notif-badge');
    if (data.unread_count > 0) {
      badge.textContent = data.unread_count > 9 ? '9+' : data.unread_count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (e) { }
}

function toggleNotifications() {
  const panel = $('notif-panel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    loadNotifPanel();
  } else {
    panel.style.display = 'none';
  }
}

async function loadNotifPanel() {
  try {
    const data = await api.notifications.get();
    const list = $('notif-list');

    if (data.notifications.length === 0) {
      list.innerHTML = '<div style="padding:30px 16px;text-align:center;color:var(--mu);font-size:12px;">Aucune notification.</div>';
      return;
    }

    const icons = { welcome: '🎉', loan_request: '📦', loan_returned: '✓', review: '⭐', points: '💰', message: '💬' };

    list.innerHTML = data.notifications.map(n => {
      const ico = icons[n.type] || '🔔';
      const bg = n.read ? '#fff' : '#f7faf9';
      const dot = n.read ? '' : '<div style="width:6px;height:6px;border-radius:50%;background:var(--gm);flex-shrink:0;"></div>';
      const ago = timeAgo(n.created_at);
      return `
        <div style="padding:12px 16px;border-bottom:0.5px solid #f0f0ed;background:${bg};cursor:pointer;display:flex;gap:10px;align-items:flex-start;" onclick="onNotifClick(${n.id})">
          <div style="width:32px;height:32px;border-radius:9px;background:var(--gl);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">${ico}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:500;color:var(--dk);margin-bottom:2px;">${n.title}</div>
            <div style="font-size:11px;color:var(--mu);line-height:1.4;">${n.body || ''}</div>
            <div style="font-size:10px;color:#bbb;margin-top:3px;">${ago}</div>
          </div>
          ${dot}
        </div>`;
    }).join('');
  } catch (e) { console.error('loadNotifPanel', e); }
}

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + ' h';
  return Math.floor(diff / 86400) + ' j';
}

async function onNotifClick(id) {
  try { await api.notifications.markRead(id); } catch (e) { }
  $('notif-panel').style.display = 'none';
  loadNotifBadge();
}

async function markAllNotifsRead() {
  try {
    await api.notifications.markAllRead();
    loadNotifBadge();
    loadNotifPanel();
  } catch (e) { }
}

// ══════════════════════════════════════
// HOME
// ══════════════════════════════════════
async function loadHome() {
  if (!currentUser) return;
  const u = currentUser;

  $('home-welcome').textContent = `Bienvenue ${safe(u.first_name, '')} ! 👋`;
  $('home-pts').textContent = u.points;
  $('home-city').textContent = `📍 Près de toi · ${u.city}`;

  // Onboarding steps
  const hasItems = u.items && u.items.length > 0;
  const step2 = $('onboard-step-add');
  if (step2 && hasItems) { step2.classList.add('done'); step2.querySelector('.wbsi').textContent = '✓'; }

  try {
    const allItems = await api.items.list({ limit: 12 });
    // Exclude own items
    const others = allItems.filter(it => it.owner_id !== api.getUserId());

    $('home-scroll').innerHTML = others.slice(0, 6).map(it => `
      <div class="ncard" onclick="openFiche(${it.id})">
        <div class="nimg" style="background:${it.bg_color}"><span>${it.icon}</span>
          <div class="npts">${it.points_per_day} pts</div>
        </div>
        <div class="ninfo">
          <div class="nname">${it.title}</div>
          <div class="ndist">${safe(it.owner_name, '')}</div>
        </div>
      </div>`).join('');

    $('home-grid').innerHTML = others.slice(6, 10).map(it => `
      <div class="bcard" onclick="openFiche(${it.id})">
        <div class="bimg" style="background:${it.bg_color}"><span>${it.icon}</span>
          <div class="bpts">${it.points_per_day} pts</div>
        </div>
        <div class="binfo">
          <div class="bname">${it.title}</div>
          <div class="bowner">${safe(it.owner_name, '')} · ★ ${it.owner_rating || '—'}</div>
        </div>
      </div>`).join('');
  } catch (e) { console.error('loadHome', e); }
}

// ══════════════════════════════════════
// FICHE (détail objet)
// ══════════════════════════════════════
async function openFiche(itemId) {
  prevTab = document.querySelector('.ni.active')?.id?.replace('ni-', '') || 'home';

  // Show fiche screen first (loading state)
  document.querySelectorAll('.ascreen').forEach(s => s.classList.remove('active'));
  $('as-fiche').classList.add('active');
  window.scrollTo(0, 0);

  try {
    const item = await api.items.get(itemId);
    currentFicheItem = item;
    const isOwner = item.owner_id === api.getUserId();

    $('fiche-photo').style.background = item.bg_color;
    $('fiche-icon').textContent = item.icon;
    $('fiche-title').textContent = item.title;
    $('fiche-pts-num').textContent = item.points_per_day;
    $('fiche-desc').textContent = item.description || '';
    $('fiche-condition').textContent = item.condition || 'Bon état';
    $('fiche-available').textContent = item.available ? 'Disponible' : 'Indisponible';
    $('fiche-available').className = 'fst ' + (item.available ? 'fst-g' : 'fst-gr');
    $('fiche-owner-initials').textContent = initials(item.owner_name);
    $('fiche-owner-name').innerHTML = `${safe(item.owner_name, '—')} ${item.owner_verified ? '<div class="fobadge">✓ Vérifié</div>' : ''}`;
    $('fiche-owner-rating').textContent = `⭐ ${item.owner_rating || '—'} · ${item.owner_loans || 0} prêts`;
    $('fiche-bar-pts').textContent = item.points_per_day + ' pts';
    $('fiche-weekday').textContent = item.weekday_hours || 'Après 18h';
    $('fiche-weekend').textContent = item.weekend_hours || 'Toute la journée';
    $('fiche-maxdays').textContent = (item.max_duration_days || 7) + ' jours consécutifs';

    // Confirm overlay data
    $('fiche-confirm-icon').textContent = item.icon;
    $('fiche-confirm-pts').textContent = item.points_per_day + ' pts / jour';

    // Reviews
    const revs = $('fiche-reviews');
    if (item.reviews && item.reviews.length > 0) {
      revs.innerHTML = item.reviews.map(r => `
        <div class="frev">
          <div class="frevh">
            <div class="frevav">${initials(r.author_name)}</div>
            <div class="frevn">${safe(r.author_name, '—')}</div>
            <div class="frevs2">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          </div>
          <div class="frevt">${r.comment || ''}</div>
        </div>`).join('');
    } else {
      revs.innerHTML = '<div style="font-size:12px;color:var(--mu);padding:8px 0;">Aucun avis pour le moment.</div>';
    }

    // Bottom bar: owner sees nothing, others see borrow + message
    $('fbar').style.display = isOwner ? 'none' : 'flex';
    $('fiche-msg-btn').style.display = isOwner ? 'none' : '';

    // Reset
    $('fsavebtn').textContent = '♡'; $('fsavebtn').style.color = '';
    $('fiche-confirm').style.display = 'none';
  } catch (e) { console.error('openFiche', e); showToast('Objet introuvable', 'error'); backFromFiche(); }
}

function backFromFiche() { setTab(prevTab || 'home'); }

function toggleFSave() {
  const b = $('fsavebtn');
  const saved = b.textContent === '♡';
  b.textContent = saved ? '♥' : '♡';
  b.style.color = saved ? 'var(--gm)' : '';
  showToast(saved ? 'Ajouté aux favoris' : 'Retiré des favoris');
}

function showFicheConfirm() {
  $('fiche-confirm').style.display = 'block';
  $('fbar').style.display = 'none';
}

function hideFicheConfirm() {
  $('fiche-confirm').style.display = 'none';
  $('fbar').style.display = 'flex';
}

async function confirmBorrow() {
  if (!currentFicheItem) return;
  const btn = $('fiche-confirm-btn');
  btn.textContent = 'Envoi...'; btn.disabled = true;
  try {
    await api.loans.create(currentFicheItem.id, 1);
    hideFicheConfirm();
    currentUser = await api.users.me();
    $('header-pts').textContent = currentUser.points + ' pts';
    showToast(`${currentFicheItem.points_per_day} pts bloqués — demande envoyée !`);
    backFromFiche();
  } catch (e) { showToast(e.message, 'error'); }
  finally { btn.textContent = 'Envoyer la demande'; btn.disabled = false; }
}

// Message owner from fiche
function messageOwner() {
  if (!currentFicheItem) return;
  openChat(currentFicheItem.owner_id);
}

// ══════════════════════════════════════
// SWIPE
// ══════════════════════════════════════
async function loadSwipe(category) {
  try {
    swipeItems = await api.swipes.unswiped(category);
    swipeIndex = 0;
    renderSwipeCards();

    $('browse-grid').innerHTML = swipeItems.map(it => `
      <div class="bcard" onclick="openFiche(${it.id})">
        <div class="bimg" style="background:${it.bg_color}"><span>${it.icon}</span>
          <div class="bpts">${it.points_per_day} pts</div>
        </div>
        <div class="binfo">
          <div class="bname">${it.title}</div>
          <div class="bowner">${safe(it.owner_name, '')} ★ ${it.owner_rating || '—'}</div>
        </div>
      </div>`).join('');
    $('browse-count').textContent = `${swipeItems.length} objets disponibles`;
  } catch (e) { console.error('loadSwipe', e); }
}

function renderSwipeCards() {
  const front = $('cfront'), back = $('cback'), empty = $('swipe-empty');
  const stack = $('cstack'), btns = $('swipe-btns'), labels = $('swipe-labels');

  if (swipeIndex >= swipeItems.length) {
    stack.style.display = 'none'; btns.style.display = 'none'; labels.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  stack.style.display = 'flex'; btns.style.display = 'flex'; labels.style.display = 'flex';
  empty.style.display = 'none';

  const c = swipeItems[swipeIndex];
  front.innerHTML = `
    <div class="cphoto" style="background:${c.bg_color}">
      <span style="font-size:68px">${c.icon}</span>
      <div class="cbadge">${c.points_per_day} pts</div>
    </div>
    <div class="cbody" onclick="openFiche(${c.id})">
      <div class="ctitle">${c.title}</div>
      <div class="cowner">
        <div class="cav">${initials(c.owner_name)}</div><span>${safe(c.owner_name, '')}</span>
        <span class="cstars">★★★★★</span><span style="font-size:11px;color:var(--mu)">${c.owner_rating || '—'}</span>
      </div>
      <div class="ctags"><span class="ctag">${c.category || 'Autre'}</span></div>
    </div>`;

  if (swipeIndex + 1 < swipeItems.length) {
    const n = swipeItems[swipeIndex + 1];
    back.style.display = 'block';
    back.innerHTML = `<div class="cphoto" style="background:${n.bg_color}"><span style="font-size:68px">${n.icon}</span></div><div class="cbody"><div class="ctitle">${n.title}</div></div>`;
  } else {
    back.style.display = 'none';
  }
}

async function swipe(direction) {
  if (swipeIndex >= swipeItems.length) return;
  const front = $('cfront'), item = swipeItems[swipeIndex];
  front.classList.add(direction === 'right' ? 'swright' : 'swleft');

  try {
    const result = await api.swipes.record(item.id, direction);
    if (result.match && direction === 'right') {
      setTimeout(() => {
        front.classList.remove('swright', 'swleft');
        $('swipe-mode').style.display = 'none';
        $('match-ov').style.display = 'block';
        $('match-icon').textContent = item.icon;
        $('match-title').textContent = item.title;
        $('match-owner').textContent = safe(item.owner_name, '');
        $('match-pts-val').textContent = item.points_per_day + ' pts';
        currentFicheItem = item; // for messaging
      }, 350);
      return;
    }
  } catch (e) { }

  setTimeout(() => {
    swipeIndex++;
    front.classList.remove('swright', 'swleft');
    renderSwipeCards();
  }, 350);
}

function closeMatch() {
  $('match-ov').style.display = 'none'; $('swipe-mode').style.display = 'block';
  swipeIndex++; renderSwipeCards();
}

function matchMessage() {
  $('match-ov').style.display = 'none'; $('swipe-mode').style.display = 'block';
  if (currentFicheItem) openChat(currentFicheItem.owner_id);
}

function setSwipeMode(mode) {
  $('swipe-mode').style.display = mode === 'swipe' ? 'block' : 'none';
  $('browse-mode').style.display = mode === 'browse' ? 'block' : 'none';
  $('mt-swipe').classList.toggle('active', mode === 'swipe');
  $('mt-browse').classList.toggle('active', mode === 'browse');
}

function filterSwipe(category, chip) {
  document.querySelectorAll('.fchip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  loadSwipe(category);
}

// ══════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════
async function loadMessages() {
  try {
    const convs = await api.messages.conversations();
    const list = $('msg-list'), chips = $('msg-chips');

    if (convs.length === 0) {
      list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--mu);font-size:13px;line-height:1.6;">Aucune conversation.<br>Envoie un message depuis la fiche d\'un objet !</div>';
      chips.innerHTML = '';
      return;
    }

    chips.innerHTML = convs.slice(0, 5).map(c => `
      <div class="mchip" onclick="openChat(${c.contact_id})">
        <div class="mchipav">${initials(c.contact_name)}</div><span>${(c.contact_name || '').split(' ')[0] || '?'}</span>
      </div>`).join('');

    list.innerHTML = convs.map(c => `
      <div class="conv" onclick="openChat(${c.contact_id})">
        <div class="convav">${initials(c.contact_name)}</div>
        <div class="convinfo">
          <div class="convname">${safe(c.contact_name, '—')}</div>
          <div class="convprev">${c.last_message || ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <span class="convtime">${fmtTime(c.last_message_at)}</span>
          ${c.unread_count > 0 ? '<div class="undot"></div>' : ''}
        </div>
      </div>`).join('');
  } catch (e) { console.error('loadMessages', e); }
}

async function openChat(userId) {
  currentChatUserId = userId;

  // Switch to chat screen without triggering data loads for other tabs
  document.querySelectorAll('.ascreen').forEach(s => s.classList.remove('active'));
  $('as-chat').classList.add('active');
  // Keep msgs nav highlighted
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  $('ni-msgs').classList.add('active');
  window.scrollTo(0, 0);

  try {
    const contact = await api.users.get(userId);
    $('chat-name').textContent = safe(contact.first_name, '') + ' ' + safe(contact.last_name, '');
    $('chat-avatar').textContent = initials(contact.first_name + ' ' + contact.last_name);
    renderChatMessages();
  } catch (e) { console.error('openChat', e); }
}

async function renderChatMessages() {
  if (!currentChatUserId) return;
  const msgs = await api.messages.get(currentChatUserId);
  const container = $('chat-messages');
  const myId = api.getUserId();

  if (msgs.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--mu);font-size:13px;">Commence la conversation !</div>';
  } else {
    container.innerHTML = msgs.map(m => {
      const isMine = m.sender_id === myId;
      return `
        <div${isMine ? ' style="align-self:flex-end"' : ''}>
          <div class="mb ${isMine ? 'mout' : 'min'}">${m.content}</div>
          <div class="mt${isMine ? ' r' : ''}">${fmtTime(m.created_at)}</div>
        </div>`;
    }).join('');
  }
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  if (!currentChatUserId) return;
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  try {
    await api.messages.send(currentChatUserId, text);
    await renderChatMessages();
  } catch (e) { showToast('Erreur envoi', 'error'); }
}

// New conversation starter (from user list)
async function startNewConversation() {
  // Load all users we've interacted with (from items)
  try {
    const allItems = await api.items.list({ limit: 50 });
    const owners = new Map();
    allItems.forEach(it => {
      if (it.owner_id !== api.getUserId()) {
        owners.set(it.owner_id, it.owner_name);
      }
    });

    if (owners.size === 0) {
      showToast('Explore des objets pour pouvoir contacter des prêteurs', 'error');
      return;
    }

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    let items = '';
    owners.forEach((name, id) => {
      items += `<div onclick="this.closest('[data-modal]').remove();openChat(${id})" style="display:flex;align-items:center;gap:10px;padding:11px;border-radius:11px;background:#f7f7f4;border:0.5px solid #ebebea;cursor:pointer;margin-bottom:6px;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--gl);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--g);">${initials(name)}</div>
        <div style="font-size:14px;color:var(--dk);">${name}</div>
      </div>`;
    });
    modal.setAttribute('data-modal', '');
    modal.innerHTML = `<div style="background:white;border-radius:20px;padding:28px;max-width:420px;width:100%;font-family:'DM Sans',sans-serif;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="font-family:'DM Serif Display',serif;font-size:18px;color:var(--dk);">Nouvelle conversation</h3>
        <button onclick="this.closest('[data-modal]').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888;">✕</button>
      </div>
      ${items}
    </div>`;
    document.body.appendChild(modal);
  } catch (e) { console.error(e); }
}

// ══════════════════════════════════════
// WALLET
// ══════════════════════════════════════
async function loadWallet() {
  try {
    const data = await api.wallet.get();
    const now = new Date();
    $('wallet-month').textContent = now.toLocaleDateString('fr', { month: 'long', year: 'numeric' });
    $('wallet-pts').textContent = data.points;
    $('wallet-bar').style.width = Math.min(data.points, 100) + '%';
    $('wallet-locked').textContent = data.locked + ' pts';
    $('wallet-earned').textContent = '+' + data.earned_this_month + ' pts';
    $('wallet-spent').textContent = data.spent_this_month + ' pts';

    $('tx-list').innerHTML = data.transactions.length === 0
      ? '<div style="padding:20px;text-align:center;color:var(--mu);font-size:12px;">Aucune transaction.</div>'
      : data.transactions.map(tx => {
        let icoClass = 'txig', icoText = '✓', ptsClass = 'txp';
        if (tx.type === 'locked') { icoClass = 'txia'; icoText = '🔒'; ptsClass = 'txbl'; }
        else if (tx.type === 'bonus') { icoText = '🎁'; }
        else if (tx.amount < 0) { icoClass = 'txir'; icoText = '↓'; ptsClass = 'txm'; }
        const sign = tx.amount > 0 ? '+' : '';
        return `
          <div class="tx">
            <div class="txico ${icoClass}">${icoText}</div>
            <div class="txinfo">
              <div class="txttl">${tx.description || '—'}</div>
              <div class="txsub">${tx.type === 'locked' ? 'Bloqués · en attente retour' : tx.type === 'bonus' ? 'Bienvenue sur Shapio !' : tx.type === 'loan_earned' ? 'Prêt terminé' : 'Transaction'}</div>
            </div>
            <div class="txpts ${ptsClass}">${sign}${tx.amount} pts</div>
          </div>`;
      }).join('');
  } catch (e) { console.error('loadWallet', e); }
}

// ══════════════════════════════════════
// PROFILE
// ══════════════════════════════════════
async function loadProfile() {
  try {
    currentUser = await api.users.me();
    const u = currentUser;

    $('header-pts').textContent = u.points + ' pts';
    $('prof-initials').textContent = ((u.first_name || '?')[0] + (u.last_name || '?')[0]).toUpperCase();
    $('prof-name').textContent = safe(u.first_name, '') + ' ' + safe(u.last_name, '');
    $('prof-badge').style.display = u.id_verified ? '' : 'none';
    $('prof-sub').textContent = `📍 ${u.city || '—'} · Membre depuis ${fmtDate(u.created_at)}`;
    $('prof-pts').textContent = u.points;
    $('prof-loans').textContent = u.total_loans;
    $('prof-borrows').textContent = u.total_borrows;
    $('prof-rating').textContent = u.rating || '—';

    $('verif-phone').className = 'ptico ' + (u.phone_verified ? 'ptdone' : 'ptpend');
    $('verif-phone').textContent = u.phone_verified ? '✓' : '–';
    $('verif-id').className = 'ptico ' + (u.id_verified ? 'ptdone' : 'ptpend');
    $('verif-id').textContent = u.id_verified ? '✓' : '–';
    $('verif-selfie').className = 'ptico ' + (u.selfie_verified ? 'ptdone' : 'ptpend');
    $('verif-selfie').textContent = u.selfie_verified ? '✓' : '–';

    // Items
    $('prof-items-grid').innerHTML = (u.items || []).map(it => `
      <div class="pocard" onclick="openFiche(${it.id})">
        <div class="poimg" style="background:${it.bg_color}"><span>${it.icon}</span>
          <div class="popts">${it.points_per_day} pts</div>
          <div class="post ${it.available ? 'post-on' : 'post-off'}">${it.available ? 'Dispo' : 'Indispo'}</div>
        </div>
        <div class="poinfo"><div class="ponm">${it.title}</div></div>
      </div>`).join('') + `
      <div class="pocard" onclick="showAddItem()" style="border-style:dashed;display:flex;align-items:center;justify-content:center;min-height:120px;background:#f7f7f4;cursor:pointer;">
        <div style="text-align:center;"><div style="font-size:20px;color:var(--mu);">+</div><div style="font-size:11px;color:var(--mu);margin-top:3px;">Ajouter</div></div>
      </div>`;

    // Reviews
    const rc = $('prof-reviews');
    if (u.reviews && u.reviews.length > 0) {
      $('prof-review-score').textContent = u.rating || '—';
      $('prof-review-count').textContent = u.reviews.length + ' avis reçus';
      rc.innerHTML = u.reviews.map(r => `
        <div class="paviscard">
          <div class="pavish">
            <div class="pavisav">${initials(r.author_name)}</div>
            <div class="pavisnm">${safe(r.author_name, '—')}</div>
            <div class="pavisst">${'★'.repeat(r.rating)}</div>
          </div>
          <div class="pavist">${r.comment || ''}</div>
        </div>`).join('');
    } else {
      rc.innerHTML = '<div style="font-size:12px;color:var(--mu);padding:8px 14px;">Aucun avis reçu.</div>';
    }
  } catch (e) { console.error('loadProfile', e); }
}

function ptab(name, btn) {
  ['objets', 'avis', 'settings'].forEach(t => $('pt-' + t).style.display = t === name ? '' : 'none');
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

// ══════════════════════════════════════
// ADD ITEM
// ══════════════════════════════════════
function showAddItem() { $('add-item-modal').style.display = 'flex'; }
function hideAddItem() { $('add-item-modal').style.display = 'none'; }

async function submitAddItem() {
  const title = $('add-title').value.trim();
  const description = $('add-desc').value.trim();
  const pts = Number($('add-pts').value);
  const category = $('add-category').value;
  const icon = $('add-icon').value || '📦';
  const err = $('add-error');

  if (!title || !pts) { err.textContent = 'Titre et prix requis'; return; }
  err.textContent = '';

  try {
    await api.items.create({ title, description, points_per_day: pts, category, icon });
    hideAddItem();
    $('add-title').value = ''; $('add-desc').value = ''; $('add-pts').value = ''; $('add-icon').value = '';
    showToast('Objet publié !');
    // Refresh current tab
    if ($('as-profil').classList.contains('active')) loadProfile();
    else loadHome();
  } catch (e) { err.textContent = e.message; }
}

// ══════════════════════════════════════
// SETUP
// ══════════════════════════════════════
function setupOtpInputs() {
  const inputs = document.querySelectorAll('#otp-row input');
  inputs.forEach((input, i) => {
    input.addEventListener('input', () => { if (input.value.length === 1 && i < inputs.length - 1) inputs[i + 1].focus(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus(); });
  });
}

function setupChatInput() {
  const input = $('chat-input');
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

function setupLoginInputs() {
  const pw = $('login-password');
  if (pw) pw.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
}

function init() {
  setupOtpInputs();
  setupChatInput();
  setupLoginInputs();
  if (api.isLoggedIn()) go('p-app');
}

// Expose to HTML
Object.assign(window, {
  go, setTab, openFiche, backFromFiche, toggleFSave, showFicheConfirm, hideFicheConfirm,
  confirmBorrow, messageOwner, swipe, closeMatch, matchMessage, setSwipeMode, filterSwipe,
  ptab, showLegal, handleLogin, handleSignupStep1, handleSignupStep2, handleVerifyOTP,
  handleSignupStep4, handleLogout, openChat, sendMessage, startNewConversation,
  showAddItem, hideAddItem, submitAddItem,
  toggleNotifications, markAllNotifsRead, onNotifClick,
});

document.addEventListener('DOMContentLoaded', init);
