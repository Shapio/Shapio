import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      // Filet de sécurité du refactoring : toute référence non résolue
      // (import manquant entre modules) doit échouer.
      'no-undef': 'error',
      // Les imports sur-générés par le découpage sont tolérés (bruit, pas un bug).
      'no-unused-vars': 'warn',
      // Nits hérités du code d'origine (déplacés verbatim) — signalés, non bloquants.
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
    },
  },
];
