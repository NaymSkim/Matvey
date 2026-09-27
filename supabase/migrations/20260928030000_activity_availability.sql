alter table public.activities
  add column is_open boolean not null default true,
  add column available_until timestamptz;

comment on column public.activities.is_open is 'Teacher-controlled access switch for students.';
comment on column public.activities.available_until is 'Optional absolute deadline; student answers are rejected at and after this moment.';
