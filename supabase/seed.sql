-- ============================================================================
-- Seed LOCAL — données de démo (exécuté par `supabase db reset`).
--
-- On NE crée PAS de comptes auth ici (insertion brute dans auth.users fragile
-- selon les versions de GoTrue). Pour un compte connectable : inscrivez-vous
-- via l'app (instantané en local, confirmations email désactivées).
--
-- Ces utilisateurs de démo (auth_id = NULL) servent uniquement à peupler le
-- fil d'accueil / la liste des membres avec des objets visibles.
-- ============================================================================

insert into public.users (id, prenom, nom, pseudo, ville, code_postal, note_moyenne, nb_prets)
values
  ('11111111-1111-1111-1111-111111111111', 'Camille', 'D.', 'camille_demo', 'Lille', '59000', 4.8, 12),
  ('22222222-2222-2222-2222-222222222222', 'Hugo',    'M.', 'hugo_demo',    'Lille', '59000', 4.6, 7)
on conflict (id) do nothing;

insert into public.objects (user_id, titre, description, categorie, pts_par_jour, duree_max, etat, ville, code_postal)
values
  ('11111111-1111-1111-1111-111111111111', 'Perceuse visseuse', 'Perceuse sans fil 18V + embouts.', 'Bricolage', 8,  7,  'be', 'Lille', '59000'),
  ('11111111-1111-1111-1111-111111111111', 'Tente 2 places',    'Légère, idéale week-end.',        'Loisirs',   12, 14, 'tb', 'Lille', '59000'),
  ('22222222-2222-2222-2222-222222222222', 'Taille-haie',       'Électrique, lame 50cm.',          'Jardinage', 10, 5,  'be', 'Lille', '59000'),
  ('22222222-2222-2222-2222-222222222222', 'Raquettes de padel','Paire + 3 balles.',               'Sport',     6,  3,  'tb', 'Lille', '59000')
on conflict do nothing;
