# Supabase Setup

1. Create a Supabase project.
2. Run `schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env` and add your project URL and anon key.
4. Deploy `functions/send-reminders`, `functions/identify-plant`, and `functions/diagnose-plant` as Edge Functions.
5. Add function secrets:

```bash
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OPENAI_VISION_MODEL=gpt-4.1-mini
supabase secrets set RESEND_API_KEY=...
supabase secrets set REMINDER_FROM_EMAIL="Plant Journal <plants@yourdomain.com>"
supabase secrets set CRON_SECRET=...
```

6. Schedule the `send-reminders` Edge Function hourly with Supabase Cron.

`OPENAI_VISION_MODEL` is optional. If it is not set, `identify-plant` and `diagnose-plant` use `gpt-4.1-mini`.

The frontend works without Supabase credentials in local browser storage mode. Once the env vars are set and a user signs in, it switches to Supabase-backed cloud mode.
