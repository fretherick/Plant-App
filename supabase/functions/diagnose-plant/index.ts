import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    likelyIssues: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          issue: { type: "string" },
          confidence: { type: "number" },
          evidence: { type: "string" }
        },
        required: ["issue", "confidence", "evidence"]
      }
    },
    immediateActions: {
      type: "array",
      maxItems: 5,
      items: { type: "string" }
    },
    careAdjustments: {
      type: "array",
      maxItems: 5,
      items: { type: "string" }
    },
    severity: {
      type: "string",
      enum: ["low", "medium", "high"]
    },
    whenToSeekHumanHelp: { type: "string" }
  },
  required: ["summary", "likelyIssues", "immediateActions", "careAdjustments", "severity", "whenToSeekHumanHelp"]
};

function extractOutputText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = Array.isArray(response.output) ? response.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item)) {
        return [];
      }

      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((content) => {
      if (!content || typeof content !== "object") {
        return "";
      }

      const item = content as { type?: string; text?: string };
      return item.type === "output_text" && typeof item.text === "string" ? item.text : "";
    })
    .join("");
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_VISION_MODEL") ?? "gpt-4.1-mini";

  if (!openaiKey) {
    return Response.json({ error: "OPENAI_API_KEY is missing" }, { status: 500, headers: corsHeaders });
  }

  const body = await request.json().catch(() => null);
  const image = body?.image;
  const plant = body?.plant ?? {};
  const symptoms = typeof body?.symptoms === "string" ? body.symptoms : "";

  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return Response.json({ error: "Image data URL is required" }, { status: 400, headers: corsHeaders });
  }

  const plantContext = JSON.stringify({
    name: plant.name ?? "",
    species: plant.species ?? "",
    location: plant.location ?? "",
    sunlight: plant.sunlight ?? "",
    wateringIntervalDays: plant.wateringIntervalDays ?? null,
    lastWateredAt: plant.lastWateredAt ?? null,
    fertilizingEnabled: Boolean(plant.fertilizingEnabled),
    fertilizingIntervalDays: plant.fertilizingIntervalDays ?? null,
    lastFertilizedAt: plant.lastFertilizedAt ?? null,
    symptoms
  });

  const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions:
        "You are a cautious houseplant care assistant. Diagnose likely plant care problems from the image and user context. Do not claim certainty. Avoid medical or toxicology advice. Recommend practical, low-risk plant care steps.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `Plant context JSON: ${plantContext}\n\nAnalyze the plant image and symptoms. Return JSON only.`
            },
            {
              type: "input_image",
              image_url: image,
              detail: "high"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "plant_diagnosis",
          schema,
          strict: true
        }
      }
    })
  });

  const data = await openaiResponse.json();

  if (!openaiResponse.ok) {
    return Response.json(
      { error: data?.error?.message ?? "OpenAI request failed" },
      { status: openaiResponse.status, headers: corsHeaders }
    );
  }

  const text = extractOutputText(data);

  try {
    return Response.json(JSON.parse(text), { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Could not parse model response" }, { status: 502, headers: corsHeaders });
  }
});
