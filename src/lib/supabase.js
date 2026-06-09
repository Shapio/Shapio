/* lib/supabase — client Supabase unique, configuré via variables d'environnement.
   La clé "publishable"/anon est publique par nature (protégée par les RLS Supabase),
   mais on la sort du HTML pour la centraliser et faciliter le changement d'environnement. */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Configuration Supabase manquante : définissez VITE_SUPABASE_URL et ' +
    'VITE_SUPABASE_ANON_KEY dans un fichier .env (voir .env.example).'
  );
}

export const sb = createClient(url, key);
console.log('✓ Supabase OK');
