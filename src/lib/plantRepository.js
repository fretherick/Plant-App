import { addDays, dateInputToIso } from "./date";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const LOCAL_STORAGE_KEY = "plant-journal/plants";
const PHOTO_BUCKET = "plant-photos";

function makeId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePlant(input) {
  const wateringIntervalDays = Number.parseInt(input.wateringIntervalDays, 10);
  const fertilizingEnabled = Boolean(input.fertilizingEnabled);
  const fertilizingIntervalDays = Number.parseInt(input.fertilizingIntervalDays, 10);
  return {
    name: input.name.trim(),
    species: input.species.trim(),
    location: input.location.trim(),
    sunlight: input.sunlight,
    wateringIntervalDays,
    fertilizingEnabled,
    fertilizingIntervalDays: fertilizingEnabled ? fertilizingIntervalDays : null,
    notes: input.notes.trim(),
    lastWateredAt: dateInputToIso(input.lastWateredAt),
    lastFertilizedAt: fertilizingEnabled ? dateInputToIso(input.lastFertilizedAt) : null,
    reminderEmailEnabled: Boolean(input.reminderEmailEnabled)
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readLocalPlants() {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function writeLocalPlants(plants) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plants));
}

function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    species: row.species ?? "",
    location: row.location ?? "",
    sunlight: row.sunlight ?? "Bright indirect",
    wateringIntervalDays: row.watering_interval_days,
    fertilizingEnabled: Boolean(row.fertilizing_enabled),
    fertilizingIntervalDays: row.fertilizing_interval_days,
    notes: row.notes ?? "",
    lastWateredAt: row.last_watered_at,
    lastFertilizedAt: row.last_fertilized_at,
    photoUrl: row.photo_url,
    photoStoragePath: row.photo_storage_path,
    reminderEmailEnabled: Boolean(row.reminder_email_enabled),
    createdAt: row.created_at
  };
}

async function addSignedPhotoUrl(plant) {
  if (!plant.photoStoragePath) {
    return plant;
  }

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(plant.photoStoragePath, 60 * 60);

  if (error) {
    console.warn(error.message);
    return {
      ...plant,
      photoUrl: null
    };
  }

  return {
    ...plant,
    photoUrl: data.signedUrl
  };
}

function toPlantFields(normalizedPlant) {
  return {
    name: normalizedPlant.name,
    species: normalizedPlant.species || null,
    location: normalizedPlant.location || null,
    sunlight: normalizedPlant.sunlight,
    watering_interval_days: normalizedPlant.wateringIntervalDays,
    fertilizing_enabled: normalizedPlant.fertilizingEnabled,
    fertilizing_interval_days: normalizedPlant.fertilizingIntervalDays,
    notes: normalizedPlant.notes || null,
    last_watered_at: normalizedPlant.lastWateredAt,
    last_fertilized_at: normalizedPlant.lastFertilizedAt,
    reminder_email_enabled: normalizedPlant.reminderEmailEnabled
  };
}

function toInsert(normalizedPlant, userId) {
  return {
    ...toPlantFields(normalizedPlant),
    user_id: userId
  };
}

function safeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9_.-]/g, "-");
}

async function uploadRemotePhoto({ file, plantId, userId }) {
  if (!file) {
    return null;
  }

  const path = `${userId}/${plantId}/${Date.now()}-${safeFileName(file.name || "plant.jpg")}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: false
  });

  if (error) {
    throw error;
  }

  return { path };
}

async function attachRemotePhoto({ file, plant, userId }) {
  if (!file) {
    return plant;
  }

  const photo = await uploadRemotePhoto({
    file,
    plantId: plant.id,
    userId
  });

  const { error: photoError } = await supabase.from("plant_photos").insert({
    plant_id: plant.id,
    user_id: userId,
    image_url: photo.path,
    storage_path: photo.path
  });

  if (photoError) {
    throw photoError;
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from("plants")
    .update({
      photo_storage_path: photo.path,
      photo_url: null
    })
    .eq("id", plant.id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  return addSignedPhotoUrl(fromRow(updatedRow));
}

async function ensureReminder({ plant, userId }) {
  if (!plant.reminderEmailEnabled) {
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("plant_id", plant.id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return;
  }

  const nextDueAt = addDays(plant.lastWateredAt, plant.wateringIntervalDays).toISOString();
  const { error } = await supabase.from("reminders").upsert(
    {
      plant_id: plant.id,
      user_id: userId,
      channel: "email",
      next_due_at: nextDueAt,
      active: true
    },
    {
      onConflict: "plant_id,channel"
    }
  );
  if (error) {
    throw error;
  }
}

export async function getSession() {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(callback) {
  if (!isSupabaseConfigured) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}

export async function signUpWithPassword(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function syncProfile(session) {
  if (!session?.user) {
    return;
  }

  const { error } = await supabase.from("profiles").upsert({
    id: session.user.id,
    email: session.user.email
  });
  if (error) {
    console.warn(error.message);
  }
}

export async function listPlants(session) {
  if (!session || !isSupabaseConfigured) {
    return readLocalPlants();
  }

  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Promise.all(data.map((row) => addSignedPhotoUrl(fromRow(row))));
}

export async function createPlant(input, session) {
  const normalizedPlant = normalizePlant(input);

  if (!session || !isSupabaseConfigured) {
    const plant = {
      ...normalizedPlant,
      id: makeId(),
      photoUrl: await fileToDataUrl(input.photoFile),
      createdAt: new Date().toISOString()
    };
    const plants = [plant, ...readLocalPlants()];
    writeLocalPlants(plants);
    return plant;
  }

  const userId = session.user.id;
  const { data, error } = await supabase
    .from("plants")
    .insert(toInsert(normalizedPlant, userId))
    .select()
    .single();

  if (error) {
    throw error;
  }

  let plant = await addSignedPhotoUrl(fromRow(data));

  plant = await attachRemotePhoto({ file: input.photoFile, plant, userId });

  await ensureReminder({ plant, userId });
  return plant;
}

export async function updatePlant(plantId, input, session) {
  const normalizedPlant = normalizePlant(input);

  if (!session || !isSupabaseConfigured) {
    const photoUrl = input.photoFile ? await fileToDataUrl(input.photoFile) : undefined;
    const plants = readLocalPlants();
    let updatedPlant = null;
    const updatedPlants = plants.map((plant) => {
      if (plant.id !== plantId) {
        return plant;
      }

      updatedPlant = {
        ...plant,
        ...normalizedPlant,
        photoUrl: photoUrl ?? plant.photoUrl
      };
      return updatedPlant;
    });

    writeLocalPlants(updatedPlants);
    if (!updatedPlant) {
      throw new Error("Plant not found.");
    }

    return updatedPlant;
  }

  const { data, error } = await supabase
    .from("plants")
    .update(toPlantFields(normalizedPlant))
    .eq("id", plantId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  let plant = await addSignedPhotoUrl(fromRow(data));
  plant = await attachRemotePhoto({
    file: input.photoFile,
    plant,
    userId: session.user.id
  });

  await ensureReminder({ plant, userId: session.user.id });
  return plant;
}

export async function markPlantWatered(plant, session) {
  const lastWateredAt = new Date().toISOString();

  if (!session || !isSupabaseConfigured) {
    const plants = readLocalPlants();
    const updated = plants.map((item) =>
      item.id === plant.id ? { ...item, lastWateredAt } : item
    );
    writeLocalPlants(updated);
    return updated.find((item) => item.id === plant.id);
  }

  const { data, error } = await supabase
    .from("plants")
    .update({ last_watered_at: lastWateredAt })
    .eq("id", plant.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const { error: eventError } = await supabase.from("watering_events").insert({
    plant_id: plant.id,
    user_id: session.user.id,
    watered_at: lastWateredAt
  });
  if (eventError) {
    throw eventError;
  }

  const updatedPlant = await addSignedPhotoUrl(fromRow(data));
  await ensureReminder({ plant: updatedPlant, userId: session.user.id });
  return updatedPlant;
}

export async function markPlantFertilized(plant, session) {
  const lastFertilizedAt = new Date().toISOString();

  if (!session || !isSupabaseConfigured) {
    const plants = readLocalPlants();
    const updated = plants.map((item) =>
      item.id === plant.id ? { ...item, lastFertilizedAt } : item
    );
    writeLocalPlants(updated);
    return updated.find((item) => item.id === plant.id);
  }

  const { data, error } = await supabase
    .from("plants")
    .update({ last_fertilized_at: lastFertilizedAt })
    .eq("id", plant.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const { error: eventError } = await supabase.from("fertilizing_events").insert({
    plant_id: plant.id,
    user_id: session.user.id,
    fertilized_at: lastFertilizedAt
  });
  if (eventError) {
    throw eventError;
  }

  return addSignedPhotoUrl(fromRow(data));
}

export async function deletePlant(plant, session) {
  if (!session || !isSupabaseConfigured) {
    const plants = readLocalPlants().filter((item) => item.id !== plant.id);
    writeLocalPlants(plants);
    return;
  }

  const { error } = await supabase.from("plants").delete().eq("id", plant.id);

  if (error) {
    throw error;
  }

  if (plant.photoStoragePath) {
    const { error: photoError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([plant.photoStoragePath]);

    if (photoError) {
      console.warn(photoError.message);
    }
  }
}
