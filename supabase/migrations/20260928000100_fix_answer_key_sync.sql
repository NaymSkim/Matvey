create or replace function public.sync_portal_content(p_activities jsonb, p_answers jsonb default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  activity_count integer;
  answer_count integer := null;
begin
  insert into public.activities(id, title, verification_mode, grade_thresholds, active, updated_at)
  select id, title, verification_mode, grade_thresholds, active, now()
  from jsonb_to_recordset(p_activities) as item(
    id text, title text, verification_mode text, grade_thresholds jsonb, active boolean
  )
  on conflict (id) do update set
    title = excluded.title,
    verification_mode = excluded.verification_mode,
    grade_thresholds = excluded.grade_thresholds,
    active = excluded.active,
    updated_at = excluded.updated_at;

  update public.activities a
  set active = false, updated_at = now()
  where not exists (
    select 1
    from jsonb_to_recordset(p_activities) as current_item(id text)
    where current_item.id = a.id
  );

  if p_answers is not null then
    if exists (select 1 from public.activity_runs where status = 'in_progress') then
      raise exception 'Нельзя обновлять ключи, пока есть незавершённые работы.' using errcode = 'P0001';
    end if;

    -- pg-safeupdate requires an explicit predicate for DELETE statements.
    -- activity_id is NOT NULL by schema, so this intentionally replaces the
    -- complete private answer-key snapshot in the same transaction.
    delete from public.answer_keys where activity_id is not null;

    insert into public.answer_keys(activity_id, variant_id, question_id, matcher_type, expected_json, tolerance, points, solution_html)
    select activity_id, variant_id, question_id, matcher_type, expected_json, tolerance, points, solution_html
    from jsonb_to_recordset(p_answers) as answer(
      activity_id text, variant_id text, question_id text, matcher_type text,
      expected_json jsonb, tolerance numeric, points numeric, solution_html text
    );
    get diagnostics answer_count = row_count;
  end if;

  select count(*) into activity_count from public.activities where active;
  return jsonb_build_object('activities', activity_count, 'answers', answer_count);
end;
$$;

revoke execute on function public.sync_portal_content(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_portal_content(jsonb, jsonb) to service_role;
