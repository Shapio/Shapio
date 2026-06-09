/* features/auth — authentification — extrait de index.htm (logique inchangée) */
import { clearError, go, isValidEmail, showError } from '../lib/dom.js';
import { getCurrentProfile, updateProfileUI } from './profile.js';
import { sb } from '../lib/supabase.js';

    export async function handleLogin() {
      clearError('login-error');
      const email = document.getElementById('login-email').value.trim();
      const pwd = document.getElementById('login-pwd').value;
      if (!email || !isValidEmail(email)) { showError('login-error', 'Email invalide.'); return; }
      if (!pwd || pwd.length < 6) { showError('login-error', 'Mot de passe requis.'); return; }
      const btn = document.querySelector('#p-connexion .obtn');
      btn.textContent = 'Connexion…'; btn.disabled = true;
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;

        // BLOQUER si email pas confirmé
        if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
          await sb.auth.signOut();
          showError('login-error', '⚠️ Confirme ton email avant de te connecter. Vérifie ta boîte mail (et tes spams).');
          btn.textContent = 'Se connecter →'; btn.disabled = false;
          return;
        }

        // Charger le profil (et le créer si besoin via getCurrentProfile)
        const profile = await getCurrentProfile();
        if (profile) {
          updateProfileUI(profile);
        }
        go('p-app');
      } catch (err) {
        showError('login-error', err.message.includes('Invalid') ? 'Email ou mot de passe incorrect.' : 'Erreur de connexion.');
        btn.textContent = 'Se connecter →'; btn.disabled = false;
      }
    }

    export function handleSignup1() {
      clearError('s1-error');
      const prenom = document.getElementById('su-prenom').value.trim();
      const nom = document.getElementById('su-nom').value.trim();
      const email = document.getElementById('su-email').value.trim();
      const cp = document.getElementById('su-cp').value.trim();
      const ville = document.getElementById('su-ville').value.trim();
      console.log('[DEBUG inscription] Ville:', JSON.stringify(ville), '| CP:', JSON.stringify(cp));
      if (!prenom || prenom.length < 2) { showError('s1-error', 'Prénom requis (min. 2 caractères).'); return; }
      if (!nom || nom.length < 2) { showError('s1-error', 'Nom requis (min. 2 caractères).'); return; }
      if (!email || !isValidEmail(email)) { showError('s1-error', 'Email invalide.'); return; }
      if (!cp || !/^[0-9]{5}$/.test(cp)) { showError('s1-error', 'Code postal invalide (5 chiffres).'); return; }
      if (!ville || ville.length < 2) { showError('s1-error', 'Ville requise.'); return; }
      sessionStorage.setItem('signup_prenom', prenom);
      sessionStorage.setItem('signup_nom', nom);
      sessionStorage.setItem('signup_email', email);
      sessionStorage.setItem('signup_cp', cp);
      sessionStorage.setItem('signup_ville', ville);
      go('p-s2');
    }

    export async function handleSignup2() {
      clearError('s2-error');
      const pwd = document.getElementById('su-pwd').value;
      const pwd2 = document.getElementById('su-pwd2').value;
      if (!pwd || pwd.length < 8) { showError('s2-error', 'Minimum 8 caractères.'); return; }
      if (pwd !== pwd2) { showError('s2-error', 'Les mots de passe ne correspondent pas.'); return; }

      const btn = document.querySelector('#p-s2 .obtn');
      btn.textContent = 'Création…'; btn.disabled = true;

      const prenom = sessionStorage.getItem('signup_prenom') || '';
      const nom = sessionStorage.getItem('signup_nom') || '';
      const email = sessionStorage.getItem('signup_email') || '';
      const cp = sessionStorage.getItem('signup_cp') || '';
      const ville = sessionStorage.getItem('signup_ville') || '';

      try {
        const { data: authData, error: authError } = await sb.auth.signUp({
          email,
          password: pwd,
          options: { data: { prenom, nom, ville, code_postal: cp } }
        });
        if (authError) throw authError;

        // Créer le profil dans users
        const pseudo = (prenom + nom).toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.floor(Math.random() * 9999);
        const { error: insertErr } = await sb.from('users').insert({
          auth_id: authData.user.id,
          prenom, nom, pseudo, email, ville, code_postal: cp,
          points: 50,
          verifie_telephone: false,
          statut_verification: 'non_demande'
        });
        if (insertErr) {
          console.error('users INSERT error:', insertErr);
          // On laisse continuer : profil recréé au 1er login si besoin
        }

        // Afficher l'email dans l'étape 3
        const display = document.getElementById('s3-email-display');
        if (display) display.textContent = 'Un lien de confirmation a été envoyé à ' + email + '. Clique dessus pour activer ton compte.';

        sessionStorage.setItem('signup_email_sent', email);
        go('p-s3');
      } catch (err) {
        let msg = 'Une erreur est survenue.';
        if (err.message && err.message.includes('already registered')) msg = 'Cet email est déjà utilisé. Connecte-toi !';
        if (err.message && err.message.includes('Password')) msg = 'Mot de passe trop faible. Utilise au moins 8 caractères.';
        showError('s2-error', msg + ' (détail: ' + err.message + ')');
        btn.textContent = 'Continuer →'; btn.disabled = false;
      }
    }

    export function otpAdvance(input, nextIndex) {
      // Garde uniquement les chiffres
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value && input.value.length === 1) {
        input.classList.add('filled');
        if (nextIndex) {
          const next = document.getElementById('otp-' + nextIndex);
          if (next) next.focus();
        }
      } else {
        input.classList.remove('filled');
      }
    }

    export function otpBack(event, prevIndex) {
      if (event.key === 'Backspace' && !event.target.value) {
        const prev = document.getElementById('otp-' + prevIndex);
        if (prev) {
          prev.focus();
          prev.value = '';
          prev.classList.remove('filled');
        }
      }
    }

    export async function resendEmail(btn) {
      const email = sessionStorage.getItem('signup_email_sent') || sessionStorage.getItem('signup_email');
      if (!email) return;
      btn.disabled = true;
      btn.textContent = 'Envoyé !';
      await sb.auth.resend({ type: 'signup', email });
      setTimeout(() => { btn.textContent = 'Renvoyer'; btn.disabled = false; }, 5000);
    }

    export function resendCode(btn) {
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Envoyé !';
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 3000);
    }

    export async function handleResetRequest() {
      clearError('reset-error');
      const email = document.getElementById('reset-email').value.trim();
      if (!email || !isValidEmail(email)) {
        showError('reset-error', 'Saisis un email valide.');
        return;
      }
      const btn = document.getElementById('reset-btn');
      btn.textContent = 'Envoi…'; btn.disabled = true;
      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://shapio.fr'
        });
        if (error) throw error;
        document.getElementById('reset-success').style.display = 'block';
        btn.style.display = 'none';
      } catch (err) {
        showError('reset-error', 'Une erreur est survenue. Réessaie.');
        btn.textContent = 'Envoyer le lien →'; btn.disabled = false;
      }
    }

    export async function handleNewPassword() {
      clearError('newpwd-error');
      const pwd = document.getElementById('newpwd').value;
      const pwd2 = document.getElementById('newpwd2').value;
      if (!pwd || pwd.length < 8) {
        showError('newpwd-error', 'Minimum 8 caractères.');
        return;
      }
      if (pwd !== pwd2) {
        showError('newpwd-error', 'Les mots de passe ne correspondent pas.');
        return;
      }
      const btn = document.querySelector('#p-newpwd .obtn');
      btn.textContent = 'Enregistrement…'; btn.disabled = true;
      try {
        const { error } = await sb.auth.updateUser({ password: pwd });
        if (error) throw error;
        alert('✅ Mot de passe mis à jour ! Tu peux maintenant te connecter.');
        go('p-connexion');
      } catch (err) {
        showError('newpwd-error', 'Erreur. Le lien a peut-être expiré, refais une demande.');
        btn.textContent = 'Enregistrer →'; btn.disabled = false;
      }
    }

    /* --- Récupérer ou recharger le profil utilisateur connecté --- */
    /* --- Message d'attente pour la vérification téléphone --- */
    export async function checkEmailConfirmed() {
      const btn = document.querySelector('#p-s3 .obtn');
      btn.textContent = 'Vérification…'; btn.disabled = true;
      try {
        // Refresh session pour récupérer les dernières infos
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) {
          showError('s3-error', 'Session expirée. Reconnecte-toi.');
          btn.textContent = 'J\'ai confirmé mon email →'; btn.disabled = false;
          return;
        }
        // Recharger l'user pour avoir le statut à jour
        const { data: userData, error } = await sb.auth.getUser();
        if (error) throw error;

        if (userData.user.email_confirmed_at || userData.user.confirmed_at) {
          // Email confirmé : entrer directement dans l'app (plus d'étape selfie/ID)
          await getCurrentProfile();
          go('p-app');
        } else {
          showError('s3-error', '⚠️ Email pas encore confirmé. Clique sur le lien dans ton email avant de continuer.');
          btn.textContent = 'J\'ai confirmé mon email →'; btn.disabled = false;
        }
      } catch (err) {
        console.error('checkEmail error:', err);
        showError('s3-error', 'Erreur : ' + err.message);
        btn.textContent = 'J\'ai confirmé mon email →'; btn.disabled = false;
      }
    }

    /* --- Ouvrir le détail de MON objet pour le modifier --- */
    export async function openChangePassword() {
      const np = prompt('Entre ton nouveau mot de passe (8 caractères minimum) :');
      if (np === null) return; // annulé
      if (!np || np.length < 8) {
        alert('Le mot de passe doit faire au moins 8 caractères.');
        return;
      }
      const np2 = prompt('Confirme ton nouveau mot de passe :');
      if (np2 === null) return;
      if (np !== np2) {
        alert('Les deux mots de passe ne correspondent pas.');
        return;
      }
      try {
        const { error } = await sb.auth.updateUser({ password: np });
        if (error) throw error;
        alert('✅ Mot de passe mis à jour avec succès !');
      } catch (e) {
        console.error('changePassword error:', e);
        alert('Erreur : ' + (e.message || 'impossible de changer le mot de passe.'));
      }
    }

    export async function handleLogout() {
      if (confirm('Te déconnecter de Shapio ?')) {
        await sb.auth.signOut();
        go('p-landing');
      }
    }

    /* ---------- FICHE OBJET ---------- */
    export async function resendConfirmEmail() {
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user?.email) { alert('Tu dois être connecté.'); return; }
        const { error } = await sb.auth.resend({ type: 'signup', email: user.email });
        if (error) throw error;
        alert('✅ Email de confirmation renvoyé à ' + user.email + ' !');
      } catch (e) {
        console.error('resendConfirmEmail error:', e);
        alert('Erreur : ' + (e.message || e));
      }
    }

    /* ---------- INIT au chargement ---------- */
    /* ============================================
       NOTIFICATIONS : nouveaux messages reçus
       (badge sur l'onglet Messages + son + auto-refresh)
       ============================================ */
