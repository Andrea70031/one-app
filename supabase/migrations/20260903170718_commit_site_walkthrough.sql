-- Commit a reviewed Site Copilot walkthrough as one atomic transaction.
-- SECURITY INVOKER keeps every insert/update subject to the caller's RLS policies.

create or replace function public.commit_site_walkthrough(
  p_site_id uuid,
  p_report jsonb,
  p_activities jsonb,
  p_issues jsonb,
  p_progress integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
  v_item jsonb;
  v_activity_count integer := 0;
  v_issue_count integer := 0;
  v_updated_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_site_id is null then
    raise exception 'site_id is required' using errcode = '22023';
  end if;

  if jsonb_typeof(p_report) <> 'object'
    or jsonb_typeof(p_activities) <> 'array'
    or jsonb_typeof(p_issues) <> 'array' then
    raise exception 'invalid walkthrough payload' using errcode = '22023';
  end if;

  if jsonb_array_length(p_activities) > 8 or jsonb_array_length(p_issues) > 8 then
    raise exception 'too many walkthrough items' using errcode = '22023';
  end if;

  if p_progress is not null and (p_progress < 0 or p_progress > 100) then
    raise exception 'progress must be between 0 and 100' using errcode = '22023';
  end if;

  insert into public.daily_reports (
    site_id,
    report_date,
    summary,
    workers,
    hours,
    works,
    blockers,
    created_by
  ) values (
    p_site_id,
    coalesce(nullif(p_report ->> 'report_date', '')::date, current_date),
    nullif(left(trim(p_report ->> 'summary'), 500), ''),
    greatest(0, coalesce(nullif(p_report ->> 'workers', '')::integer, 0)),
    greatest(0, coalesce(nullif(p_report ->> 'hours', '')::numeric, 0)),
    nullif(left(trim(p_report ->> 'works'), 2400), ''),
    nullif(left(trim(p_report ->> 'blockers'), 1600), ''),
    v_user_id
  )
  returning id into v_report_id;

  for v_item in select value from jsonb_array_elements(p_activities)
  loop
    if nullif(trim(v_item ->> 'title'), '') is null then
      continue;
    end if;

    insert into public.activities (site_id, title, notes, created_by)
    values (
      p_site_id,
      left(trim(v_item ->> 'title'), 180),
      nullif(left(trim(v_item ->> 'notes'), 1600), ''),
      v_user_id
    );
    v_activity_count := v_activity_count + 1;
  end loop;

  for v_item in select value from jsonb_array_elements(p_issues)
  loop
    if nullif(trim(v_item ->> 'title'), '') is null then
      continue;
    end if;

    insert into public.issues (
      site_id,
      title,
      details,
      priority,
      status,
      due_at,
      created_by
    ) values (
      p_site_id,
      left(trim(v_item ->> 'title'), 180),
      nullif(left(trim(v_item ->> 'details'), 1600), ''),
      case
        when v_item ->> 'priority' in ('Bassa', 'Media', 'Alta', 'Critica') then v_item ->> 'priority'
        else 'Media'
      end,
      'Aperto',
      nullif(v_item ->> 'due_at', '')::timestamptz,
      v_user_id
    );
    v_issue_count := v_issue_count + 1;
  end loop;

  if p_progress is not null then
    update public.sites
    set progress = p_progress
    where id = p_site_id;

    get diagnostics v_updated_count = row_count;
    if v_updated_count <> 1 then
      raise exception 'site progress update not authorized' using errcode = '42501';
    end if;
  end if;

  return jsonb_build_object(
    'report_id', v_report_id,
    'activities', v_activity_count,
    'issues', v_issue_count,
    'progress_updated', p_progress is not null
  );
end;
$$;

revoke all on function public.commit_site_walkthrough(uuid, jsonb, jsonb, jsonb, integer) from public;
revoke all on function public.commit_site_walkthrough(uuid, jsonb, jsonb, jsonb, integer) from anon;
grant execute on function public.commit_site_walkthrough(uuid, jsonb, jsonb, jsonb, integer) to authenticated;

