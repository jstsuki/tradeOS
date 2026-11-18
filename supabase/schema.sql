-- =====================================================================
-- MarketOS database setup
-- Paste this whole file into Supabase > SQL Editor > New query, then Run.
-- It is safe to run more than once.
--
-- Every table has Row Level Security (RLS) turned on, with rules that
-- only let a logged-in user see and change their OWN rows.
-- =====================================================================

-- ---------- Settings (one row per user) ----------
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  daily_goal numeric not null default 1000,
  max_daily_loss numeric not null default 500,
  max_trades_per_day integer not null default 3,
  seeded boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- Prop firm accounts (evaluation + funded) ----------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('evaluation', 'funded')),
  firm text not null,
  label text,
  account_size numeric,
  profit_target numeric,
  max_drawdown numeric,
  daily_loss_limit numeric,
  drawdown_type text,
  current_balance numeric,
  status text not null default 'Active',
  start_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Payouts ----------
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid references public.accounts on delete set null,
  firm text not null,
  amount numeric not null,
  payout_date date not null default current_date,
  status text not null default 'Received',
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Expenses (fees, resets, data, etc.) ----------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid references public.accounts on delete set null,
  firm text not null,
  category text not null default 'Evaluation fee',
  amount numeric not null,
  expense_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Trading playbook setups ----------
create table if not exists public.playbook_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  market text,
  timeframe text,
  description text,
  entry_rules text,
  exit_rules text,
  invalidation text,
  created_at timestamptz not null default now()
);

-- ---------- Trades (journal) ----------
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid references public.accounts on delete set null,
  setup_id uuid references public.playbook_setups on delete set null,
  trade_date date not null default current_date,
  symbol text not null,
  direction text not null default 'Long' check (direction in ('Long', 'Short')),
  contracts numeric,
  entry_price numeric,
  exit_price numeric,
  pnl numeric not null default 0,
  r_multiple numeric,
  followed_plan boolean not null default true,
  mood text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Checklists (market prep + trade validation) ----------
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  list text not null check (list in ('prep', 'validation')),
  label text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_checks (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  item_id uuid not null references public.checklist_items on delete cascade,
  check_date date not null default current_date,
  primary key (user_id, item_id, check_date)
);

-- ---------- Personal reminders ----------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ---------- Helpful indexes ----------
create index if not exists trades_user_date_idx on public.trades (user_id, trade_date);
create index if not exists accounts_user_kind_idx on public.accounts (user_id, kind);

-- ---------- Row Level Security: "only my own rows" ----------
do $$
declare t text;
begin
  foreach t in array array[
    'user_settings','accounts','payouts','expenses','playbook_setups',
    'trades','checklist_items','checklist_checks','reminders'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ---------- Table access for logged-in users (RLS still applies) ----------
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
