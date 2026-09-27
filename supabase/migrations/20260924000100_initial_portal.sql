create extension if not exists pgcrypto with schema extensions;

create table public.teachers (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 80),
  normalized_name text not null,
  code_hash text not null,
  active boolean not null default true,
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);
create index students_normalized_name_idx on public.students(normalized_name) where active;

create table public.student_devices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index student_devices_student_idx on public.student_devices(student_id);

create table public.activities (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  title text not null,
  verification_mode text not null check (verification_mode in ('server-graded', 'visit-only')),
  grade_thresholds jsonb not null default '{"5":85,"4":65,"3":40,"2":0}'::jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.activity_runs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  activity_id text not null references public.activities(id) on delete cascade,
  variant_id text not null default 'default',
  run_no smallint not null check (run_no between 1 and 2),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  max_points numeric(10,2) not null check (max_points >= 0),
  score numeric(10,2) not null default 0 check (score >= 0 and score <= max_points),
  percent numeric(6,2) check (percent between 0 and 100),
  grade smallint check (grade between 2 and 5),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  check ((status = 'in_progress' and submitted_at is null) or (status = 'submitted' and submitted_at is not null)),
  constraint activity_runs_two_runs_per_activity unique (student_id, activity_id, run_no)
);
create index activity_runs_student_activity_idx on public.activity_runs(student_id, activity_id, submitted_at desc);

create table public.answer_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique,
  run_id uuid not null references public.activity_runs(id) on delete cascade,
  activity_id text not null references public.activities(id) on delete cascade,
  question_id text not null,
  answer_json jsonb not null,
  graded boolean not null default true,
  correct boolean,
  points numeric(10,2) not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  check ((graded and correct is not null) or (not graded and correct is null)),
  unique (run_id, question_id)
);
create index answer_attempts_run_idx on public.answer_attempts(run_id, created_at);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  activity_id text references public.activities(id) on delete cascade,
  entry_id uuid not null unique,
  path text,
  visited_at timestamptz not null default now()
);
create index visits_student_activity_idx on public.visits(student_id, activity_id, visited_at desc);

create table public.activity_access (
  student_id uuid not null references public.students(id) on delete cascade,
  activity_id text not null references public.activities(id) on delete cascade,
  solutions_released_at timestamptz,
  released_by uuid references public.teachers(auth_user_id) on delete set null,
  primary key (student_id, activity_id)
);

create table public.answer_keys (
  activity_id text not null references public.activities(id) on delete cascade,
  variant_id text not null default 'default',
  question_id text not null,
  matcher_type text not null check (matcher_type in ('choice', 'numeric', 'match', 'formula', 'ungraded')),
  expected_json jsonb,
  tolerance numeric not null default 0 check (tolerance >= 0),
  points numeric(10,2) not null default 1 check (points >= 0),
  solution_html text not null default '',
  primary key (activity_id, variant_id, question_id)
);

create table public.claim_attempts (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  client_fingerprint uuid not null,
  network_hash text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);
create index claim_attempts_rate_limit_idx on public.claim_attempts(auth_user_id, attempted_at desc);
create index claim_attempts_fingerprint_idx on public.claim_attempts(client_fingerprint, attempted_at desc);
create index claim_attempts_network_idx on public.claim_attempts(network_hash, attempted_at desc);

create or replace function public.record_answer_attempt(
  p_attempt_id uuid,
  p_run_id uuid,
  p_student_id uuid,
  p_question_id text,
  p_answer_json jsonb,
  p_graded boolean,
  p_correct boolean,
  p_points numeric
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  existing public.answer_attempts%rowtype;
  target_run public.activity_runs%rowtype;
  current_score numeric;
begin
  select * into existing from public.answer_attempts where attempt_id = p_attempt_id;
  if found then
    if existing.run_id <> p_run_id or existing.question_id <> p_question_id then
      raise exception 'Идентификатор попытки уже использован.' using errcode = '23505';
    end if;
    return jsonb_build_object('graded', existing.graded, 'correct', existing.correct, 'points', existing.points, 'duplicate', true);
  end if;

  select * into target_run
  from public.activity_runs
  where id = p_run_id and student_id = p_student_id
  for update;
  if not found then raise exception 'Сдача не найдена.' using errcode = 'P0002'; end if;
  if target_run.status <> 'in_progress' then raise exception 'Эта сдача уже завершена.' using errcode = 'P0001'; end if;

  -- A concurrent retry waits for the run lock, then sees the first insert.
  select * into existing from public.answer_attempts where attempt_id = p_attempt_id;
  if found then
    if existing.run_id <> p_run_id or existing.question_id <> p_question_id then
      raise exception 'Идентификатор попытки уже использован.' using errcode = '23505';
    end if;
    return jsonb_build_object('graded', existing.graded, 'correct', existing.correct, 'points', existing.points, 'duplicate', true);
  end if;

  insert into public.answer_attempts(attempt_id, run_id, activity_id, question_id, answer_json, graded, correct, points)
  values (p_attempt_id, p_run_id, target_run.activity_id, p_question_id, p_answer_json, p_graded, p_correct, p_points);

  select coalesce(sum(points), 0) into current_score from public.answer_attempts where run_id = p_run_id;
  return jsonb_build_object('graded', p_graded, 'correct', p_correct, 'points', p_points, 'currentScore', current_score);
exception
  when unique_violation then
    raise exception 'Ответ на этот вопрос уже был отправлен.' using errcode = '23505';
end;
$$;

create or replace function public.finish_activity_run(p_run_id uuid, p_student_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  target_run public.activity_runs%rowtype;
  thresholds jsonb;
  final_score numeric;
  final_percent numeric;
  final_grade smallint;
begin
  select * into target_run
  from public.activity_runs
  where id = p_run_id and student_id = p_student_id
  for update;
  if not found then raise exception 'Сдача не найдена.' using errcode = 'P0002'; end if;
  if target_run.status = 'submitted' then return to_jsonb(target_run); end if;

  select grade_thresholds into thresholds from public.activities where id = target_run.activity_id;
  select coalesce(sum(points), 0) into final_score from public.answer_attempts where run_id = p_run_id;
  if target_run.max_points > 0 then
    final_percent := round(final_score / target_run.max_points * 100, 2);
    final_grade := case
      when final_percent >= coalesce((thresholds->>'5')::numeric, 85) then 5
      when final_percent >= coalesce((thresholds->>'4')::numeric, 65) then 4
      when final_percent >= coalesce((thresholds->>'3')::numeric, 40) then 3
      else 2
    end;
  end if;

  update public.activity_runs
  set status = 'submitted', score = final_score, percent = final_percent, grade = final_grade, submitted_at = now()
  where id = p_run_id
  returning * into target_run;
  return to_jsonb(target_run);
end;
$$;

create or replace function public.reset_student_access(p_student_id uuid, p_code_hash text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.students where id = p_student_id for update;
  if not found then raise exception 'Ученик не найден.' using errcode = 'P0002'; end if;
  update public.students set code_hash = p_code_hash where id = p_student_id;
  delete from public.student_devices where student_id = p_student_id;
end;
$$;

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
  where not exists (select 1 from jsonb_to_recordset(p_activities) as current_item(id text) where current_item.id = a.id);

  if p_answers is not null then
    if exists (select 1 from public.activity_runs where status = 'in_progress') then
      raise exception 'Нельзя обновлять ключи, пока есть незавершённые работы.' using errcode = 'P0001';
    end if;
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

revoke execute on function public.record_answer_attempt(uuid, uuid, uuid, text, jsonb, boolean, boolean, numeric) from public, anon, authenticated;
revoke execute on function public.finish_activity_run(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.reset_student_access(uuid, text) from public, anon, authenticated;
revoke execute on function public.sync_portal_content(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_answer_attempt(uuid, uuid, uuid, text, jsonb, boolean, boolean, numeric) to service_role;
grant execute on function public.finish_activity_run(uuid, uuid) to service_role;
grant execute on function public.reset_student_access(uuid, text) to service_role;
grant execute on function public.sync_portal_content(jsonb, jsonb) to service_role;

alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.student_devices enable row level security;
alter table public.activities enable row level security;
alter table public.activity_runs enable row level security;
alter table public.answer_attempts enable row level security;
alter table public.visits enable row level security;
alter table public.activity_access enable row level security;
alter table public.answer_keys enable row level security;
alter table public.claim_attempts enable row level security;

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teachers t where t.auth_user_id = auth.uid()
  );
$$;

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.student_id
  from public.student_devices d
  where d.auth_user_id = auth.uid()
  limit 1;
$$;

create policy teachers_read_self on public.teachers
  for select to authenticated using (auth_user_id = auth.uid());

create policy students_read_own_or_teacher on public.students
  for select to authenticated using (id = public.current_student_id() or public.is_teacher());

create policy devices_read_own_or_teacher on public.student_devices
  for select to authenticated using (auth_user_id = auth.uid() or public.is_teacher());

create policy activities_read_authenticated on public.activities
  for select to authenticated using (active or public.is_teacher());

create policy runs_read_own_or_teacher on public.activity_runs
  for select to authenticated using (student_id = public.current_student_id() or public.is_teacher());

create policy attempts_read_own_or_teacher on public.answer_attempts
  for select to authenticated using (
    public.is_teacher() or exists (
      select 1 from public.activity_runs r
      where r.id = answer_attempts.run_id and r.student_id = public.current_student_id()
    )
  );

create policy visits_read_own_or_teacher on public.visits
  for select to authenticated using (student_id = public.current_student_id() or public.is_teacher());

create policy access_read_own_or_teacher on public.activity_access
  for select to authenticated using (student_id = public.current_student_id() or public.is_teacher());

-- Intentionally no browser policy for answer_keys or claim_attempts. Edge Functions
-- read them with the server-side secret key after checking the caller's JWT.
revoke all on table public.answer_keys from anon, authenticated;
revoke all on table public.claim_attempts from anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.teachers, public.students, public.student_devices, public.activities,
  public.activity_runs, public.answer_attempts, public.visits, public.activity_access to authenticated;
grant execute on function public.is_teacher(), public.current_student_id() to authenticated;
