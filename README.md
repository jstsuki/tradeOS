# MarketOS 🍵

A private, all-in-one personal trading dashboard with a Japanese "Matcha Garden" look.

**Pages:** Overview (daily goal, market prep, trade validation, risk guard, reminders) · Evaluation accounts · Funded accounts · Prop firm finances · Trading playbook · Performance analytics · Trading journal.

**Built with:** React + Vite (the app), Supabase (login + private database), hosted on Vercel.

## How it's kept private
- You must log in to see anything.
- Every database table uses Supabase *Row Level Security*: each row is tied to your user, and the database itself refuses to show it to anyone else.
- The app only uses Supabase's **public** (publishable / anon) key. The secret / service_role key is never used or stored here.

## Setup (one time)
1. **Database:** in Supabase, open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
2. **Hosting:** import this repository in Vercel and add two Environment Variables (values from Supabase → Project Settings → API):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. **Login link:** in Supabase → Authentication → URL Configuration, set **Site URL** to your Vercel address.
4. Create your user in Supabase → Authentication → Users → **Add user** (the app itself only has a log-in screen).
5. **Lock the door:** in Supabase → Authentication → Sign In / Providers, turn **off** "Allow new users to sign up".

## Running on a computer (optional, for developers)
```bash
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev
```
