insert into public.activities(id, title, verification_mode, grade_thresholds, active, updated_at)
values
  ('gromtseva-sr-11', 'Самостоятельная работа № 11', 'server-graded', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now()),
  ('gromtseva-sr-12', 'Самостоятельная работа № 12', 'server-graded', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now()),
  ('gromtseva-sr-13', 'Самостоятельная работа № 13', 'server-graded', '{"5":85,"4":65,"3":40,"2":0}'::jsonb, true, now())
on conflict (id) do update set
  title = excluded.title,
  verification_mode = excluded.verification_mode,
  grade_thresholds = excluded.grade_thresholds,
  active = excluded.active,
  updated_at = excluded.updated_at;

-- Если объединённая карточка существовала в старой версии базы, она больше
-- не должна появляться в кабинете преподавателя.
update public.activities
set active = false, updated_at = now()
where id = 'gromtseva-sr-11-13';
