import * as api from './api.js';
import { showLegal } from './modals.js';

// ── State ──
let currentUser = null;
let currentFicheItem = null;
let swipeItems = [];
let swipeIndex = 0;
let prevTab = 'home';
let currentChatUserId = null;

// ── Navigation ──
function go(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);

  if (id === 'p-app' && api.isLoggedIn()) {
    loadApp();
  }
}

function setTab(tab) {
  document.querySelectorAll('.ascreen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));

  const screenMap = { home:'as-home', swipe:'as-swipe', msgs:'as-msgs', chat:'as-chat', wallet:'as-wallet', profil:'as-profil', fiche:'as-fiche' };
  const navMap = { home:'ni-home', swipe:'ni-swipe', msgs:'ni-msgs', wallet:'ni-wallet', profil:'ni-profil' };

  if (screenMap[tab]) document.getElementById(screenMap[tab]).classList.add('active');
  if (navMap[tab]) document.getElementById(navMap[tab]).classList.add('active');
  if (tab !== 'chat' && tab !== 'fiche') prevTab = tab;
  window.scrollTo(0, 0);

  // Charger les données pour chaque tab
  if (tab === 'home') loadHome();
  if (tab === 'swipe') loadSwipe();
  if (tab === 'msgs') loadMessages();
  if (tab === 'wallet') loadWallet();
  if (tab === 'profil') loadProfile();
}

// ── Login ──
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');

  if (!email || !password) { err.textContent = 'Remplissez tous les champs'; return; }

  btn.textContent = 'Connexion...';
  btn.disabled = true;
  err.textContent = '';

  try {
    const data = await api.auth.login(email, password);
    api.saveToken(data.token);
    api.saveUserId(data.userId);
    go('p-app');
  } catch (e) {
    err.textContent = e.message;
  } finally {
    btn.textContent = 'Se connecter →';
    btn.disabled = false;
  }
}

// ── Register ──
let registerData = {};

function handleSignupStep1() {
  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName = document.getElementById('reg-lastname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const city = document.getElementById('reg-city').value.trim();
  const err = document.getElementById('reg-error-1');

  if (!firstName || !lastName || !email || !city) { err.textContent = 'Remplissez tous les champs'; return; }
  err.textContent = '';

  registerData = { first_name: firstName, last_name: lastName, email, city, password: 'temp' };
  go('p-s2');
}

async function handleSignupStep2() {
  const phoneInput = document.getElementById('reg-phone').value.trim();
  const err = document.getElementById('reg-error-2');

  if (!phoneInput) { err.textContent = 'Numéro requis'; return; }
  err.textContent = '';

  const fullPhone = '+33' + phoneInput.replace(/\s/g, '');
  registerData.phone = fullPhone;

  try {
    const result = await api.phone.sendCode(fullPhone);
    document.getElementById('phone-display').textContent = phoneInput.replace(/(\d{2})(?=\d)/g, '$1 ').replace(/(\d)\d{6}(\d{2})/, '$1• •• •• $2');
    go('p-s3');
  } catch (e) {
    err.textContent = e.message;
  }
}

async function handleVerifyOTP() {
  const inputs = document.querySelectorAll('#otp-row input');
  const code = Array.from(inputs).map(i => i.value).join('');
  const err = document.getElementById('reg-error-3');

  if (code.length < 4) { err.textContent = 'Entrez le code à 4 chiffres'; return; }
  err.textContent = '';

  try {
    await api.phone.verify(registerData.phone, code);
    go('p-s4');
  } catch (e) {
    err.textContent = e.message;
  }
}

async function handleSignupStep4() {
  const passwordInput = document.getElementById('reg-password').value;
  const err = document.getElementById('reg-error-4');

  if (!passwordInput || passwordInput.length < 6) { err.textContent = 'Mot de passe de 6 caractères minimum'; return; }
  err.textContent = '';

  registerData.password = passwordInput;

  const btn = document.getElementById('reg-final-btn');
  btn.textContent = 'Création...';
  btn.disabled = true;

  try {
    const data = await api.auth.register(registerData);
    api.saveToken(data.token);
    api.saveUserId(data.userId);

    // Confirmer le téléphone
    if (registerData.phone) {
      try { await api.phone.confirm(registerData.phone); } catch(e) {}
    }

    go('p-app');
  } catch (e) {
    err.textContent = e.message;
  } finally {
    btn.textContent = 'Créer mon compte →';
    btn.disabled = false;
  }
}

function handleLogout() {
  api.clearToken();
  currentUser = null;
  go('p-landing');
}

// ── Load App ──
async function loadApp() {
  try {
    currentUser = await api.users.me();
    // Update header
    document.getElementById('header-pts').textContent = currentUser.points + ' pts';
    loadHome();
  } catch (e) {
    // Token expiré
    api.clearToken();
    go('p-landing');
  }
}

// ── Home ──
async function loadHome() {
  if (!currentUser) return;

  // Banner
  document.getElementById('home-welcome').textContent = `Bienvenue ${currentUser.first_name} ! 👋`;
  document.getElementById('home-pts').textContent = currentUser.points;
  document.getElementById('home-city').textContent = `📍 Près de toi · ${currentUser.city}`;

  // Items proches
  try {
    const allItems = await api.items.list({ limit: 12 });

    // Scroll horizontal (4 premiers)
    const scroll = document.getElementById('home-scroll');
    scroll.innerHTML = allItems.slice(0, 4).map(it => `
      <div class="ncard" onclick="openFiche(${it.id})">
        <div class="nimg" style="background:${it.bg_color}"><span>${it.icon}</span>
          <div class="npts">${it.points_per_day} pts</div>
        </div>
        <div class="ninfo">
          <div class="nname">${it.title}</div>
          <div class="ndist">${it.owner_name}</div>
        </div>
      </div>
    `).join('');

    // Grille découvrir (4 suivants)
    const grid = document.getElementById('home-grid');
    grid.innerHTML = allItems.slice(4, 8).map(it => `
      <div class="bcard" onclick="openFiche(${it.id})">
        <div class="bimg" style="background:${it.bg_color}"><span>${it.icon}</span>
          <div class="bpts">${it.points_per_day} pts</div>
        </div>
        <div class="binfo">
          <div class="bname">${it.title}</div>
          <div class="bowner">${it.owner_name} · ★ ${it.owner_rating || '—'}</div>
        </div>
      </div>
    `).join('');
  } catch (e) { console.error('loadHome', e); }
}

// ── Fiche (détail objet) ──
async function openFiche(itemId) {
  prevTab = document.querySelector('.ni.active')?.id?.replace('ni-', '') || 'home';
  setTab('fiche');

  try {
    const item = await api.items.get(itemId);
    currentFicheItem = item;

    document.getElementById('fiche-photo').style.background = item.bg_color;
    document.getElementById('fiche-icon').textContent = item.icon;
    document.getElementById('fiche-title').textContent = item.title;
    document.getElementById('fiche-pts-num').textContent = item.points_per_day;
    document.getElementById('fiche-desc').textContent = item.description || '';
    document.getElementById('fiche-condition').textContent = item.condition;
    document.getElementById('fiche-available').textContent = item.available ? 'Disponible' : 'Indisponible';
    document.getElementById('fiche-available').className = 'fst ' + (item.available ? 'fst-g' : 'fst-gr');
    document.getElementById('fiche-owner-rating').textContent = `⭐ ${item.owner_rating || '—'} · ${item.owner_loans || 0} prêts`;
    document.getElementById('fiche-owner-name').innerHTML = `${item.owner_name} <div class="fobadge">${item.owner_verified ? '✓ Vérifié' : 'Non vérifié'}</div>`;
    document.getElementById('fiche-owner-initials').textContent = item.owner_name.split(' ').map(w=>w[0]).join('');
    document.getElementById('fiche-bar-pts').textContent = item.points_per_day + ' pts';
    document.getElementById('fiche-weekday').textContent = item.weekday_hours || 'Après 18h';
    document.getElementById('fiche-weekend').textContent = item.weekend_hours || 'Toute la journée';
    document.getElementById('fiche-maxdays').textContent = (item.max_duration_days || 7) + ' jours consécutifs';

    // Confirm overlay
    document.getElementById('fiche-confirm-icon').textContent = item.icon;
    document.getElementById('fiche-confirm-pts').textContent = item.points_per_day + ' pts / jour';

    // Avis
    const revs = document.getElementById('fiche-reviews');
    if (item.reviews && item.reviews.length > 0) {
      revs.innerHTML = item.reviews.map(r => `
        <div class="frev">
          <div class="frevh">
            <div class="frevav">${r.author_name.split(' ').map(w=>w[0]).join('')}</div>
            <div class="frevn">${r.author_name}</div>
            <div class="frevs2">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
          </div>
          <div class="frevt">${r.comment || ''}</div>
        </div>
      `).join('');
    } else {
      revs.innerHTML = '<div style="font-size:12px;color:var(--mu);padding:8px 0;">Aucun avis pour le moment.</div>';
    }

    // Cacher le bouton emprunter si c'est notre objet
    const isOwner = item.owner_id === api.getUserId();
    document.getElementById('fbar').style.display = isOwner ? 'none' : 'flex';

    // Reset save button
    const saveBtn = document.getElementById('fsavebtn');
    saveBtn.textContent = '♡';
    saveBtn.style.color = '';
    document.getElementById('fiche-confirm').style.display = 'none';

  } catch (e) {
    console.error('openFiche', e);
  }
}

function backFromFiche() { setTab(prevTab || 'home'); }
function toggleFSave() {
  const b = document.getElementById('fsavebtn');
  b.textContent = b.textContent === '♡' ? '♥' : '♡';
  b.style.color = b.textContent === '♥' ? 'var(--gm)' : '';
}
function showFicheConfirm() {
  document.getElementById('fiche-confirm').style.display = 'block';
  document.getElementById('fbar').style.display = 'none';
}
function hideFicheConfirm() {
  document.getElementById('fiche-confirm').style.display = 'none';
  document.getElementById('fbar').style.display = 'flex';
}

async function confirmBorrow() {
  if (!currentFicheItem) return;
  const btn = document.getElementById('fiche-confirm-btn');
  btn.textContent = 'Envoi...';
  btn.disabled = true;

  try {
    await api.loans.create(currentFicheItem.id, 1);
    hideFicheConfirm();
    // Refresh user
    currentUser = await api.users.me();
    document.getElementById('header-pts').textContent = currentUser.points + ' pts';
    alert('Demande envoyée ! Points bloqués.');
    backFromFiche();
  } catch (e) {
    alert(e.message);
  } finally {
    btn.textContent = 'Envoyer la demande';
    btn.disabled = false;
  }
}

// ── Swipe ──
async function loadSwipe(category) {
  try {
    swipeItems = await api.swipes.unswiped(category);
    swipeIndex = 0;
    renderSwipeCards();
    // Browse mode
    const browseGrid = document.getElementById('browse-grid');
    browseGrid.innerHTML = swipeItems.map(it => `
      <div class="bcard" onclick="openFiche(${it.id})">
        <div class="bimg" style="background:${it.bg_color}"><span>${it.icon}</span>
          <div class="bpts">${it.points_per_day} pts</div>
        </div>
        <div class="binfo">
          <div class="bname">${it.title}</div>
          <div class="bowner">${it.owner_name} ★ ${it.owner_rating || '—'}</div>
        </div>
      </div>
    `).join('');
    document.getElementById('browse-count').textContent = `${swipeItems.length} objets disponibles`;
  } catch (e) { console.error('loadSwipe', e); }
}

function renderSwipeCards() {
  const front = document.getElementById('cfront');
  const back = document.getElementById('cback');
  const empty = document.getElementById('swipe-empty');
  const stack = document.getElementById('cstack');
  const actions = document.getElementById('swipe-actions');

  if (swipeIndex >= swipeItems.length) {
    stack.style.display = 'none';
    actions.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  stack.style.display = 'flex';
  actions.style.display = 'flex';
  empty.style.display = 'none';

  const c = swipeItems[swipeIndex];
  const initials = c.owner_name.split(' ').map(w => w[0]).join('');
  front.innerHTML = `
    <div class="cphoto" style="background:${c.bg_color}"><span style="font-size:68px">${c.icon}</span>
      <div class="cbadge">${c.points_per_day} pts</div>
    </div>
    <div class="cbody">
      <div class="ctitle">${c.title}</div>
      <div class="cowner">
        <div class="cav">${initials}</div><span>${c.owner_name}</span>
        <span class="cstars">★★★★★</span><span style="font-size:11px;color:var(--mu)">${c.owner_rating || '—'}</span>
      </div>
      <div class="ctags"><span class="ctag">${c.category}</span></div>
    </div>`;

  if (swipeIndex + 1 < swipeItems.length) {
    const n = swipeItems[swipeIndex + 1];
    back.style.display = 'block';
    back.innerHTML = `
      <div class="cphoto" style="background:${n.bg_color}"><span style="font-size:68px">${n.icon}</span></div>
      <div class="cbody"><div class="ctitle">${n.title}</div></div>`;
  } else {
    back.style.display = 'none';
  }
}

async function swipe(direction) {
  if (swipeIndex >= swipeItems.length) return;

  const front = document.getElementById('cfront');
  const item = swipeItems[swipeIndex];

  front.classList.add(direction === 'right' ? 'swright' : 'swleft');

  // Record swipe
  try {
    const result = await api.swipes.record(item.id, direction);
    if (result.match && direction === 'right') {
      setTimeout(() => {
        front.classList.remove('swright', 'swleft');
        document.getElementById('swipe-mode').style.display = 'none';
        document.getElementById('match-ov').style.display = 'block';
        document.getElementById('match-icon').textContent = item.icon;
        document.getElementById('match-name').textContent = item.owner_name;
        document.getElementById('match-pts').innerHTML = `<strong style="color:white;">${item.points_per_day} pts seront bloqués</strong> jusqu'au retour`;
      }, 350);
      return;
    }
  } catch (e) {}

  setTimeout(() => {
    swipeIndex++;
    front.classList.remove('swright', 'swleft');
    renderSwipeCards();
  }, 350);
}

function closeMatch() {
  document.getElementById('match-ov').style.display = 'none';
  document.getElementById('swipe-mode').style.display = 'block';
  swipeIndex++;
  renderSwipeCards();
}

function setSwipeMode(mode) {
  document.getElementById('swipe-mode').style.display = mode === 'swipe' ? 'block' : 'none';
  document.getElementById('browse-mode').style.display = mode === 'browse' ? 'block' : 'none';
  document.getElementById('mt-swipe').classList.toggle('active', mode === 'swipe');
  document.getElementById('mt-browse').classList.toggle('active', mode === 'browse');
}

function filterSwipe(category, chip) {
  document.querySelectorAll('.fchip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  loadSwipe(category);
}

// ── Messages ──
async function loadMessages() {
  try {
    const convs = await api.messages.conversations();
    const list = document.getElementById('msg-list');
    const chips = document.getElementById('msg-chips');

    if (convs.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--mu);font-size:13px;">Aucune conversation pour le moment.</div>';
      chips.innerHTML = '';
      return;
    }

    chips.innerHTML = convs.slice(0, 5).map(c => `
      <div class="mchip" onclick="openChat(${c.contact_id})">
        <div class="mchipav">${c.contact_name[0]}</div><span>${c.contact_name.split(' ')[0]}</span>
      </div>
    `).join('');

    list.innerHTML = convs.map(c => {
      const time = c.last_message_at ? new Date(c.last_message_at + 'Z').toLocaleTimeString('fr', {hour:'2-digit',minute:'2-digit'}) : '';
      return `
        <div class="conv" onclick="openChat(${c.contact_id})">
          <div class="convav">${c.contact_name[0]}</div>
          <div class="convinfo">
            <div class="convname">${c.contact_name}</div>
            <div class="convprev">${c.last_message || ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            <span class="convtime">${time}</span>
            ${c.unread_count > 0 ? '<div class="undot"></div>' : ''}
          </div>
        </div>`;
    }).join('');
  } catch (e) { console.error('loadMessages', e); }
}

async function openChat(userId) {
  currentChatUserId = userId;
  setTab('chat');

  try {
    // Get contact info
    const contact = await api.users.get(userId);
    document.getElementById('chat-name').textContent = contact.first_name + ' ' + contact.last_name;
    document.getElementById('chat-avatar').textContent = contact.first_name[0];

    // Load messages
    const msgs = await api.messages.get(userId);
    const container = document.getElementById('chat-messages');
    const myId = api.getUserId();

    container.innerHTML = msgs.map(m => {
      const isMine = m.sender_id === myId;
      const time = new Date(m.created_at + 'Z').toLocaleTimeString('fr', {hour:'2-digit',minute:'2-digit'});
      return `
        <div${isMine ? ' style="align-self:flex-end"' : ''}>
          <div class="mb ${isMine ? 'mout' : 'min'}">${m.content}</div>
          <div class="mt${isMine ? ' r' : ''}">${time}</div>
        </div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
  } catch (e) { console.error('openChat', e); }
}

async function sendMessage() {
  if (!currentChatUserId) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  try {
    await api.messages.send(currentChatUserId, text);
    // Re-render
    const msgs = await api.messages.get(currentChatUserId);
    const container = document.getElementById('chat-messages');
    const myId = api.getUserId();

    container.innerHTML = msgs.map(m => {
      const isMine = m.sender_id === myId;
      const time = new Date(m.created_at + 'Z').toLocaleTimeString('fr', {hour:'2-digit',minute:'2-digit'});
      return `
        <div${isMine ? ' style="align-self:flex-end"' : ''}>
          <div class="mb ${isMine ? 'mout' : 'min'}">${m.content}</div>
          <div class="mt${isMine ? ' r' : ''}">${time}</div>
        </div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
  } catch (e) { console.error('sendMessage', e); }
}

// ── Wallet ──
async function loadWallet() {
  try {
    const data = await api.wallet.get();

    document.getElementById('wallet-pts').textContent = data.points;
    document.getElementById('wallet-bar').style.width = Math.min(data.points, 100) + '%';
    document.getElementById('wallet-locked').textContent = data.locked + ' pts';
    document.getElementById('wallet-earned').textContent = '+' + data.earned_this_month + ' pts';
    document.getElementById('wallet-spent').textContent = data.spent_this_month + ' pts';

    const list = document.getElementById('tx-list');
    list.innerHTML = data.transactions.map(tx => {
      let icoClass = 'txig';
      let icoText = '✓';
      let ptsClass = 'txp';

      if (tx.type === 'locked') { icoClass = 'txia'; icoText = '🔒'; ptsClass = 'txbl'; }
      else if (tx.type === 'bonus') { icoText = '🎁'; }
      else if (tx.amount < 0) { icoClass = 'txir'; icoText = '↓'; ptsClass = 'txm'; }

      const sign = tx.amount > 0 ? '+' : '';
      return `
        <div class="tx">
          <div class="txico ${icoClass}">${icoText}</div>
          <div class="txinfo">
            <div class="txttl">${tx.description}</div>
            <div class="txsub">${tx.type === 'locked' ? 'Bloqués · en attente retour' : tx.type === 'bonus' ? 'Bienvenue sur Shapio !' : tx.type === 'loan_earned' ? 'Prêt terminé' : 'Emprunt terminé'}</div>
          </div>
          <div class="txpts ${ptsClass}">${sign}${tx.amount} pts</div>
        </div>`;
    }).join('');
  } catch (e) { console.error('loadWallet', e); }
}

// ── Profile ──
async function loadProfile() {
  try {
    currentUser = await api.users.me();
    const u = currentUser;

    document.getElementById('header-pts').textContent = u.points + ' pts';
    document.getElementById('prof-initials').textContent = (u.first_name[0] + u.last_name[0]).toUpperCase();
    document.getElementById('prof-name').textContent = u.first_name + ' ' + u.last_name;
    document.getElementById('prof-badge').style.display = u.id_verified ? '' : 'none';
    document.getElementById('prof-sub').textContent = `📍 ${u.city} · Membre depuis ${new Date(u.created_at + 'Z').toLocaleDateString('fr', {month:'long', year:'numeric'})}`;
    document.getElementById('prof-pts').textContent = u.points;
    document.getElementById('prof-loans').textContent = u.total_loans;
    document.getElementById('prof-borrows').textContent = u.total_borrows;
    document.getElementById('prof-rating').textContent = u.rating || '—';

    // Verification statuses
    document.getElementById('verif-phone').className = 'ptico ' + (u.phone_verified ? 'ptdone' : 'ptpend');
    document.getElementById('verif-phone').textContent = u.phone_verified ? '✓' : '–';
    document.getElementById('verif-id').className = 'ptico ' + (u.id_verified ? 'ptdone' : 'ptpend');
    document.getElementById('verif-id').textContent = u.id_verified ? '✓' : '–';
    document.getElementById('verif-selfie').className = 'ptico ' + (u.selfie_verified ? 'ptdone' : 'ptpend');
    document.getElementById('verif-selfie').textContent = u.selfie_verified ? '✓' : '–';

    // My items
    const grid = document.getElementById('prof-items-grid');
    grid.innerHTML = u.items.map(it => `
      <div class="pocard" onclick="openFiche(${it.id})">
        <div class="poimg" style="background:${it.bg_color}"><span>${it.icon}</span>
          <div class="popts">${it.points_per_day} pts</div>
          <div class="post ${it.available ? 'post-on' : 'post-off'}">${it.available ? 'Dispo' : 'Indispo'}</div>
        </div>
        <div class="poinfo">
          <div class="ponm">${it.title}</div>
        </div>
      </div>
    `).join('') + `
      <div class="pocard" onclick="showAddItem()" style="border-style:dashed;display:flex;align-items:center;justify-content:center;min-height:120px;background:#f7f7f4;cursor:pointer;">
        <div style="text-align:center;">
          <div style="font-size:20px;color:var(--mu);">+</div>
          <div style="font-size:11px;color:var(--mu);margin-top:3px;">Ajouter</div>
        </div>
      </div>`;

    // Reviews
    const reviewsContainer = document.getElementById('prof-reviews');
    if (u.reviews && u.reviews.length > 0) {
      document.getElementById('prof-review-score').textContent = u.rating || '—';
      document.getElementById('prof-review-count').textContent = u.reviews.length + ' avis reçus';
      reviewsContainer.innerHTML = u.reviews.map(r => `
        <div class="paviscard">
          <div class="pavish">
            <div class="pavisav">${r.author_name.split(' ').map(w=>w[0]).join('')}</div>
            <div class="pavisnm">${r.author_name}</div>
            <div class="pavisst">${'★'.repeat(r.rating)}</div>
          </div>
          <div class="pavist">${r.comment || ''}</div>
        </div>
      `).join('');
    } else {
      reviewsContainer.innerHTML = '<div style="font-size:12px;color:var(--mu);padding:8px 14px;">Aucun avis reçu.</div>';
    }

  } catch (e) { console.error('loadProfile', e); }
}

function ptab(name, btn) {
  ['objets', 'avis', 'settings'].forEach(t => document.getElementById('pt-' + t).style.display = t === name ? '' : 'none');
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

// ── Add Item ──
function showAddItem() {
  document.getElementById('add-item-modal').style.display = 'flex';
}

function hideAddItem() {
  document.getElementById('add-item-modal').style.display = 'none';
}

async function submitAddItem() {
  const title = document.getElementById('add-title').value.trim();
  const description = document.getElementById('add-desc').value.trim();
  const pts = Number(document.getElementById('add-pts').value);
  const category = document.getElementById('add-category').value;
  const icon = document.getElementById('add-icon').value || '📦';
  const err = document.getElementById('add-error');

  if (!title || !pts) { err.textContent = 'Titre et prix requis'; return; }
  err.textContent = '';

  try {
    await api.items.create({ title, description, points_per_day: pts, category, icon });
    hideAddItem();
    // Reset form
    document.getElementById('add-title').value = '';
    document.getElementById('add-desc').value = '';
    document.getElementById('add-pts').value = '';
    document.getElementById('add-icon').value = '';
    loadProfile();
  } catch (e) {
    err.textContent = e.message;
  }
}

// ── OTP input navigation ──
function setupOtpInputs() {
  const inputs = document.querySelectorAll('#otp-row input');
  inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      if (input.value.length === 1 && i < inputs.length - 1) {
        inputs[i + 1].focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        inputs[i - 1].focus();
      }
    });
  });
}

// ── Chat input enter key ──
function setupChatInput() {
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }
}

// ── Init ──
function init() {
  setupOtpInputs();
  setupChatInput();

  // Auto-login si token présent
  if (api.isLoggedIn()) {
    go('p-app');
  }
}

// Expose to HTML
window.go = go;
window.setTab = setTab;
window.openFiche = openFiche;
window.backFromFiche = backFromFiche;
window.toggleFSave = toggleFSave;
window.showFicheConfirm = showFicheConfirm;
window.hideFicheConfirm = hideFicheConfirm;
window.confirmBorrow = confirmBorrow;
window.swipe = swipe;
window.closeMatch = closeMatch;
window.setSwipeMode = setSwipeMode;
window.filterSwipe = filterSwipe;
window.ptab = ptab;
window.showLegal = showLegal;
window.handleLogin = handleLogin;
window.handleSignupStep1 = handleSignupStep1;
window.handleSignupStep2 = handleSignupStep2;
window.handleVerifyOTP = handleVerifyOTP;
window.handleSignupStep4 = handleSignupStep4;
window.handleLogout = handleLogout;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.showAddItem = showAddItem;
window.hideAddItem = hideAddItem;
window.submitAddItem = submitAddItem;

document.addEventListener('DOMContentLoaded', init);
