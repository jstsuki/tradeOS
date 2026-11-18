-- MarketOS: give logged-in users access to the app's tables.
-- (Newer Supabase projects don't do this automatically.)
-- Row Level Security still limits each user to their OWN rows.
-- Safe to run more than once.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.user_settings, public.accounts, public.payouts, public.expenses,
  public.playbook_setups, public.trades, public.checklist_items,
  public.checklist_checks, public.reminders
to authenticated;
revoke all on
  public.user_settings, public.accounts, public.payouts, public.expenses,
  public.playbook_setups, public.trades, public.checklist_items,
  public.checklist_checks, public.reminders
from anon;
