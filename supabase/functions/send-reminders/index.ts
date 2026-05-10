import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DueReminder = {
  reminder_id: string;
  plant_id: string;
  user_id: string;
  next_due_at: string;
  plant_name: string;
  watering_interval_days: number;
  email: string;
};

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

async function sendEmail(reminder: DueReminder) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("REMINDER_FROM_EMAIL") ?? "Plant Journal <reminders@example.com>";

  if (!resendKey) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: reminder.email,
      subject: `Water ${reminder.plant_name}`,
      text: `${reminder.plant_name} is due for watering today.`
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Supabase environment is missing" }, { status: 500 });
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data, error } = await db
    .from("due_email_reminders")
    .select("*")
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const results = [];

  for (const reminder of data as DueReminder[]) {
    try {
      await sendEmail(reminder);
      await db
        .from("reminders")
        .update({
          last_sent_at: now.toISOString(),
          next_due_at: addDays(now, reminder.watering_interval_days).toISOString()
        })
        .eq("id", reminder.reminder_id);
      results.push({ id: reminder.reminder_id, status: "sent" });
    } catch (err) {
      results.push({
        id: reminder.reminder_id,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error"
      });
    }
  }

  return Response.json({ processed: results.length, results });
});
