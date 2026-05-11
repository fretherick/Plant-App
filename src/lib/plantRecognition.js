import { isSupabaseConfigured, supabase } from "./supabaseClient";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getFunctionErrorMessage(error) {
  const fallback = error?.message || "AI request failed.";
  const response = error?.context;

  if (!response || typeof response.clone !== "function") {
    return fallback;
  }

  try {
    const body = await response.clone().json();
    return body?.error || body?.message || fallback;
  } catch {
    try {
      const text = await response.clone().text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}

async function invokeAiFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  return data;
}

export async function identifyPlantFromImage(file) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured, so image recognition cannot run yet.");
  }

  if (!file) {
    throw new Error("Choose an image first.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Use an image smaller than 8 MB.");
  }

  const image = await fileToDataUrl(file);
  return invokeAiFunction("identify-plant", { image });
}

export async function diagnosePlant({ file, plant, symptoms }) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured, so AI Doctor cannot run yet.");
  }

  if (!file) {
    throw new Error("Choose an image first.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Use an image smaller than 8 MB.");
  }

  const image = await fileToDataUrl(file);
  return invokeAiFunction("diagnose-plant", {
      image,
      plant: {
        name: plant?.name ?? "",
        species: plant?.species ?? "",
        sunlight: plant?.sunlight ?? "",
        location: plant?.location ?? "",
        wateringIntervalDays: plant?.wateringIntervalDays ?? null,
        lastWateredAt: plant?.lastWateredAt ?? null,
        fertilizingEnabled: Boolean(plant?.fertilizingEnabled),
        fertilizingIntervalDays: plant?.fertilizingIntervalDays ?? null,
        lastFertilizedAt: plant?.lastFertilizedAt ?? null
      },
      symptoms: symptoms?.trim() ?? ""
  });
}
