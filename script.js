let prevTab = 'home';
function go(id) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); window.scrollTo(0, 0); }
function setTab(tab) {
  document.querySelectorAll('.ascreen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const m = { home: 'as-home', swipe: 'as-swipe', msgs: 'as-msgs', chat: 'as-chat', wallet: 'as-wallet', profil: 'as-profil', fiche: 'as-fiche' };
  const nm = { home: 'ni-home', swipe: 'ni-swipe', msgs: 'ni-msgs', wallet: 'ni-wallet', profil: 'ni-profil' };
  if (m[tab]) document.getElementById(m[tab]).classList.add('active');
  if (nm[tab]) document.getElementById(nm[tab]).classList.add('active');
  if (tab !== 'chat' && tab !== 'fiche') prevTab = tab;
  window.scrollTo(0, 0);
}
function openFiche() { prevTab = document.querySelector('.ni.active')?.id?.replace('ni-', '') || 'home'; setTab('fiche'); }
function backFromFiche() { setTab(prevTab || 'home'); }
function toggleFSave() { const b = document.getElementById('fsavebtn'); b.textContent = b.textContent === '♡' ? '♥' : '♡'; b.style.color = b.textContent === '♥' ? 'var(--gm)' : ''; }
function showFicheConfirm() { document.getElementById('fiche-confirm').style.display = 'block'; document.getElementById('fbar').style.display = 'none'; }
function hideFicheConfirm() { document.getElementById('fiche-confirm').style.display = 'none'; document.getElementById('fbar').style.display = 'flex'; }
const cards = [
  { icon: '🚁', bg: '#E1F5EE', pts: 15, dist: '2.3 km', title: 'Drone DJI Mini 3', owner: 'Marie L.', note: '4.9', tags: ['Tech', 'Caméra 4K', 'Débutant ok'] },
  { icon: '🎮', bg: '#EEEDFE', pts: 8, dist: '0.8 km', title: 'Manette PS5', owner: 'Thomas R.', note: '4.7', tags: ['Gaming', 'Bon état'] },
  { icon: '🔧', bg: '#FAEEDA', pts: 10, dist: '1.1 km', title: 'Perceuse Bosch', owner: 'Karim B.', note: '5.0', tags: ['Bricolage', 'Accessoires'] },
  { icon: '🏕', bg: '#FAECE7', pts: 20, dist: '3.2 km', title: 'Tente 4 places', owner: 'Sophie M.', note: '4.8', tags: ['Sport', 'Camping'] },
];
let ci = 0;
function renderCard(i, el) { const c = cards[i % cards.length]; el.innerHTML = `<div class="cphoto" style="background:${c.bg}"><span style="font-size:68px">${c.icon}</span><div class="cbadge">${c.pts} pts</div><div class="cdist">${c.dist}</div></div><div class="cbody"><div class="ctitle">${c.title}</div><div class="cowner"><div class="cav">${c.owner.split(' ').map(w => w[0]).join('')}</div><span>${c.owner}</span><span class="cstars">★★★★★</span><span style="font-size:11px;color:var(--mu)">${c.note}</span></div><div class="ctags">${c.tags.map(t => `<span class="ctag">${t}</span>`).join('')}</div></div>`; }
function swipe(dir) {
  const f = document.getElementById('cfront');
  if (dir === 'right') { f.classList.add('swright'); setTimeout(() => { f.classList.remove('swright'); document.getElementById('swipe-mode').style.display = 'none'; document.getElementById('match-ov').style.display = 'block'; }, 350); }
  else { f.classList.add('swleft'); setTimeout(() => { ci++; f.classList.remove('swleft'); renderCard(ci, f); renderCard(ci + 1, document.getElementById('cback')); }, 350); }
}
function closeMatch() { document.getElementById('match-ov').style.display = 'none'; document.getElementById('swipe-mode').style.display = 'block'; ci++; renderCard(ci, document.getElementById('cfront')); renderCard(ci + 1, document.getElementById('cback')); }
function setSwipeMode(m) {
  if (m === 'swipe') { document.getElementById('swipe-mode').style.display = 'block'; document.getElementById('browse-mode').style.display = 'none'; document.getElementById('mt-swipe').classList.add('active'); document.getElementById('mt-browse').classList.remove('active'); }
  else { document.getElementById('swipe-mode').style.display = 'none'; document.getElementById('browse-mode').style.display = 'block'; document.getElementById('mt-browse').classList.add('active'); document.getElementById('mt-swipe').classList.remove('active'); }
}
function tvc(el) { el.classList.toggle('sel'); el.querySelector('.vcchk').textContent = el.classList.contains('sel') ? '✓' : ''; }
function ptab(name, btn) { ['objets', 'avis', 'settings'].forEach(t => document.getElementById('pt-' + t).style.display = t === name ? '' : 'none'); document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); }

function showLegal(type) {
  const contents = {
    mentions: `<h3 style="font-family:'DM Serif Display',serif;font-size:22px;color:#111410;margin-bottom:20px;">Mentions légales</h3>
<p style="font-size:12px;color:#6B7068;margin-bottom:20px;">Dernière mise à jour : avril 2026</p>
<h4 style="font-size:14px;font-weight:600;color:#111410;margin-bottom:6px;">Éditeur du site</h4>
<p style="font-size:13px;color:#6B7068;line-height:1.6;margin-bottom:16px;">Shapio est un service édité par un particulier domicilié en France.<br>Email : <a href="mailto:contact@shapio.fr" style="color:#1D9E75;">contact@shapio.fr</a><br>Site web : <a href="https://shapio.fr" style="color:#1D9E75;">shapio.fr</a></p>
<h4 style="font-size:14px;font-weight:600;color:#111410;margin-bottom:6px;">Hébergeur</h4>
<p style="font-size:13px;color:#6B7068;line-height:1.6;margin-bottom:16px;">Vercel Inc.<br>340 Pine Street, Suite 900<br>San Francisco, CA 94104, États-Unis</p>
<h4 style="font-size:14px;font-weight:600;color:#111410;margin-bottom:6px;">Propriété intellectuelle</h4>
<p style="font-size:13px;color:#6B7068;line-height:1.6;margin-bottom:16px;">L'ensemble du contenu présent sur shapio.fr est la propriété exclusive de Shapio. Toute reproduction est interdite sans autorisation.</p>
<h4 style="font-size:14px;font-weight:600;color:#111410;margin-bottom:6px;">Droit applicable</h4>
<p style="font-size:13px;color:#6B7068;line-height:1.6;">Les présentes mentions légales sont soumises au droit français.</p>`,

    confidentialite: `<h3 style="font-family:'DM Serif Display',serif;font-size:22px;color:#111410;margin-bottom:20px;">Politique de confidentialité</h3>
<p style="font-size:12px;color:#6B7068;margin-bottom:20px;">Dernière mise à jour : avril 2026</p>
<h4 style="font-size:14px;font-weight:600;color:#111410;margin-bottom:6px;">Qui sommes-nous ?</h4>
<p style="font-size:13px;color:#6B7068;line-height:1.6;margin-bottom:16px;">Shapio est une plateforme de prêt d'objets entre particuliers. Contact : <a href="mailto:contact@shapio.fr" style="color:#1D9E75;">contact@shapio.fr</a></p>
<h4 style="font-size:14px;font-weight:600;color:#111410;margin-bottom:6px;">Données collectées</h4>
<p style="font-size:13px;color:#6B7068;line-height:1.6;margin-bottom:16px;">Lors de l'inscription : prénom, nom, email, ville. Ces informations sont collectées avec votre consentement explicite.</p>
<h4 style="font-size:14px;font-weight:600;color:#111410;margin-bottom:6px;">Finalités</h4>
<p style="font-size:13px;color:#6B7068;line-height:1.6;margin-bottom:16px;">Vos données sont utilisées uniquement pour vous informer du lancement de Shapio. Elles ne sont jamais vendues ni transmises à des tiers.</p>
<h4 style="font-size:14px;font-weight:600;color:#111410;margin-bottom:6px;">Vos droits (RGPD)</h4>
<p style="font-size:13px;color:#6B7068;line-height:1.6;margin-bottom:16px;">Vous disposez des droits d'accès, rectification, suppression, opposition et portabilité.<br>Pour les exercer : <a href="mailto:contact@shapio.fr" style="color:#1D9E75;">contact@shapio.fr</a></p>
<h4 style="font-size:14px;font-weight:600;color:#111410;margin-bottom:6px;">Cookies</h4>
<p style="font-size:13px;color:#6B7068;line-height:1.6;">Ce site n'utilise pas de cookies de tracking ou publicitaires.</p>`,

    contact: `<h3 style="font-family:'DM Serif Display',serif;font-size:22px;color:#111410;margin-bottom:20px;">Nous contacter</h3>
<p style="font-size:14px;color:#6B7068;line-height:1.6;margin-bottom:24px;">Une question, une suggestion ou un problème ? On vous répond dans les 48h.</p>
<div style="background:#E1F5EE;border-radius:14px;padding:18px;margin-bottom:16px;border:0.5px solid #9FE1CB;">
<div style="font-size:12px;font-weight:600;color:#085041;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Email</div>
<a href="mailto:contact@shapio.fr" style="font-size:15px;color:#1D9E75;font-weight:500;text-decoration:none;">contact@shapio.fr</a>
<div style="font-size:12px;color:#0F6E56;margin-top:4px;">Réponse sous 48h</div>
</div>
<div style="background:#f7f7f4;border-radius:14px;padding:18px;border:0.5px solid #e5e5e0;">
<div style="font-size:12px;font-weight:600;color:#444441;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Sujets fréquents</div>
<p style="font-size:13px;color:#6B7068;line-height:1.8;">• Mon compte et mes données personnelles<br>• Le système de points<br>• Un litige ou un problème de prêt<br>• Proposer un partenariat<br>• Signaler un bug</p>
</div>`,

    confiance: `<h3 style="font-family:'DM Serif Display',serif;font-size:22px;color:#111410;margin-bottom:20px;">Confiance et sécurité</h3>
<p style="font-size:14px;color:#6B7068;line-height:1.7;margin-bottom:20px;">Shapio repose avant tout sur la confiance entre particuliers. Les profils sont vérifiés et les avis permettent de sécuriser les échanges. L'objectif de Shapio est de faciliter le prêt et l'emprunt d'objets du quotidien, simplement et en toute transparence. À terme, des options supplémentaires comme un système de caution pourront être proposées, sans jamais être obligatoires.</p>
<div style="background:#E1F5EE;border-radius:14px;padding:18px;margin-bottom:16px;border:0.5px solid #9FE1CB;">
<div style="font-size:12px;font-weight:600;color:#085041;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">🔒 Notre engagement</div>
<p style="font-size:13px;color:#0F6E56;line-height:1.7;">Profils vérifiés • Système d'avis • Transparence totale • Options de sécurité facultatives</p>
</div>`
  };
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div style="background:white;border-radius:20px;padding:28px;max-width:500px;width:100%;max-height:85vh;overflow-y:auto;position:relative;font-family:'DM Sans',sans-serif;">
<button onclick="this.closest('div').parentElement.remove()" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:#888;">✕</button>
${contents[type]}
<button onclick="this.closest('div').parentElement.remove()" style="margin-top:20px;padding:10px 24px;border-radius:100px;background:#085041;color:white;border:none;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;">Fermer</button>
</div>`;
  document.body.appendChild(overlay);
}