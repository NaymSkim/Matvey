update public.activities
set
  title = 'Все формулы ОГЭ',
  verification_mode = 'visit-only',
  updated_at = now()
where id = 'oge-formulas';

delete from public.answer_keys
where activity_id = 'oge-formulas';
