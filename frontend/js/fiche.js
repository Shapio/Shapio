export function toggleFSave() {
  const btn = document.getElementById('fsavebtn');
  btn.textContent = btn.textContent === '♡' ? '♥' : '♡';
  btn.style.color = btn.textContent === '♥' ? 'var(--gm)' : '';
}

export function showFicheConfirm() {
  document.getElementById('fiche-confirm').style.display = 'block';
  document.getElementById('fbar').style.display = 'none';
}

export function hideFicheConfirm() {
  document.getElementById('fiche-confirm').style.display = 'none';
  document.getElementById('fbar').style.display = 'flex';
}
