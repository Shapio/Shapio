-- ============================================================================
-- Fonctions RPC du cycle de prêt — RECONSTRUCTION LOCALE.
--
-- Le front appelle deux RPC Postgres qui vivent côté serveur en prod :
--   • accepter_pret(...)   → crée le prêt + bloque les points de l'emprunteur
--   • confirmer_retour(...) → transfère définitivement les points
--
-- Le code client ne montre que la SIGNATURE et les messages d'erreur attendus
-- ('insuffisant', 'Auto-prêt', 'TES objets'). On reconstitue donc un comportement
-- FIDÈLE À L'INTENTION de l'app — il peut différer de la prod sur des cas limites.
-- Pour la version exacte, voir docs/LOCAL_DB.md (`supabase db pull`) puis supprimer
-- ce fichier.
-- ============================================================================

-- Accepter une demande de prêt (appelé par le PRÊTEUR / propriétaire de l'objet).
-- Retourne l'id du prêt créé.
create or replace function public.accepter_pret(
  p_object_id     uuid,
  p_emprunteur_id uuid,
  p_jours         integer,
  p_pts_jour      integer,
  p_message_id    uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preteur   uuid;
  v_owner     uuid;
  v_total     integer := greatest(coalesce(p_jours, 0), 0) * greatest(coalesce(p_pts_jour, 0), 0);
  v_available integer;
  v_loan      uuid;
begin
  -- Le prêteur est l'utilisateur courant.
  select id into v_preteur from public.users where auth_id = auth.uid();
  if v_preteur is null then
    raise exception 'Profil prêteur introuvable';
  end if;

  -- L'objet doit appartenir au prêteur.
  select user_id into v_owner from public.objects where id = p_object_id;
  if v_owner is null or v_owner <> v_preteur then
    raise exception 'Tu ne peux accepter que pour TES objets';
  end if;

  -- Pas d'auto-prêt.
  if p_emprunteur_id = v_preteur then
    raise exception 'Auto-prêt interdit';
  end if;

  -- L'emprunteur doit avoir assez de points disponibles.
  select (points - points_bloques) into v_available
  from public.users where id = p_emprunteur_id;
  if v_available is null or v_available < v_total then
    raise exception 'Points insuffisants';
  end if;

  -- Bloquer les points chez l'emprunteur.
  update public.users
     set points_bloques = points_bloques + v_total
   where id = p_emprunteur_id;

  -- Créer le prêt en cours.
  insert into public.loans (object_id, emprunteur_id, preteur_id, statut, jours, total_pts, date_debut)
  values (p_object_id, p_emprunteur_id, v_preteur, 'en_cours', p_jours, v_total, now())
  returning id into v_loan;

  return v_loan;
end;
$$;

-- Confirmer le retour de l'objet (appelé par le PRÊTEUR) : transfert définitif.
create or replace function public.confirmer_retour(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
begin
  select * into v_loan from public.loans where id = p_loan_id;
  if v_loan.id is null then
    raise exception 'Prêt introuvable';
  end if;
  if v_loan.statut <> 'en_cours' then
    raise exception 'Ce prêt est déjà terminé';
  end if;

  -- Emprunteur : on débloque puis on débite réellement les points.
  update public.users
     set points         = points - v_loan.total_pts,
         points_bloques = greatest(points_bloques - v_loan.total_pts, 0),
         nb_emprunts    = nb_emprunts + 1
   where id = v_loan.emprunteur_id;

  -- Prêteur : on crédite les points.
  update public.users
     set points    = points + v_loan.total_pts,
         nb_prets  = nb_prets + 1
   where id = v_loan.preteur_id;

  -- Clore le prêt.
  update public.loans
     set statut = 'termine', date_fin = now()
   where id = p_loan_id;
end;
$$;

-- Exposer les RPC à l'API (rôles PostgREST).
grant execute on function public.accepter_pret(uuid, uuid, integer, integer, uuid) to authenticated;
grant execute on function public.confirmer_retour(uuid) to authenticated;
