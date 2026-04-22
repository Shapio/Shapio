export function ptab(name, btn) {
  ['objets', 'avis', 'settings'].forEach(t => {
    document.getElementById('pt-' + t).style.display = t === name ? '' : 'none';
  });
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

export function tvc(el) {
  el.classList.toggle('sel');
  el.querySelector('.vcchk').textContent = el.classList.contains('sel') ? '✓' : '';
}
