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
    matches: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          commonName: { type: "string" },
          scientificName: { type: "string" },
          confidence: { type: "number" },
          visibleTraits: {
            type: "array",
            items: { type: "string" }
          },
          careHint: { type: "string" }
        },
        required: ["commonName", "scientificName", "confidence", "visibleTraits", "careHint"]
      }
    }
  },
  required: ["matches"]
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

  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return Response.json({ error: "Image data URL is required" }, { status: 400, headers: corsHeaders });
  }

  const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions:
        "You identify houseplants from images. Return cautious, practical guesses only. If the image is unclear, lower confidence and say so in visibleTraits.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Identify this plant from the image. Return JSON with likely plant matches, confidence from 0 to 1, visible traits, and one short care hint."
            },
            {
              type: "input_image",
              image_url: image,
              detail: "low"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "plant_identification",
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
