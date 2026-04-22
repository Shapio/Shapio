const cards = [
  { icon: '🚁', bg: '#E1F5EE', pts: 15, dist: '2.3 km', title: 'Drone DJI Mini 3', owner: 'Marie L.', note: '4.9', tags: ['Tech', 'Caméra 4K', 'Débutant ok'] },
  { icon: '🎮', bg: '#EEEDFE', pts: 8, dist: '0.8 km', title: 'Manette PS5', owner: 'Thomas R.', note: '4.7', tags: ['Gaming', 'Bon état'] },
  { icon: '🔧', bg: '#FAEEDA', pts: 10, dist: '1.1 km', title: 'Perceuse Bosch', owner: 'Karim B.', note: '5.0', tags: ['Bricolage', 'Accessoires'] },
  { icon: '🏕', bg: '#FAECE7', pts: 20, dist: '3.2 km', title: 'Tente 4 places', owner: 'Sophie M.', note: '4.8', tags: ['Sport', 'Camping'] },
];

let currentIndex = 0;

function renderCard(index, element) {
  const card = cards[index % cards.length];
  const initials = card.owner.split(' ').map(w => w[0]).join('');
  element.innerHTML = `
    <div class="cphoto" style="background:${card.bg}">
      <span style="font-size:68px">${card.icon}</span>
      <div class="cbadge">${card.pts} pts</div>
      <div class="cdist">${card.dist}</div>
    </div>
    <div class="cbody">
      <div class="ctitle">${card.title}</div>
      <div class="cowner">
        <div class="cav">${initials}</div>
        <span>${card.owner}</span>
        <span class="cstars">★★★★★</span>
        <span style="font-size:11px;color:var(--mu)">${card.note}</span>
      </div>
      <div class="ctags">${card.tags.map(t => `<span class="ctag">${t}</span>`).join('')}</div>
    </div>`;
}

export function swipe(direction) {
  const front = document.getElementById('cfront');

  if (direction === 'right') {
    front.classList.add('swright');
    setTimeout(() => {
      front.classList.remove('swright');
      document.getElementById('swipe-mode').style.display = 'none';
      document.getElementById('match-ov').style.display = 'block';
    }, 350);
  } else {
    front.classList.add('swleft');
    setTimeout(() => {
      currentIndex++;
      front.classList.remove('swleft');
      renderCard(currentIndex, front);
      renderCard(currentIndex + 1, document.getElementById('cback'));
    }, 350);
  }
}

export function closeMatch() {
  document.getElementById('match-ov').style.display = 'none';
  document.getElementById('swipe-mode').style.display = 'block';
  currentIndex++;
  renderCard(currentIndex, document.getElementById('cfront'));
  renderCard(currentIndex + 1, document.getElementById('cback'));
}

export function setSwipeMode(mode) {
  const swipeMode = document.getElementById('swipe-mode');
  const browseMode = document.getElementById('browse-mode');
  const mtSwipe = document.getElementById('mt-swipe');
  const mtBrowse = document.getElementById('mt-browse');

  if (mode === 'swipe') {
    swipeMode.style.display = 'block';
    browseMode.style.display = 'none';
    mtSwipe.classList.add('active');
    mtBrowse.classList.remove('active');
  } else {
    swipeMode.style.display = 'none';
    browseMode.style.display = 'block';
    mtBrowse.classList.add('active');
    mtSwipe.classList.remove('active');
  }
}
