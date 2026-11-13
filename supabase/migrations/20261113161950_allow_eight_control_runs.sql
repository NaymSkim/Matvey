alter table public.activity_runs
  drop constraint if exists activity_runs_run_no_check;

alter table public.activity_runs
  add constraint activity_runs_run_no_check check (run_no between 1 and 8);
