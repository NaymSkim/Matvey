insert into public.activities(id, title, verification_mode, grade_thresholds, active, updated_at)
values
  ('gromtseva-sr-14', 'Самостоятельная работа № 14', 'visit-only', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now()),
  ('gromtseva-sr-15', 'Самостоятельная работа № 15', 'visit-only', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now()),
  ('gromtseva-sr-16', 'Самостоятельная работа № 16', 'visit-only', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now()),
  ('gromtseva-sr-17', 'Самостоятельная работа № 17', 'visit-only', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now()),
  ('gromtseva-sr-18', 'Самостоятельная работа № 18', 'visit-only', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now())
on conflict (id) do update set
  title = excluded.title,
  verification_mode = excluded.verification_mode,
  grade_thresholds = excluded.grade_thresholds,
  active = excluded.active,
  updated_at = excluded.updated_at;
