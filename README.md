# Plant Journal

A web-first PWA for saving plants, editing plant records, tracking watering and fertilizing, adding photos, and preparing email reminders through Supabase.

## Stack

- Vite + React
- Supabase Auth, Postgres, Storage, and Edge Functions
- Local browser storage fallback when Supabase is not configured
- Installable PWA shell with a manifest and service worker
- Bottom tab navigation: Home, Plants, AI Doctor, Plant Care, Journal, Settings
- Plant Care 101 screen with searchable popular plant image cards
- OpenAI-powered plant image recognition through a Supabase Edge Function
- OpenAI-powered AI Doctor diagnostics through a Supabase Edge Function

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL on your computer or phone. To test on your phone, keep both devices on the same network and use the network URL that Vite prints.

## Supabase

The app runs without Supabase, but cloud sync, auth, photo storage, and email reminders need a Supabase project.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Restart the dev server.

See `supabase/README.md` for the email reminder, OpenAI image recognition, and AI Doctor functions.

## Hosting

Vercel and Netlify both work well for this Vite app. Set the same environment variables in the hosting dashboard before deploying.

## Next Steps

- Connect a real Supabase project.
- Deploy the reminder Edge Function and schedule it hourly.
- Deploy `identify-plant` and `diagnose-plant`, then add `OPENAI_API_KEY` to enable AI image features.
- Add generated care advice from plant history and season.
