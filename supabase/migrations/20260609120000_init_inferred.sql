-- ============================================================================
-- Shapio — Schéma LOCAL inféré depuis les requêtes du front (src/features/*).
--
-- ⚠️  IMPORTANT
-- Ce schéma est RECONSTRUIT à partir des appels Supabase du code (tables/colonnes
-- réellement utilisées). Il NE contient PAS la logique serveur de la prod
-- (triggers/fonctions) car elle n'est pas visible côté client — notamment :
--   • la CRÉATION d'un prêt (loans) : le front n'insère jamais dans `loans`,
--     elle se fait via un trigger/fonction côté Postgres hébergé ;
--   • le TRANSFERT de points au retour (message LOAN_RETURNED) ;
--   • le recalcul éventuel de note_moyenne / nb_prets.
-- Pour répliquer EXACTEMENT la prod (recommandé), voir docs/LOCAL_DB.md :
--   `supabase link` + `supabase db pull`.
--
-- Les politiques RLS ci-dessous sont PERMISSIVES et réservées au LOCAL.
-- Ne jamais les utiliser en production.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.users (
  id                  uuid primary key default gen_random_uuid(),
  auth_id             uuid unique references auth.users (id) on delete cascade,
  prenom              text,
  nom                 text,
  pseudo              text,
  email               text,
  ville               text,
  code_postal         text,
  points              integer not null default 50,
  points_bloques      integer not null default 0,
  verifie_telephone   boolean not null default false,
  verifie_identite    boolean not null default false,
  statut_verification text    not null default 'non_demande',
  note_moyenne        numeric(2,1),
  nb_prets            integer not null default 0,
  nb_emprunts         integer not null default 0,
  avatar_url          text,
  couleur_banniere    text,
  created_at          timestamptz not null default now()
);

create table if not exists public.objects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users (id) on delete cascade,
  titre        text not null,
  description  text,
  categorie    text,
  pts_par_jour integer,
  duree_max    integer,
  etat         text,
  disponible   boolean not null default true,
  ville        text,
  code_postal  text,
  photos       jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create table if not exists public.loans (
  id            uuid primary key default gen_random_uuid(),
  object_id     uuid references public.objects (id) on delete set null,
  emprunteur_id uuid references public.users (id) on delete set null,
  preteur_id    uuid references public.users (id) on delete set null,
  statut        text not null default 'en_cours',  -- en_cours | termine
  jours         integer,
  total_pts     integer,
  date_debut    timestamptz,
  date_fin      timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  auteur_id       uuid references public.users (id) on delete cascade,
  destinataire_id uuid references public.users (id) on delete cascade,
  loan_id         uuid references public.loans (id) on delete set null,
  note            integer check (note between 1 and 5),
  commentaire     text,
  created_at      timestamptz not null default now()
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  expediteur_id   uuid references public.users (id) on delete cascade,
  destinataire_id uuid references public.users (id) on delete cascade,
  contenu         text,
  created_at      timestamptz not null default now()
);

create table if not exists public.favoris (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users (id) on delete cascade,
  object_id  uuid references public.objects (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, object_id)
);

-- Index sur les colonnes de filtre/jointure fréquentes
create index if not exists idx_objects_user        on public.objects (user_id);
create index if not exists idx_loans_emprunteur     on public.loans (emprunteur_id);
create index if not exists idx_loans_preteur        on public.loans (preteur_id);
create index if not exists idx_reviews_destinataire on public.reviews (destinataire_id);
create index if not exists idx_messages_expediteur  on public.messages (expediteur_id);
create index if not exists idx_messages_destinataire on public.messages (destinataire_id);
create index if not exists idx_favoris_user         on public.favoris (user_id);

-- ----------------------------------------------------------------------------
-- RLS — PERMISSIF (LOCAL UNIQUEMENT)
-- Permet à l'app de fonctionner sans répliquer les politiques de prod.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['users','objects','loans','reviews','messages','favoris'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$
      create policy "local_all_read"  on public.%1$I for select using (true);
    $p$, t);
    execute format($p$
      create policy "local_all_write" on public.%1$I for all
        to authenticated using (true) with check (true);
    $p$, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Storage : buckets publics utilisés par le front (avatars, objects)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('objects', 'objects', true)
on conflict (id) do update set public = excluded.public;

-- Accès storage permissif (LOCAL) : lecture publique, écriture authentifiée.
create policy "local_storage_read"
  on storage.objects for select using (bucket_id in ('avatars', 'objects'));
create policy "local_storage_write"
  on storage.objects for all to authenticated
  using (bucket_id in ('avatars', 'objects'))
  with check (bucket_id in ('avatars', 'objects'));
