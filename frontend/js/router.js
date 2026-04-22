// Navigation entre les pages principales (landing, login, signup, app)
export function go(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// Navigation entre les écrans de l'app
let prevTab = 'home';

export function setTab(tab) {
  document.querySelectorAll('.ascreen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));

  const screenMap = {
    home: 'as-home',
    swipe: 'as-swipe',
    msgs: 'as-msgs',
    chat: 'as-chat',
    wallet: 'as-wallet',
    profil: 'as-profil',
    fiche: 'as-fiche',
  };

  const navMap = {
    home: 'ni-home',
    swipe: 'ni-swipe',
    msgs: 'ni-msgs',
    wallet: 'ni-wallet',
    profil: 'ni-profil',
  };

  if (screenMap[tab]) document.getElementById(screenMap[tab]).classList.add('active');
  if (navMap[tab]) document.getElementById(navMap[tab]).classList.add('active');
  if (tab !== 'chat' && tab !== 'fiche') prevTab = tab;
  window.scrollTo(0, 0);
}

export function openFiche() {
  const activeNav = document.querySelector('.ni.active');
  prevTab = activeNav?.id?.replace('ni-', '') || 'home';
  setTab('fiche');
}

export function backFromFiche() {
  setTab(prevTab || 'home');
}
