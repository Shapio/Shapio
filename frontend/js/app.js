import { go, setTab, openFiche, backFromFiche } from './router.js';
import { swipe, closeMatch, setSwipeMode } from './swipe.js';
import { toggleFSave, showFicheConfirm, hideFicheConfirm } from './fiche.js';
import { ptab, tvc } from './profile.js';
import { showLegal } from './modals.js';

// Exposer les fonctions au HTML (onclick handlers)
window.go = go;
window.setTab = setTab;
window.openFiche = openFiche;
window.backFromFiche = backFromFiche;
window.swipe = swipe;
window.closeMatch = closeMatch;
window.setSwipeMode = setSwipeMode;
window.toggleFSave = toggleFSave;
window.showFicheConfirm = showFicheConfirm;
window.hideFicheConfirm = hideFicheConfirm;
window.ptab = ptab;
window.tvc = tvc;
window.showLegal = showLegal;
