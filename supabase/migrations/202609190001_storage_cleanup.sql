-- File deletion is transactional with row deletion and retried through Storage API.
create table public.one_storage_deletions (
  path text primary key,
  created_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.one_storage_deletions enable row level security;
revoke all on public.one_storage_deletions from public, anon, authenticated;
grant all on public.one_storage_deletions to service_role;

create function public.queue_one_deleted_files() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'sites' then
    insert into public.one_storage_deletions(path)
    select name from storage.objects where bucket_id='site-files'
      and split_part(name,'/',1)=old.id::text
    on conflict do nothing;
  elsif old.storage_path is not null then
    -- Never trust a client-supplied path outside this workspace.
    if split_part(old.storage_path,'/',1)=old.site_id::text then
      insert into public.one_storage_deletions(path) values(old.storage_path)
      on conflict do nothing;
    end if;
  end if;
  return old;
end $$;
revoke all on function public.queue_one_deleted_files() from public,anon,authenticated;
create trigger one_queue_site_files before delete on public.sites
for each row execute function public.queue_one_deleted_files();
create trigger one_queue_document_file before delete on public.documents
for each row execute function public.queue_one_deleted_files();
create trigger one_queue_photo_file before delete on public.photos
for each row execute function public.queue_one_deleted_files();

-- Pending paths cannot be overwritten while a worker removes their old bytes.
create function public.one_storage_path_available(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.one_storage_deletions where path=p_path)
$$;
revoke all on function public.one_storage_path_available(text) from public,anon;
grant execute on function public.one_storage_path_available(text) to authenticated;
create policy one_no_pending_upload on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'site-files' or public.one_storage_path_available(name));
create policy one_no_pending_update on storage.objects as restrictive for update to authenticated
with check (bucket_id <> 'site-files' or public.one_storage_path_available(name));

create function public.prepare_one_storage_account_deletion(p_target_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result := public.prepare_one_account_deletion(p_target_user);
 -- Retained shared resources must no longer be owned by the departing account.
 -- Change ownership metadata only; never SQL-delete Storage objects.
 update storage.objects o set owner_id=s.created_by::text, owner=s.created_by
 from public.sites s where o.bucket_id='site-files'
 and split_part(o.name,'/',1)=s.id::text
 and (o.owner_id=p_target_user::text or o.owner=p_target_user)
 and s.created_by<>p_target_user;
 -- Includes uploads whose document/photo row was never saved or was already purged.
 insert into public.one_storage_deletions(path)
 select name from storage.objects where bucket_id='site-files'
 and (owner_id=p_target_user::text or owner=p_target_user)
 on conflict do nothing;
 return result;
end $$;
revoke all on function public.prepare_one_storage_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.prepare_one_storage_account_deletion(uuid) to service_role;
revoke execute on function public.purge_expired_trash() from public,anon;
grant execute on function public.purge_expired_trash() to authenticated;

-- Private cron credential generated in the database, never embedded in source.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.secrets where name='one_storage_worker') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'one_storage_worker');
 end if;
end $$;
create function public.authorize_one_storage_worker(p_token text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from vault.decrypted_secrets where name='one_storage_worker'
 and extensions.digest(decrypted_secret,'sha256')=extensions.digest(p_token,'sha256'))
$$;
revoke all on function public.authorize_one_storage_worker(text) from public,anon,authenticated;
grant execute on function public.authorize_one_storage_worker(text) to service_role;
create function public.run_one_storage_cleanup() returns bigint
language plpgsql security definer set search_path='' as $$
declare request_id bigint;
begin
 select net.http_post(
   url := 'https://frehflwcnghrmqpzbpno.supabase.co/functions/v1/one-storage-cleanup',
   headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||decrypted_secret),
   body := '{}'::jsonb, timeout_milliseconds := 60000
 ) into request_id from vault.decrypted_secrets where name='one_storage_worker';
 return request_id;
end $$;
revoke all on function public.run_one_storage_cleanup() from public,anon,authenticated;
select cron.schedule('one-storage-cleanup','*/5 * * * *','select public.run_one_storage_cleanup()');

create table public.one_storage_worker_lock (
 id boolean primary key default true check(id), token uuid, expires_at timestamptz
);
alter table public.one_storage_worker_lock enable row level security;
revoke all on public.one_storage_worker_lock from public,anon,authenticated;
insert into public.one_storage_worker_lock(id) values(true);
create function public.claim_one_storage_worker(p_token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update public.one_storage_worker_lock set token=p_token,expires_at=now()+interval '10 minutes'
 where id and (expires_at is null or expires_at<now());
 return found;
end $$;
create function public.release_one_storage_worker(p_token uuid) returns void
language sql security definer set search_path='' as $$
 update public.one_storage_worker_lock set token=null,expires_at=null where token=p_token
$$;
create function public.one_storage_deletion_batch() returns table(path text)
language sql stable security definer set search_path='' as $$
 select q.path from public.one_storage_deletions q
 where not exists(select 1 from public.documents d where d.storage_path=q.path)
 and not exists(select 1 from public.photos p where p.storage_path=q.path)
 order by q.created_at limit 100
$$;
revoke all on function public.claim_one_storage_worker(uuid),public.release_one_storage_worker(uuid),public.one_storage_deletion_batch() from public,anon,authenticated;
grant execute on function public.claim_one_storage_worker(uuid),public.release_one_storage_worker(uuid),public.one_storage_deletion_batch() to service_role;
