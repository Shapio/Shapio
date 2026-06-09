/* ============================================================
   build-split.mjs — Découpage verbatim de index.htm vers src/
   - Extrait CSS et JS par plages de lignes (aucune réécriture)
   - Route chaque fonction vers son module de domaine
   - Injecte `export` + calcule les imports inter-modules
   Lancement : node scripts/build-split.mjs
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'src');

const raw = readFileSync(join(root, 'index.htm'), 'utf8');
const L = raw.split('\n'); // L[0] === ligne 1
const line = (n) => L[n - 1];           // accès 1-indexé
const slice = (a, b) => L.slice(a - 1, b).join('\n'); // [a..b] inclus, 1-indexé

function out(rel, content) {
  const p = join(src, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content.endsWith('\n') ? content : content + '\n', 'utf8');
  console.log('  écrit', 'src/' + rel.replace(/\\/g, '/'));
}

/* ---------- 1. CSS (verbatim, ordre préservé) ---------- */
out('styles/tokens.css', slice(91, 150));
out('styles/landing.css', slice(151, 1098));
out('styles/app.css', slice(1099, 3105));
out('styles/components.css', slice(3106, 3636));

/* ---------- 2. Déclarations JS top-level (ligne, nom) ----------
   Issu du relevé exhaustif des déclarations indentées de 4 espaces. */
const decls = [
  [4832, 'prevTab'], [4834, 'go'], [4849, 'setTab'], [4914, 'toggleNav'],
  [4924, 'closeNav'], [4935, 'showError'], [4940, 'clearError'], [4944, 'isValidEmail'],
  [4948, 'handleLogin'], [4980, 'handleSignup1'], [5001, 'handleSignup2'],
  [5054, 'otpAdvance'], [5068, 'otpBack'], [5079, 'resendEmail'], [5088, 'resendCode'],
  [5098, 'handleResetRequest'], [5120, 'handleNewPassword'], [5147, 'verifierTelephone'],
  [5157, 'getCurrentProfile'], [5202, 'openEditProfile'], [5215, 'saveProfile'],
  [5261, 'markVerifPending'], [5287, 'checkEmailConfirmed'], [5318, 'openMyObject'],
  [5355, 'saveMyObject'], [5398, 'deleteMyObject'], [5420, 'myFavorites'],
  [5422, 'loadFavoritesSet'], [5432, 'toggleFavorite'], [5460, 'loadFavorites'],
  [5496, 'loadWallet'], [5623, 'setProfileTab'], [5657, 'refreshMyNote'],
  [5673, 'loadMyReviews'], [5706, 'renderAvisList'], [5726, 'openChangePassword'],
  [5749, 'handleLogout'], [5757, 'openFiche'], [5763, 'backFromFiche'], [5767, 'toggleFSave'],
  [5775, 'showFicheConfirm'], [5799, 'hideFicheConfirm'], [5804, 'adjustConfirmDays'],
  [5814, 'updateConfirmTotal'], [5837, 'confirmFicheRequest'], [5888, 'cards'], [5889, 'ci'],
  [5891, 'renderCard'], [5913, 'swipe'], [5934, 'closeMatch'], [5942, 'setSwipeMode'],
  [5986, 'setFilter'], [5996, 'tvc'], [6004, 'ptab'], [6018, 'setWalletTab'],
  [6028, 'decrementPoints'], [6039, 'aoCat'], [6049, 'syncPtsFromInput'], [6061, 'syncPtsFromRange'],
  [6068, 'openPhotoPicker'], [6074, 'handlePhotoSelected'], [6112, 'handleAddObject'],
  [6206, 'homeRadius'], [6207, 'explorerRadius'], [6208, 'explorerSearch'], [6209, 'explorerCity'],
  [6210, 'explorerCategory'], [6214, 'approxDistance'], [6225, 'CAT_ICONS'], [6237, 'buildNearCard'],
  [6253, 'buildBrowseCard'], [6271, 'loadHomeObjects'], [6311, 'setHomeRadius'],
  [6329, 'setExplorerRadius'], [6347, 'filterExplorer'], [6359, 'refreshExplorer'],
  [6403, 'renderSwipeCard'], [6437, 'loadMembers'], [6538, 'swipeNext'], [6543, 'swipeFavorite'],
  [6553, 'loadMyObjects'], [6612, 'openPublicProfile'], [6791, 'closePublicProfile'],
  [6795, 'contactFromPublic'], [6802, 'openPhotoZoom'], [6818, 'openObjectFiche'],
  [6923, 'shapioWelcomeCard'], [6936, 'openShapioWelcome'], [6940, 'loadMessages'],
  [7008, 'openChat'], [7055, 'renderChatMessage'], [7078, 'renderLoanCard'],
  [7146, 'loanGetOriginal'], [7154, 'loanAccept'], [7205, 'loanRefuse'], [7226, 'loanCounter'],
  [7262, 'reviewContext'], [7263, 'reviewRating'], [7265, 'openReviewModal'],
  [7277, 'closeReviewModal'], [7282, 'setReviewStars'], [7299, 'submitReview'],
  [7335, 'recalcNoteMoyenne'], [7346, 'hasReviewed'], [7354, 'confirmerRetour'],
  [7415, 'sendMessage'], [7436, 'contactOwner'], [7461, 'setNotifTab'], [7479, 'clearNotifs'],
  [7491, 'showLegal'], [7570, 'setBannerColor'], [7585, 'previewProfilePhoto'],
  [7631, 'computeLevel'], [7637, 'updateProfileUI'], [7718, 'updateTrustUI'], [7762, 'setTrustRow'],
  [7789, 'resendConfirmEmail'], [7807, 'knownMessageCount'], [7808, 'lastSeenMessageCount'],
  [7809, 'notifInitialized'], [7810, 'notifPollingTimer'], [7812, 'playNotifSound'],
  [7836, 'updateMsgsBadge'], [7850, 'checkNewMessages'], [7899, 'startNotificationPolling'],
];
const INIT_START = 7905;   // bloc DOMContentLoaded
const JS_END = 7939;       // dernière ligne avant </script>

/* ---------- 3. Affectation nom -> module ---------- */
const M = {
  dom: ['prevTab', 'go', 'setTab', 'toggleNav', 'closeNav', 'showError', 'clearError', 'isValidEmail'],
  auth: ['handleLogin', 'handleSignup1', 'handleSignup2', 'otpAdvance', 'otpBack', 'resendEmail',
    'resendCode', 'handleResetRequest', 'handleNewPassword', 'checkEmailConfirmed',
    'openChangePassword', 'handleLogout', 'resendConfirmEmail'],
  profile: ['verifierTelephone', 'getCurrentProfile', 'openEditProfile', 'saveProfile',
    'markVerifPending', 'setProfileTab', 'refreshMyNote', 'loadMyReviews', 'renderAvisList', 'tvc',
    'ptab', 'computeLevel', 'updateProfileUI', 'updateTrustUI', 'setTrustRow', 'setBannerColor',
    'previewProfilePhoto', 'openPublicProfile', 'closePublicProfile', 'contactFromPublic',
    'openPhotoZoom', 'loadMembers'],
  objects: ['openMyObject', 'saveMyObject', 'deleteMyObject', 'myFavorites', 'loadFavoritesSet',
    'toggleFavorite', 'loadFavorites', 'homeRadius', 'explorerRadius', 'explorerSearch',
    'explorerCity', 'explorerCategory', 'approxDistance', 'CAT_ICONS', 'buildNearCard',
    'buildBrowseCard', 'loadHomeObjects', 'setHomeRadius', 'setExplorerRadius', 'filterExplorer',
    'refreshExplorer', 'loadMyObjects', 'openObjectFiche', 'openFiche', 'backFromFiche',
    'toggleFSave', 'showFicheConfirm', 'hideFicheConfirm', 'adjustConfirmDays', 'updateConfirmTotal',
    'confirmFicheRequest', 'openPhotoPicker', 'handlePhotoSelected', 'handleAddObject', 'aoCat',
    'syncPtsFromInput', 'syncPtsFromRange'],
  loans: ['confirmerRetour', 'loanGetOriginal', 'loanAccept', 'loanRefuse', 'loanCounter', 'renderLoanCard'],
  reviews: ['reviewContext', 'reviewRating', 'openReviewModal', 'closeReviewModal', 'setReviewStars',
    'submitReview', 'recalcNoteMoyenne', 'hasReviewed'],
  messages: ['shapioWelcomeCard', 'openShapioWelcome', 'loadMessages', 'openChat', 'renderChatMessage',
    'sendMessage', 'contactOwner', 'setNotifTab', 'clearNotifs', 'knownMessageCount',
    'lastSeenMessageCount', 'notifInitialized', 'notifPollingTimer', 'playNotifSound',
    'updateMsgsBadge', 'checkNewMessages', 'startNotificationPolling'],
  swipe: ['cards', 'ci', 'renderCard', 'swipe', 'closeMatch', 'setSwipeMode', 'setFilter',
    'renderSwipeCard', 'swipeNext', 'swipeFavorite'],
  wallet: ['loadWallet', 'setWalletTab', 'decrementPoints'],
  legal: ['showLegal'],
};
const nameToModule = {};
for (const [mod, names] of Object.entries(M)) for (const n of names) nameToModule[n] = mod;
nameToModule['sb'] = 'supabase';

// Vérif : toute déclaration relevée doit être affectée
const unassigned = decls.map(([, n]) => n).filter((n) => !nameToModule[n]);
if (unassigned.length) { console.error('NON AFFECTÉ:', unassigned); process.exit(1); }

/* ---------- 4. Construire le texte verbatim de chaque chunk ---------- */
// frontières = lignes de début des décl + init + fin
const bounds = decls.map(([ln]) => ln).concat([INIT_START, JS_END + 1]);
const chunkOf = {}; // name -> {start,end,text}
decls.forEach(([ln, name], i) => {
  const end = bounds[i + 1] - 1;
  chunkOf[name] = { start: ln, end, text: slice(ln, end) };
});
const preamble = slice(4823, 4831); // bannière + 'use strict' + commentaire NAV (avant prevTab)
const initText = slice(INIT_START, JS_END);

/* Injecte `export ` sur la 1re déclaration nommée d'un chunk (hors window.x=) */
function withExport(name, text) {
  // 'myFavorites','homeRadius',... etc. sont des assignations window.x — pas d'export
  const WINDOW_STATE = new Set(['myFavorites', 'homeRadius', 'explorerRadius', 'explorerSearch',
    'explorerCity', 'explorerCategory', 'reviewContext', 'reviewRating', 'knownMessageCount',
    'lastSeenMessageCount', 'notifInitialized']);
  if (WINDOW_STATE.has(name)) return text; // déjà `window.x = ...`
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(async function |function |const |let |var )/);
    if (m) { lines[i] = m[1] + 'export ' + lines[i].slice(m[1].length); break; }
  }
  return lines.join('\n');
}

/* ---------- 5. Résolution des imports ---------- */
const moduleDir = (mod) => (mod === 'dom' || mod === 'supabase' ? 'lib' : 'features');
function relPath(fromMod, toMod) {
  const a = moduleDir(fromMod), b = moduleDir(toMod);
  const file = toMod + '.js';
  if (a === b) return './' + file;
  return (a === 'features' ? '../lib/' : '../features/') + file;
}
// noms exportables (fonctions + états exportés, hors window.x=)
const WINDOW_STATE = new Set(['myFavorites', 'homeRadius', 'explorerRadius', 'explorerSearch',
  'explorerCity', 'explorerCategory', 'reviewContext', 'reviewRating', 'knownMessageCount',
  'lastSeenMessageCount', 'notifInitialized']);
const exportableNames = decls.map(([, n]) => n).filter((n) => !WINDOW_STATE.has(n)).concat(['sb']);
const wordRe = (n) => new RegExp('\\b' + n + '\\b');

function importsFor(mod, bodyText) {
  const byTarget = {}; // targetMod -> Set(names)
  for (const n of exportableNames) {
    const target = nameToModule[n];
    if (target === mod) continue;          // défini ici
    if (wordRe(n).test(bodyText)) {
      (byTarget[target] ||= new Set()).add(n);
    }
  }
  const lines = [];
  for (const [target, set] of Object.entries(byTarget)) {
    lines.push(`import { ${[...set].sort().join(', ')} } from '${relPath(mod, target)}';`);
  }
  return lines.sort().join('\n');
}

/* ---------- 6. Émettre les modules de domaine ---------- */
const HEADER = (title) => `/* ${title} — extrait de index.htm (logique inchangée) */\n`;
for (const [mod, names] of Object.entries(M)) {
  const parts = [];
  if (mod === 'dom') parts.push(preamble);
  for (const n of names) parts.push(withExport(n, chunkOf[n].text));
  const body = parts.join('\n');
  const imports = importsFor(mod, body);
  const title = { dom: 'lib/dom — navigation & helpers UI', auth: 'features/auth — authentification',
    profile: 'features/profile — profil, avis, confiance', objects: 'features/objects — objets, favoris, fiche, ajout',
    loans: 'features/loans — demandes de prêt', reviews: 'features/reviews — avis & notes',
    messages: 'features/messages — messagerie & notifications', swipe: 'features/swipe — cartes swipe/match',
    wallet: 'features/wallet — portefeuille de points', legal: 'features/legal — mentions légales' }[mod];
  const rel = moduleDir(mod) + '/' + mod + '.js';
  out(rel, HEADER(title) + (imports ? imports + '\n\n' : '') + body + '\n');
}

/* ---------- 7. main.js : imports * + registre window + init ---------- */
const featureMods = Object.keys(M);
const importNs = featureMods.map((m) => `import * as ${m} from './${moduleDir(m)}/${m}.js';`).join('\n');
// noms utilisés par le bloc init
const initImportLine = (() => {
  const used = new Set();
  for (const n of exportableNames) if (wordRe(n).test(initText)) used.add(n);
  const byTarget = {};
  for (const n of used) (byTarget[nameToModule[n]] ||= new Set()).add(n);
  return Object.entries(byTarget)
    .map(([t, s]) => `import { ${[...s].sort().join(', ')} } from './${moduleDir(t)}/${t}.js';`)
    .sort().join('\n');
})();

const mainJs = `/* main.js — point d'entrée : styles, registre des handlers, init */
import './styles/tokens.css';
import './styles/landing.css';
import './styles/app.css';
import './styles/components.css';

${importNs}
${initImportLine}

/* Les gestionnaires inline (onclick="...") du HTML appellent ces fonctions
   comme globales : on les ré-expose explicitement sur window. */
Object.assign(window, ${featureMods.join(', ')});

${initText.split('\n').map((l) => l.replace(/^    /, '')).join('\n')}
`;
out('main.js', mainJs);

console.log('\nOK — découpage terminé.');
