-- ONE 1.0 release safety: per-user abuse limits and account deletion preparation.

create table if not exists public.one_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, bucket, window_start)
);

alter table public.one_rate_limits enable row level security;
revoke all on table public.one_rate_limits from anon, authenticated;

create or replace function public.consume_one_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_start timestamptz;
  v_count integer;
begin
  if v_user_id is null then
    return false;
  end if;

  if p_bucket is null or length(trim(p_bucket)) = 0 or length(p_bucket) > 80 then
    return false;
  end if;
  if p_limit < 1 or p_limit > 5000 or p_window_seconds < 10 or p_window_seconds > 86400 then
    return false;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.one_rate_limits (user_id, bucket, window_start, count)
  values (v_user_id, p_bucket, v_window_start, 1)
  on conflict (user_id, bucket, window_start)
  do update set count = public.one_rate_limits.count + 1
  returning count into v_count;

  delete from public.one_rate_limits
  where user_id = v_user_id
    and window_start < now() - interval '8 days';

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_one_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_one_rate_limit(text, integer, integer) to authenticated;

-- Removes/reassigns restrictive authorship references so auth.admin.deleteUser can
-- delete the account without breaking shared workspaces. Sole-owner workspaces are
-- deleted; shared workspaces retain content and are reassigned to another member.
create or replace function public.prepare_one_account_deletion(p_target_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_site record;
  v_replacement uuid;
  v_deleted_sites integer := 0;
  v_transferred_sites integer := 0;
begin
  if p_target_user is null then
    raise exception 'target user is required' using errcode = '22023';
  end if;

  for v_site in
    select id from public.sites where created_by = p_target_user
  loop
    select sm.user_id
      into v_replacement
    from public.site_members sm
    where sm.site_id = v_site.id
      and sm.user_id <> p_target_user
    order by (sm.role = 'Amministratore') desc, sm.created_at asc
    limit 1;

    if v_replacement is null then
      delete from public.sites where id = v_site.id;
      v_deleted_sites := v_deleted_sites + 1;
    else
      update public.sites set created_by = v_replacement where id = v_site.id;
      v_transferred_sites := v_transferred_sites + 1;
    end if;
  end loop;

  -- Any remaining workspace now has a creator different from the departing user.
  update public.activities a
     set created_by = s.created_by
    from public.sites s
   where a.site_id = s.id and a.created_by = p_target_user and s.created_by <> p_target_user;

  update public.daily_reports r
     set created_by = s.created_by
    from public.sites s
   where r.site_id = s.id and r.created_by = p_target_user and s.created_by <> p_target_user;

  update public.documents d
     set created_by = s.created_by
    from public.sites s
   where d.site_id = s.id and d.created_by = p_target_user and s.created_by <> p_target_user;

  update public.photos p
     set created_by = s.created_by
    from public.sites s
   where p.site_id = s.id and p.created_by = p_target_user and s.created_by <> p_target_user;

  update public.issues i
     set created_by = s.created_by
    from public.sites s
   where i.site_id = s.id and i.created_by = p_target_user and s.created_by <> p_target_user;

  update public.issue_comments c
     set created_by = s.created_by
    from public.issues i
    join public.sites s on s.id = i.site_id
   where c.issue_id = i.id and c.created_by = p_target_user and s.created_by <> p_target_user;

  update public.invitations inv
     set invited_by = s.created_by
    from public.sites s
   where inv.site_id = s.id and inv.invited_by = p_target_user and s.created_by <> p_target_user;

  return jsonb_build_object(
    'deleted_sites', v_deleted_sites,
    'transferred_sites', v_transferred_sites
  );
end;
$$;

revoke all on function public.prepare_one_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_one_account_deletion(uuid) to service_role;
