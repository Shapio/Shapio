const legalContents = {
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
</div>`,
};

export function showLegal(type) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `<div style="background:white;border-radius:20px;padding:28px;max-width:500px;width:100%;max-height:85vh;overflow-y:auto;position:relative;font-family:'DM Sans',sans-serif;">
<button onclick="this.closest('div').parentElement.remove()" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:#888;">✕</button>
${legalContents[type]}
<button onclick="this.closest('div').parentElement.remove()" style="margin-top:20px;padding:10px 24px;border-radius:100px;background:#085041;color:white;border:none;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;">Fermer</button>
</div>`;
  document.body.appendChild(overlay);
}
