insert into public.activities(id, title, verification_mode, grade_thresholds, active, updated_at)
values
  ('accelerated-motion', 'Прямолинейное равноускоренное движение', 'visit-only', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now()),
  ('curvilinear-motion', 'Криволинейное движение', 'visit-only', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now())
on conflict (id) do update set
  title = excluded.title,
  verification_mode = excluded.verification_mode,
  grade_thresholds = excluded.grade_thresholds,
  active = excluded.active,
  updated_at = excluded.updated_at;
