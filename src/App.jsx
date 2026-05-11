import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  Cloud,
  BookOpen,
  Droplets,
  House,
  Leaf,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings,
  Sprout,
  Stethoscope,
  Trash2,
  Upload,
  WifiOff
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  createPlant,
  deletePlant as deletePlantRecord,
  getSession,
  listPlants,
  markPlantFertilized,
  markPlantWatered,
  onAuthChange,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  syncProfile,
  updatePlant
} from "./lib/plantRepository";
import {
  formatDate,
  getFertilizingStatus,
  getPlantStatus,
  nextFertilizingDate,
  nextWateringDate,
  todayInputValue,
  toDateInputValue
} from "./lib/date";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { diagnosePlant, identifyPlantFromImage } from "./lib/plantRecognition";

const emptyForm = {
  name: "",
  species: "",
  location: "",
  sunlight: "Bright indirect",
  wateringIntervalDays: "7",
  lastWateredAt: todayInputValue(),
  fertilizingEnabled: false,
  fertilizingIntervalDays: "30",
  lastFertilizedAt: todayInputValue(),
  notes: "",
  reminderEmailEnabled: true
};

const tabs = [
  { id: "home", label: "Home", Icon: House },
  { id: "plants", label: "Plants", Icon: Sprout },
  { id: "doctor", label: "AI Doctor", Icon: Stethoscope },
  { id: "guide", label: "Plant Care", Icon: Search },
  { id: "journal", label: "Journal", Icon: BookOpen },
  { id: "settings", label: "Settings", Icon: Settings }
];

const careGuidePlants = [
  {
    id: "monstera",
    name: "Monstera",
    scientificName: "Monstera deliciosa",
    difficulty: "Easy",
    light: "Bright indirect",
    water: "Water when the top 3-5 cm of soil are dry.",
    wateringIntervalDays: 7,
    fertilizingIntervalDays: 30,
    tags: ["large leaves", "climbing", "bright room"],
    aliases: ["swiss cheese plant", "fenestrated leaves", "tropical"],
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Indoor_Monstera_deliciosa.jpg/960px-Indoor_Monstera_deliciosa.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Indoor_Monstera_deliciosa.jpg",
    attribution: "kallerna, CC BY-SA 4.0",
    notes: "Give it a moss pole or support as it matures. Avoid direct midday sun."
  },
  {
    id: "pothos",
    name: "Golden Pothos",
    scientificName: "Epipremnum aureum",
    difficulty: "Beginner",
    light: "Low to bright indirect",
    water: "Let the top half of the potting mix dry before watering.",
    wateringIntervalDays: 10,
    fertilizingIntervalDays: 45,
    tags: ["trailing", "low light", "easy"],
    aliases: ["devils ivy", "devil's ivy", "hanging plant", "vine"],
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Epipremnum_aureum_%28pothos%29.jpg/500px-Epipremnum_aureum_%28pothos%29.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Epipremnum_aureum_(pothos).jpg",
    attribution: "Filo gen', CC BY-SA",
    notes: "Great for shelves and hanging pots. Trim vines to keep it full."
  },
  {
    id: "snake-plant",
    name: "Snake Plant",
    scientificName: "Dracaena trifasciata",
    difficulty: "Beginner",
    light: "Low to bright indirect",
    water: "Water only after the soil is fully dry.",
    wateringIntervalDays: 21,
    fertilizingIntervalDays: 60,
    tags: ["drought tolerant", "upright", "low light"],
    aliases: ["sansevieria", "mother in law tongue", "mother-in-law's tongue"],
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Snake_plant_%28Sansevieria_trifasciata%29.jpg/330px-Snake_plant_%28Sansevieria_trifasciata%29.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Snake_plant_(Sansevieria_trifasciata).jpg",
    attribution: "Krishnav25, CC0",
    notes: "Use a gritty, fast-draining mix. Most problems come from overwatering."
  },
  {
    id: "peace-lily",
    name: "Peace Lily",
    scientificName: "Spathiphyllum wallisii",
    difficulty: "Easy",
    light: "Low to bright indirect",
    water: "Keep lightly moist, but do not let the pot sit in water.",
    wateringIntervalDays: 6,
    fertilizingIntervalDays: 45,
    tags: ["flowers", "humidity", "shade tolerant"],
    aliases: ["spathiphyllum", "white flowers", "closet plant"],
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Spathiphyllum_wallisii_%28418534471%29.jpg/960px-Spathiphyllum_wallisii_%28418534471%29.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Spathiphyllum_wallisii_(418534471).jpg",
    attribution: "Dinesh Valke, CC BY-SA 2.0",
    notes: "Leaves droop when thirsty. Wipe leaves occasionally to keep them clean."
  },
  {
    id: "spider-plant",
    name: "Spider Plant",
    scientificName: "Chlorophytum comosum",
    difficulty: "Beginner",
    light: "Bright indirect",
    water: "Water when the top few centimeters of soil are dry.",
    wateringIntervalDays: 7,
    fertilizingIntervalDays: 30,
    tags: ["pet friendly", "baby plants", "hanging"],
    aliases: ["chlorophytum", "spider babies", "ribbon plant"],
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Spider_Plant_%28Chlorophytum_comosum%29.jpg/960px-Spider_Plant_%28Chlorophytum_comosum%29.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Spider_Plant_(Chlorophytum_comosum).jpg",
    attribution: "Mokkie, CC BY-SA 3.0",
    notes: "Produces plantlets when happy. Brown tips often point to dry air or salt buildup."
  },
  {
    id: "zz-plant",
    name: "ZZ Plant",
    scientificName: "Zamioculcas zamiifolia",
    difficulty: "Beginner",
    light: "Low to bright indirect",
    water: "Water sparingly after the soil dries out completely.",
    wateringIntervalDays: 21,
    fertilizingIntervalDays: 60,
    tags: ["low light", "drought tolerant", "slow growing"],
    aliases: ["zanzibar gem", "zamioculcas", "zz"],
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/ZZ_Plant_%28Zamioculcas_zamiifolia%29.jpg/330px-ZZ_Plant_%28Zamioculcas_zamiifolia%29.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:ZZ_Plant_(Zamioculcas_zamiifolia).jpg",
    attribution: "Mokkie, CC BY-SA 3.0",
    notes: "Stores water in rhizomes. It is happiest when you mostly leave it alone."
  }
];

function normalizeSearchValue(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function guideSearchText(plant) {
  return [
    plant.name,
    plant.scientificName,
    plant.difficulty,
    plant.light,
    plant.tags.join(" "),
    plant.aliases.join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function findGuidePlantForMatch(match) {
  const candidates = [match.commonName, match.scientificName]
    .filter(Boolean)
    .map((value) => normalizeSearchValue(value));

  return careGuidePlants.find((plant) => {
    const guideNames = [plant.name, plant.scientificName, ...plant.aliases].map((value) =>
      normalizeSearchValue(value)
    );

    return candidates.some((candidate) =>
      guideNames.some((name) => candidate.includes(name) || name.includes(candidate))
    );
  });
}

function guidePlantsFromMatches(matches) {
  const seen = new Set();
  const plants = [];

  for (const match of matches) {
    const plant = findGuidePlantForMatch(match);
    if (plant && !seen.has(plant.id)) {
      seen.add(plant.id);
      plants.push(plant);
    }
  }

  return plants;
}

function getNextCareDate(plant) {
  const dates = [nextWateringDate(plant), nextFertilizingDate(plant)].filter(Boolean);
  return dates.sort((a, b) => a.getTime() - b.getTime())[0];
}

function buildCareTasks(plants) {
  return plants
    .flatMap((plant) => {
      const waterStatus = getPlantStatus(plant);
      const tasks = [
        {
          id: `${plant.id}-water`,
          type: "water",
          label: "Water",
          plant,
          status: waterStatus,
          dueAt: waterStatus.nextWatering
        }
      ];

      if (plant.fertilizingEnabled) {
        const fertilizingStatus = getFertilizingStatus(plant);
        if (fertilizingStatus.nextFertilizing) {
          tasks.push({
            id: `${plant.id}-fertilize`,
            type: "fertilize",
            label: "Fertilize",
            plant,
            status: fertilizingStatus,
            dueAt: fertilizingStatus.nextFertilizing
          });
        }
      }

      return tasks;
    })
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [plants, setPlants] = useState([]);
  const [session, setSession] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editingPlantId, setEditingPlantId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState("sign-in");
  const [authMessage, setAuthMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedPlant = plants.find((plant) => plant.id === selectedId) ?? null;
  const isCloudMode = Boolean(isSupabaseConfigured && session);

  const sortedPlants = useMemo(() => {
    return [...plants].sort(
      (a, b) => getNextCareDate(a).getTime() - getNextCareDate(b).getTime()
    );
  }, [plants]);

  const careTasks = useMemo(() => buildCareTasks(sortedPlants), [sortedPlants]);

  const summary = useMemo(() => {
    return careTasks.reduce(
      (totals, task) => {
        const status = task.status;
        if (status.tone === "overdue" || status.tone === "due") {
          totals.due += 1;
        } else if (status.tone === "soon") {
          totals.soon += 1;
        } else {
          totals.ok += 1;
        }
        return totals;
      },
      { due: 0, soon: 0, ok: 0 }
    );
  }, [careTasks]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const currentSession = await getSession();
      if (!isMounted) {
        return;
      }

      setSession(currentSession);
      if (currentSession) {
        await syncProfile(currentSession);
      }
    }

    loadSession();
    const unsubscribe = onAuthChange(async (nextSession) => {
      setSession(nextSession);
      setSelectedId(null);
      setEditingPlantId(null);
      setIsFormOpen(false);
      if (nextSession) {
        await syncProfile(nextSession);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPlants() {
      setIsLoading(true);
      setError("");
      try {
        const nextPlants = await listPlants(session);
        if (isMounted) {
          setPlants(nextPlants);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Could not load plants.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPlants();

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  function openForm() {
    setForm({ ...emptyForm, lastWateredAt: todayInputValue() });
    setEditingPlantId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setSelectedId(null);
    setActiveTab("plants");
    setIsFormOpen(true);
  }

  function openEditForm(plant) {
    setForm({
      name: plant.name,
      species: plant.species,
      location: plant.location,
      sunlight: plant.sunlight,
      wateringIntervalDays: `${plant.wateringIntervalDays}`,
      lastWateredAt: toDateInputValue(plant.lastWateredAt),
      fertilizingEnabled: Boolean(plant.fertilizingEnabled),
      fertilizingIntervalDays: `${plant.fertilizingIntervalDays ?? 30}`,
      lastFertilizedAt: toDateInputValue(plant.lastFertilizedAt ?? new Date()),
      notes: plant.notes,
      reminderEmailEnabled: Boolean(plant.reminderEmailEnabled)
    });
    setEditingPlantId(plant.id);
    setPhotoFile(null);
    setPhotoPreview(plant.photoUrl ?? null);
    setSelectedId(plant.id);
    setActiveTab("plants");
    setIsFormOpen(true);
  }

  function openPlantDetails(plant) {
    setIsFormOpen(false);
    setSelectedId(plant.id);
    setActiveTab("plants");
  }

  function openGuideTemplate(guidePlant) {
    setForm({
      ...emptyForm,
      name: guidePlant.name,
      species: guidePlant.scientificName,
      sunlight: guidePlant.light,
      wateringIntervalDays: `${guidePlant.wateringIntervalDays}`,
      lastWateredAt: todayInputValue(),
      fertilizingEnabled: true,
      fertilizingIntervalDays: `${guidePlant.fertilizingIntervalDays}`,
      lastFertilizedAt: todayInputValue(),
      notes: guidePlant.notes
    });
    setEditingPlantId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setSelectedId(null);
    setActiveTab("plants");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingPlantId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthMessage("");
    setError("");

    const email = authEmail.trim();
    const password = authPassword.trim();

    if (!email) {
      setError("Enter an email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      const nextSession =
        authMode === "sign-up"
          ? await signUpWithPassword(email, password)
          : await signInWithPassword(email, password);

      if (nextSession) {
        setSession(nextSession);
        await syncProfile(nextSession);
        setAuthPassword("");
        setAuthMessage(authMode === "sign-up" ? "Account created. You are signed in." : "Signed in.");
      } else {
        setAuthMessage("Account created. Confirm your email once, then sign in.");
      }
    } catch (err) {
      setError(err.message || "Could not authenticate.");
    }
  }

  async function handleSignOut() {
    await signOut();
    setAuthPassword("");
    setAuthMessage("");
  }

  async function handleSavePlant(event) {
    event.preventDefault();
    setError("");

    const interval = Number.parseInt(form.wateringIntervalDays, 10);
    if (!form.name.trim()) {
      setError("Give the plant a name before saving.");
      return;
    }

    if (!Number.isFinite(interval) || interval < 1 || interval > 90) {
      setError("Watering interval must be between 1 and 90 days.");
      return;
    }

    if (!form.lastWateredAt) {
      setError("Choose the last watered date.");
      return;
    }

    const fertilizingInterval = Number.parseInt(form.fertilizingIntervalDays, 10);
    if (
      form.fertilizingEnabled &&
      (!Number.isFinite(fertilizingInterval) || fertilizingInterval < 7 || fertilizingInterval > 365)
    ) {
      setError("Fertilizing interval must be between 7 and 365 days.");
      return;
    }

    if (form.fertilizingEnabled && !form.lastFertilizedAt) {
      setError("Choose the last fertilized date.");
      return;
    }

    setIsSaving(true);
    try {
      const plantInput = {
        ...form,
        reminderEmailEnabled: isCloudMode && form.reminderEmailEnabled,
        photoFile
      };
      const plant = editingPlantId
        ? await updatePlant(editingPlantId, plantInput, session)
        : await createPlant(plantInput, session);

      setPlants((current) =>
        editingPlantId
          ? current.map((item) => (item.id === plant.id ? plant : item))
          : [plant, ...current]
      );
      setSelectedId(plant.id);
      closeForm();
    } catch (err) {
      setError(err.message || "Could not save plant.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkWatered(plant) {
    setError("");
    try {
      const updatedPlant = await markPlantWatered(plant, session);
      setPlants((current) =>
        current.map((item) => (item.id === plant.id ? updatedPlant : item))
      );
    } catch (err) {
      setError(err.message || "Could not update watering date.");
    }
  }

  async function handleMarkFertilized(plant) {
    setError("");
    try {
      const updatedPlant = await markPlantFertilized(plant, session);
      setPlants((current) =>
        current.map((item) => (item.id === plant.id ? updatedPlant : item))
      );
    } catch (err) {
      setError(err.message || "Could not update fertilizing date.");
    }
  }

  async function handleDeletePlant(plant) {
    if (!window.confirm(`Delete ${plant.name}?`)) {
      return;
    }

    setError("");
    try {
      await deletePlantRecord(plant, session);
      setPlants((current) => current.filter((item) => item.id !== plant.id));
      if (selectedId === plant.id) {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err.message || "Could not delete plant.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/icon.svg" alt="" className="brand-icon" />
          <div>
            <span className="eyebrow">Plant care</span>
            <h1>Journal</h1>
          </div>
        </div>

        <div className="account-bar">
          <span className={`mode-pill ${isCloudMode ? "cloud" : "local"}`}>
            {isCloudMode ? <Cloud size={16} /> : <WifiOff size={16} />}
            {isCloudMode ? "Cloud" : "Local"}
          </span>

          {isSupabaseConfigured ? (
            session ? (
              <button className="ghost-button" type="button" onClick={handleSignOut}>
                <LogOut size={18} />
                Sign out
              </button>
            ) : (
              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <input
                  aria-label="Email"
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="email@example.com"
                />
                <input
                  aria-label="Password"
                  autoComplete={authMode === "sign-up" ? "new-password" : "current-password"}
                  minLength={6}
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="password"
                />
                <button className="ghost-button" type="submit">
                  <LogIn size={18} />
                  {authMode === "sign-up" ? "Sign up" : "Sign in"}
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "sign-up" ? "sign-in" : "sign-up");
                    setAuthMessage("");
                    setError("");
                  }}
                >
                  {authMode === "sign-up" ? "Use login" : "Create account"}
                </button>
              </form>
            )
          ) : null}
        </div>
      </header>

      {error ? <p className="notice error">{error}</p> : null}
      {authMessage ? <p className="notice success">{authMessage}</p> : null}

      {activeTab === "home" ? (
        <HomeView
          plants={sortedPlants}
          careTasks={careTasks}
          summary={summary}
          isLoading={isLoading}
          onAddPlant={openForm}
          onOpenPlant={openPlantDetails}
          onWater={handleMarkWatered}
          onFertilize={handleMarkFertilized}
        />
      ) : null}

      {activeTab === "plants" ? (
        <PlantsView
          plants={sortedPlants}
          selectedPlant={selectedPlant}
          selectedId={selectedId}
          isLoading={isLoading}
          isFormOpen={isFormOpen}
          isSaving={isSaving}
          isCloudMode={isCloudMode}
          isEditing={Boolean(editingPlantId)}
          form={form}
          photoPreview={photoPreview}
          onAddPlant={openForm}
          onSelectPlant={(plant) => {
            setIsFormOpen(false);
            setSelectedId(selectedId === plant.id ? null : plant.id);
          }}
          onWater={handleMarkWatered}
          onFertilize={handleMarkFertilized}
          onDelete={handleDeletePlant}
          onEdit={openEditForm}
          onFormChange={updateForm}
          onPhotoChange={handlePhotoChange}
          onCancelForm={closeForm}
          onSubmitForm={handleSavePlant}
        />
      ) : null}

      {activeTab === "doctor" ? <DoctorView plants={sortedPlants} /> : null}
      {activeTab === "guide" ? <CareGuideView onUseTemplate={openGuideTemplate} /> : null}
      {activeTab === "journal" ? <JournalView plants={sortedPlants} onOpenPlant={openPlantDetails} /> : null}
      {activeTab === "settings" ? (
        <SettingsView
          authEmail={authEmail}
          authPassword={authPassword}
          authMode={authMode}
          isCloudMode={isCloudMode}
          isSupabaseConfigured={isSupabaseConfigured}
          session={session}
          onAuthEmailChange={setAuthEmail}
          onAuthPasswordChange={setAuthPassword}
          onAuthModeChange={setAuthMode}
          onAuthSubmit={handleAuthSubmit}
          onSignOut={handleSignOut}
        />
      ) : null}

      <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

function BottomTabs({ activeTab, onChange }) {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      {tabs.map(({ id, label, Icon }) => (
        <button
          className={`tab-button ${activeTab === id ? "active" : ""}`}
          key={id}
          type="button"
          onClick={() => onChange(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function HomeView({ careTasks, summary, isLoading, onAddPlant, onOpenPlant, onWater, onFertilize }) {
  const nextTasks = careTasks.slice(0, 4);

  return (
    <main className="tab-page home-page">
      <section className="home-hero">
        <div>
          <span className="eyebrow">Today</span>
          <h2>Care overview</h2>
        </div>
        <button className="primary-button" type="button" onClick={onAddPlant}>
          <Plus size={19} />
          Add plant
        </button>
      </section>

      <div className="summary-grid">
        <Metric label="Due" value={summary.due} tone="due" />
        <Metric label="Soon" value={summary.soon} tone="soon" />
        <Metric label="Ok" value={summary.ok} tone="ok" />
      </div>

      <section className="wide-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Next up</span>
            <h2>Care</h2>
          </div>
          <Droplets size={24} />
        </div>

        {isLoading ? (
          <div className="empty-panel">Loading plants...</div>
        ) : nextTasks.length ? (
          <div className="care-task-list">
            {nextTasks.map((task) => (
              <CareTask
                key={task.id}
                task={task}
                onOpenPlant={() => onOpenPlant(task.plant)}
                onComplete={() =>
                  task.type === "fertilize" ? onFertilize(task.plant) : onWater(task.plant)
                }
              />
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <Sprout size={38} />
            <strong>Your plant list is empty.</strong>
            <button className="primary-button" type="button" onClick={onAddPlant}>
              <Plus size={19} />
              Add plant
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function PlantsView({
  plants,
  selectedPlant,
  selectedId,
  isLoading,
  isFormOpen,
  isSaving,
  isCloudMode,
  isEditing,
  form,
  photoPreview,
  onAddPlant,
  onSelectPlant,
  onWater,
  onFertilize,
  onDelete,
  onEdit,
  onFormChange,
  onPhotoChange,
  onCancelForm,
  onSubmitForm
}) {
  return (
    <main className="workspace tab-page">
      <section className="journal-column">
        <div className="toolbar">
          <h2>Plants</h2>
          <button className="primary-button" type="button" onClick={onAddPlant}>
            <Plus size={19} />
            Add plant
          </button>
        </div>

        <div className="plant-list">
          {isLoading ? (
            <div className="empty-panel">Loading plants...</div>
          ) : plants.length ? (
            plants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                isSelected={selectedId === plant.id}
                onSelect={() => onSelectPlant(plant)}
                onWater={() => onWater(plant)}
                onFertilize={() => onFertilize(plant)}
                onDelete={() => onDelete(plant)}
              />
            ))
          ) : (
            <div className="empty-panel">
              <Sprout size={38} />
              <strong>Your plant list is empty.</strong>
              <button className="primary-button" type="button" onClick={onAddPlant}>
                <Plus size={19} />
                Add plant
              </button>
            </div>
          )}
        </div>
      </section>

      <aside className="side-panel">
        {isFormOpen ? (
          <PlantForm
            form={form}
            isSaving={isSaving}
            isCloudMode={isCloudMode}
            isEditing={isEditing}
            photoPreview={photoPreview}
            onChange={onFormChange}
            onPhotoChange={onPhotoChange}
            onCancel={onCancelForm}
            onSubmit={onSubmitForm}
          />
        ) : selectedPlant ? (
          <PlantDetails
            plant={selectedPlant}
            onEdit={() => onEdit(selectedPlant)}
            onWater={() => onWater(selectedPlant)}
            onFertilize={() => onFertilize(selectedPlant)}
            onDelete={() => onDelete(selectedPlant)}
          />
        ) : (
          <CareQueue plants={plants} />
        )}
      </aside>
    </main>
  );
}

function DoctorView({ plants }) {
  const [selectedPlantId, setSelectedPlantId] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoName, setPhotoName] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosisError, setDiagnosisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const selectedPlant = plants.find((plant) => plant.id === selectedPlantId) ?? null;
  const canAnalyze = Boolean(selectedPlantId && photoPreview);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] ?? null;

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoName(file?.name ?? "");
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
    setDiagnosis(null);
    setDiagnosisError("");
  }

  function clearPhoto() {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoName("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setDiagnosis(null);
    setDiagnosisError("");
  }

  async function handleAnalyze() {
    setDiagnosis(null);
    setDiagnosisError("");
    setIsAnalyzing(true);

    try {
      const result = await diagnosePlant({
        file: photoFile,
        plant: selectedPlant,
        symptoms
      });
      setDiagnosis(result);
    } catch (err) {
      setDiagnosisError(err.message || "Could not analyze plant.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="tab-page single-column">
      <section className="wide-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">AI Doctor</span>
            <h2>Plant check</h2>
          </div>
          <Stethoscope size={24} />
        </div>

        <form className="plant-form">
          <label>
            Plant
            <select value={selectedPlantId} onChange={(event) => setSelectedPlantId(event.target.value)}>
              <option value="">Select plant</option>
              {plants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </select>
          </label>

          <label className="photo-input">
            <Camera size={18} />
            <span>{photoPreview ? "Change photo" : "Add photo"}</span>
            <input accept="image/*" type="file" onChange={handlePhotoChange} />
          </label>

          {photoPreview ? (
            <div className="doctor-photo-preview">
              <img src={photoPreview} alt="" />
              <span>
                <strong>Photo selected</strong>
                <span>{photoName}</span>
              </span>
              <button className="icon-button" type="button" onClick={clearPhoto} aria-label="Clear doctor photo">
                <Trash2 size={17} />
              </button>
            </div>
          ) : null}

          <label>
            Symptoms
            <textarea
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="Yellow leaves, dry tips, spots..."
            />
          </label>

          {diagnosisError ? <p className="notice error">{diagnosisError}</p> : null}

          <button className="primary-button full-width" type="button" disabled={!canAnalyze || isAnalyzing} onClick={handleAnalyze}>
            <Stethoscope size={18} />
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {diagnosis ? <DiagnosisResult diagnosis={diagnosis} /> : null}
      </section>
    </main>
  );
}

function DiagnosisResult({ diagnosis }) {
  return (
    <section className="diagnosis-result">
      <div className="panel-heading">
        <div>
          <span className={`status-pill severity-${diagnosis.severity}`}>{diagnosis.severity}</span>
          <h2>Diagnosis</h2>
        </div>
        <Stethoscope size={24} />
      </div>

      <p className="notes-box">{diagnosis.summary}</p>

      <div className="diagnosis-section">
        <h3>Likely Issues</h3>
        {diagnosis.likelyIssues?.map((issue) => (
          <div className="diagnosis-issue" key={issue.issue}>
            <strong>{issue.issue}</strong>
            <span>{Math.round((issue.confidence ?? 0) * 100)}%</span>
            <p>{issue.evidence}</p>
          </div>
        ))}
      </div>

      <DiagnosisList title="Immediate Actions" items={diagnosis.immediateActions} />
      <DiagnosisList title="Care Adjustments" items={diagnosis.careAdjustments} />

      <p className="quiet-copy">{diagnosis.whenToSeekHumanHelp}</p>
    </section>
  );
}

function DiagnosisList({ title, items = [] }) {
  return (
    <div className="diagnosis-section">
      <h3>{title}</h3>
      <div className="guide-tip-list">
        {items.map((item) => (
          <div key={item}>
            <Check size={17} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CareGuideView({ onUseTemplate }) {
  const [query, setQuery] = useState("");
  const [selectedBasicId, setSelectedBasicId] = useState("light");
  const [selectedGuideId, setSelectedGuideId] = useState(null);
  const [imageSearchName, setImageSearchName] = useState("");
  const [imageSearchPreview, setImageSearchPreview] = useState(null);
  const [imageSearchStatus, setImageSearchStatus] = useState("idle");
  const [imageSearchError, setImageSearchError] = useState("");
  const [imageMatches, setImageMatches] = useState([]);
  const normalizedQuery = query.trim().toLowerCase();
  const genericPlantQueries = new Set(["plant", "plants", "houseplant", "houseplants", "indoor plant", "indoor plants"]);
  const careBasics = [
    {
      id: "light",
      title: "Light",
      summary: "Match the plant to the room before changing watering.",
      detail: "Most houseplants want bright indirect light. Low-light plants grow slower, so they usually need less water.",
      tips: ["Avoid direct midday sun for tropical foliage.", "Rotate plants weekly for even growth.", "Leggy growth usually means too little light."]
    },
    {
      id: "water",
      title: "Water",
      summary: "Check soil dryness instead of watering on autopilot.",
      detail: "Use the plant, pot size, soil, season, and room temperature as signals. Soggy soil is usually worse than slight dryness.",
      tips: ["Check with a finger before watering.", "Empty cachepots after watering.", "Water less in darker rooms and winter."]
    },
    {
      id: "feeding",
      title: "Feeding",
      summary: "Fertilize mostly during active growth, not when stressed.",
      detail: "Most indoor plants only need light feeding in spring and summer. Skip fertilizer if the plant is sick, newly repotted, or dormant.",
      tips: ["Start weak: half-strength is usually enough.", "Do not fertilize bone-dry soil.", "Flush soil occasionally to reduce salt buildup."]
    }
  ];

  const filteredPlants = careGuidePlants.filter((plant) => {
    if (!normalizedQuery || genericPlantQueries.has(normalizedQuery)) {
      return true;
    }

    const haystack = guideSearchText(plant);

    return haystack.includes(normalizedQuery);
  });
  const imageMatchedPlants = guidePlantsFromMatches(imageMatches);
  const visiblePlants = imageSearchPreview && imageMatchedPlants.length ? imageMatchedPlants : filteredPlants;

  const selectedGuide = careGuidePlants.find((plant) => plant.id === selectedGuideId) ?? null;
  const selectedBasic = careBasics.find((basic) => basic.id === selectedBasicId);

  async function handleImageSearch(event) {
    const file = event.target.files?.[0] ?? null;

    if (imageSearchPreview) {
      URL.revokeObjectURL(imageSearchPreview);
    }

    setImageSearchName(file?.name ?? "");
    setImageSearchPreview(file ? URL.createObjectURL(file) : null);
    setImageMatches([]);
    setImageSearchError("");
    if (file) {
      setQuery("");
      setImageSearchStatus("analyzing");
      try {
        const result = await identifyPlantFromImage(file);
        setImageMatches(Array.isArray(result?.matches) ? result.matches : []);
        setImageSearchStatus("done");
      } catch (err) {
        setImageSearchError(err.message || "Image recognition failed.");
        setImageSearchStatus("error");
      }
    } else {
      setImageSearchStatus("idle");
    }
  }

  function clearImageSearch() {
    if (imageSearchPreview) {
      URL.revokeObjectURL(imageSearchPreview);
    }

    setImageSearchName("");
    setImageSearchPreview(null);
    setImageSearchStatus("idle");
    setImageSearchError("");
    setImageMatches([]);
  }

  return (
    <main className="tab-page guide-page">
      <section className="wide-panel guide-search-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search monstera, low light, beginner..."
          />
          <label className="search-image-button" title="Search with image">
            <Camera size={18} />
            <input accept="image/*" type="file" onChange={handleImageSearch} />
          </label>
        </div>

        {imageSearchPreview ? (
          <div className="image-search-preview">
            <img src={imageSearchPreview} alt="" />
            <span>
              <strong>Image selected</strong>
              <span>{imageSearchName}</span>
            </span>
            <button className="icon-button" type="button" onClick={clearImageSearch} aria-label="Clear image search">
              <Trash2 size={17} />
            </button>
          </div>
        ) : null}

        {imageSearchStatus === "analyzing" ? (
          <p className="notice subtle">Analyzing image with OpenAI...</p>
        ) : null}

        {imageSearchError ? <p className="notice error">{imageSearchError}</p> : null}

        {imageMatches.length ? (
          <div className="ai-match-list">
            {imageMatches.map((match) => (
              <div key={`${match.commonName}-${match.scientificName}`}>
                <strong>{match.commonName}</strong>
                <span>{match.scientificName}</span>
                <span>{Math.round((match.confidence ?? 0) * 100)}%</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="panel-heading">
          <div>
            <span className="eyebrow">Plant Care</span>
            <h2>Plant Care 101</h2>
          </div>
          <Search size={24} />
        </div>

        <div className="care-basics">
          {careBasics.map((basic) => (
            <button
              className={`care-basic-tab ${selectedBasicId === basic.id ? "active" : ""}`}
              key={basic.id}
              type="button"
              onClick={() => {
                setSelectedBasicId(basic.id);
                setSelectedGuideId(null);
              }}
            >
              <strong>{basic.title}</strong>
              <span>{basic.summary}</span>
            </button>
          ))}
        </div>

        <div className="section-title">
          <span className="eyebrow">Suggestions</span>
          <h3>Popular Plants</h3>
          <p>
            {imageSearchPreview && imageSearchStatus === "done"
              ? imageMatchedPlants.length
                ? "OpenAI found likely matches from your image."
                : "OpenAI returned suggestions, but none match the starter guide yet."
              : imageSearchPreview
              ? "Choose the closest visual match below."
              : "Tap a picture to open its care guide."}
          </p>
        </div>

        <div className="guide-grid">
          {visiblePlants.map((plant) => (
            <button
              className={`guide-card ${selectedGuide?.id === plant.id ? "selected" : ""}`}
              key={plant.id}
              type="button"
              onClick={() => {
                setSelectedGuideId(plant.id);
                setSelectedBasicId(null);
              }}
            >
              <img src={plant.image} alt={plant.name} />
              <span>
                <strong>{plant.name}</strong>
                <span>{plant.scientificName}</span>
              </span>
            </button>
          ))}
        </div>

        {!visiblePlants.length ? (
          <div className="empty-panel">
            <Search size={36} />
            <strong>No guide plants found.</strong>
          </div>
        ) : null}
      </section>

      {selectedBasic ? (
        <aside className="wide-panel guide-detail">
          <div className="guide-detail-copy">
            <span className="status-pill status-ok">Plant Care 101</span>
            <h2>{selectedBasic.title}</h2>
            <p>{selectedBasic.summary}</p>
          </div>

          <p className="notes-box">{selectedBasic.detail}</p>

          <div className="guide-tip-list">
            {selectedBasic.tips.map((tip) => (
              <div key={tip}>
                <Check size={17} />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </aside>
      ) : null}

      {selectedGuide ? (
        <aside className="wide-panel guide-detail">
          <img className="guide-detail-image" src={selectedGuide.image} alt={selectedGuide.name} />
          <div className="guide-detail-copy">
            <span className="status-pill status-ok">{selectedGuide.difficulty}</span>
            <h2>{selectedGuide.name}</h2>
            <p>{selectedGuide.scientificName}</p>
          </div>

          <div className="detail-list">
            <InfoRow icon={<Leaf size={18} />} label="Light" value={selectedGuide.light} />
            <InfoRow icon={<Droplets size={18} />} label="Water" value={`Every ~${selectedGuide.wateringIntervalDays}d`} />
            <InfoRow
              icon={<Sprout size={18} />}
              label="Fertilize"
              value={`Every ~${selectedGuide.fertilizingIntervalDays}d`}
            />
          </div>

          <p className="notes-box">{selectedGuide.water}</p>
          <p className="quiet-copy">{selectedGuide.notes}</p>

          <div className="tag-list">
            {selectedGuide.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <button className="primary-button full-width" type="button" onClick={() => onUseTemplate(selectedGuide)}>
            <Plus size={18} />
            Use template
          </button>

          <a className="image-credit" href={selectedGuide.sourceUrl} target="_blank" rel="noreferrer">
            Image: {selectedGuide.attribution}
          </a>
        </aside>
      ) : null}
    </main>
  );
}

function JournalView({ plants, onOpenPlant }) {
  const entries = plants
    .flatMap((plant) => {
      const items = [
        {
          id: `${plant.id}-watered`,
          plant,
          label: "Watered",
          date: plant.lastWateredAt,
          Icon: Droplets
        }
      ];

      if (plant.fertilizingEnabled && plant.lastFertilizedAt) {
        items.push({
          id: `${plant.id}-fertilized`,
          plant,
          label: "Fertilized",
          date: plant.lastFertilizedAt,
          Icon: Sprout
        });
      }

      return items;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <main className="tab-page single-column">
      <section className="wide-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Timeline</span>
            <h2>Journal</h2>
          </div>
          <BookOpen size={24} />
        </div>

        {entries.length ? (
          <div className="journal-list">
            {entries.map((entry) => (
              <button className="journal-entry" key={entry.id} type="button" onClick={() => onOpenPlant(entry.plant)}>
                <PlantImage plant={entry.plant} />
                <span>
                  <strong>{entry.plant.name}</strong>
                  <span>
                    <entry.Icon size={14} />
                    {entry.label} {formatDate(entry.date)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <BookOpen size={36} />
            <strong>No journal entries yet.</strong>
          </div>
        )}
      </section>
    </main>
  );
}

function SettingsView({
  authEmail,
  authPassword,
  authMode,
  isCloudMode,
  isSupabaseConfigured,
  session,
  onAuthEmailChange,
  onAuthPasswordChange,
  onAuthModeChange,
  onAuthSubmit,
  onSignOut
}) {
  const isSignUp = authMode === "sign-up";

  return (
    <main className="tab-page single-column">
      <section className="wide-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Account</span>
            <h2>Settings</h2>
          </div>
          <Settings size={24} />
        </div>

        <div className="settings-list">
          <InfoRow
            icon={isCloudMode ? <Cloud size={18} /> : <WifiOff size={18} />}
            label="Storage"
            value={isCloudMode ? "Cloud" : "Local"}
          />
          <InfoRow
            icon={<LogIn size={18} />}
            label="Supabase"
            value={isSupabaseConfigured ? "Configured" : "Not configured"}
          />
        </div>

        {isSupabaseConfigured ? (
          session ? (
            <button className="ghost-button full-width" type="button" onClick={onSignOut}>
              <LogOut size={18} />
              Sign out
            </button>
          ) : (
            <form className="plant-form" onSubmit={onAuthSubmit}>
              <label>
                Email
                <input
                  autoComplete="email"
                  type="email"
                  value={authEmail}
                  onChange={(event) => onAuthEmailChange(event.target.value)}
                  placeholder="email@example.com"
                />
              </label>
              <label>
                Password
                <input
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={6}
                  type="password"
                  value={authPassword}
                  onChange={(event) => onAuthPasswordChange(event.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>
              <button className="primary-button full-width" type="submit">
                <LogIn size={18} />
                {isSignUp ? "Create account" : "Sign in"}
              </button>
              <button
                className="ghost-button full-width"
                type="button"
                onClick={() => onAuthModeChange(isSignUp ? "sign-in" : "sign-up")}
              >
                {isSignUp ? "I already have an account" : "Create a new account"}
              </button>
            </form>
          )
        ) : null}
      </section>
    </main>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PlantCard({ plant, isSelected, onSelect, onWater, onFertilize, onDelete }) {
  const status = getPlantStatus(plant);
  const fertilizingStatus = getFertilizingStatus(plant);

  return (
    <article className={`plant-card ${isSelected ? "selected" : ""}`}>
      <button className="plant-main" type="button" onClick={onSelect}>
        <PlantImage plant={plant} />
        <span className="plant-card-copy">
          <strong>{plant.name}</strong>
          <span>{[plant.species, plant.location].filter(Boolean).join(" - ") || plant.sunlight}</span>
        </span>
        <span className="card-statuses">
          <span className={`status-pill status-${status.tone}`}>{status.label}</span>
          {plant.fertilizingEnabled ? (
            <span className={`status-pill status-${fertilizingStatus.tone}`}>
              {fertilizingStatus.label}
            </span>
          ) : null}
        </span>
      </button>

      <div className="plant-actions">
        <button className="small-button" type="button" onClick={onWater}>
          <Droplets size={17} />
          Watered
        </button>
        {plant.fertilizingEnabled && onFertilize ? (
          <button className="small-button" type="button" onClick={onFertilize}>
            <Sprout size={17} />
            Fertilized
          </button>
        ) : null}
        {onDelete ? (
          <button className="icon-button danger" type="button" onClick={onDelete} aria-label={`Delete ${plant.name}`}>
            <Trash2 size={17} />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function PlantImage({ plant }) {
  if (plant.photoUrl) {
    return <img className="plant-image" src={plant.photoUrl} alt="" />;
  }

  return (
    <span className="plant-image placeholder">
      <Leaf size={24} />
    </span>
  );
}

function CareTask({ task, onOpenPlant, onComplete }) {
  const Icon = task.type === "fertilize" ? Sprout : Droplets;

  return (
    <div className="care-task">
      <button className="care-task-main" type="button" onClick={onOpenPlant}>
        <PlantImage plant={task.plant} />
        <span>
          <strong>{task.plant.name}</strong>
          <span>{task.label} - {formatDate(task.dueAt)}</span>
        </span>
        <span className={`status-pill status-${task.status.tone}`}>{task.status.label}</span>
      </button>
      <button className="small-button" type="button" onClick={onComplete}>
        <Icon size={17} />
        Done
      </button>
    </div>
  );
}

function PlantForm({
  form,
  isSaving,
  isCloudMode,
  isEditing,
  photoPreview,
  onChange,
  onPhotoChange,
  onCancel,
  onSubmit
}) {
  return (
    <form className="plant-form" onSubmit={onSubmit}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{isEditing ? "Existing entry" : "New entry"}</span>
          <h2>{isEditing ? "Edit plant" : "Add plant"}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close form">
          <Check size={19} />
        </button>
      </div>

      <label>
        Name
        <input value={form.name} onChange={(event) => onChange("name", event.target.value)} />
      </label>

      <label>
        Species
        <input
          value={form.species}
          onChange={(event) => onChange("species", event.target.value)}
          placeholder="Monstera deliciosa"
        />
      </label>

      <div className="field-grid">
        <label>
          Location
          <input
            value={form.location}
            onChange={(event) => onChange("location", event.target.value)}
            placeholder="Living room"
          />
        </label>

        <label>
          Light
          <select value={form.sunlight} onChange={(event) => onChange("sunlight", event.target.value)}>
            <option>Low light</option>
            <option>Bright indirect</option>
            <option>Direct sun</option>
            <option>Partial shade</option>
          </select>
        </label>
      </div>

      <div className="field-grid">
        <label>
          Water every
          <input
            min="1"
            max="90"
            type="number"
            value={form.wateringIntervalDays}
            onChange={(event) => onChange("wateringIntervalDays", event.target.value)}
          />
        </label>

        <label>
          Last watered
          <input
            type="date"
            value={form.lastWateredAt}
            onChange={(event) => onChange("lastWateredAt", event.target.value)}
          />
        </label>
      </div>

      <label className="check-row">
        <input
          checked={form.fertilizingEnabled}
          type="checkbox"
          onChange={(event) => onChange("fertilizingEnabled", event.target.checked)}
        />
        <Sprout size={18} />
        Fertilizing
      </label>

      {form.fertilizingEnabled ? (
        <div className="field-grid">
          <label>
            Fertilize every
            <input
              min="7"
              max="365"
              type="number"
              value={form.fertilizingIntervalDays}
              onChange={(event) => onChange("fertilizingIntervalDays", event.target.value)}
            />
          </label>

          <label>
            Last fertilized
            <input
              type="date"
              value={form.lastFertilizedAt}
              onChange={(event) => onChange("lastFertilizedAt", event.target.value)}
            />
          </label>
        </div>
      ) : null}

      <label>
        Notes
        <textarea
          value={form.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder="Soil, growth, pests, pruning..."
        />
      </label>

      <label className="photo-input">
        <Camera size={18} />
        <span>{photoPreview ? "Change photo" : "Add photo"}</span>
        <input accept="image/*" type="file" onChange={onPhotoChange} />
      </label>

      {photoPreview ? <img className="photo-preview" src={photoPreview} alt="" /> : null}

      <label className={`check-row ${isCloudMode ? "" : "disabled"}`}>
        <input
          checked={form.reminderEmailEnabled && isCloudMode}
          disabled={!isCloudMode}
          type="checkbox"
          onChange={(event) => onChange("reminderEmailEnabled", event.target.checked)}
        />
        <Bell size={18} />
        Email reminders
      </label>

      <button className="primary-button full-width" type="submit" disabled={isSaving}>
        <Upload size={18} />
        {isSaving ? "Saving..." : isEditing ? "Save changes" : "Save plant"}
      </button>
    </form>
  );
}

function PlantDetails({ plant, onEdit, onWater, onFertilize, onDelete }) {
  const status = getPlantStatus(plant);
  const fertilizingStatus = getFertilizingStatus(plant);

  return (
    <section className="detail-panel">
      <div className="detail-hero">
        <PlantImage plant={plant} />
        <div>
          <span className={`status-pill status-${status.tone}`}>{status.label}</span>
          <h2>{plant.name}</h2>
          <p>{[plant.species, plant.location].filter(Boolean).join(" - ") || plant.sunlight}</p>
        </div>
      </div>

      <div className="detail-list">
        <InfoRow icon={<CalendarDays size={18} />} label="Next watering" value={formatDate(status.nextWatering)} />
        <InfoRow icon={<Droplets size={18} />} label="Last watered" value={formatDate(plant.lastWateredAt)} />
        {plant.fertilizingEnabled ? (
          <>
            <InfoRow
              icon={<Sprout size={18} />}
              label="Next fertilizing"
              value={fertilizingStatus.nextFertilizing ? formatDate(fertilizingStatus.nextFertilizing) : "Not set"}
            />
            <InfoRow
              icon={<Sprout size={18} />}
              label="Last fertilized"
              value={plant.lastFertilizedAt ? formatDate(plant.lastFertilizedAt) : "Not set"}
            />
          </>
        ) : (
          <InfoRow icon={<Sprout size={18} />} label="Fertilizing" value="Off" />
        )}
        <InfoRow icon={<Bell size={18} />} label="Reminder" value={plant.reminderEmailEnabled ? "Email" : "Off"} />
        <InfoRow icon={<Leaf size={18} />} label="Light" value={plant.sunlight} />
      </div>

      {plant.notes ? <p className="notes-box">{plant.notes}</p> : null}

      <div className="detail-actions">
        <button className="ghost-button" type="button" onClick={onEdit}>
          <Pencil size={18} />
          Edit
        </button>
        <button className="primary-button" type="button" onClick={onWater}>
          <Droplets size={18} />
          Mark watered
        </button>
        {plant.fertilizingEnabled ? (
          <button className="ghost-button" type="button" onClick={onFertilize}>
            <Sprout size={18} />
            Mark fertilized
          </button>
        ) : null}
        <button className="ghost-button danger" type="button" onClick={onDelete}>
          <Trash2 size={18} />
          Delete
        </button>
      </div>
    </section>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="info-row">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function CareQueue({ plants }) {
  const dueTasks = buildCareTasks(plants)
    .filter(({ status }) => status.tone === "overdue" || status.tone === "due" || status.tone === "soon")
    .slice(0, 5);

  return (
    <section className="detail-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Today</span>
          <h2>Care queue</h2>
        </div>
        <Droplets size={24} />
      </div>

      {dueTasks.length ? (
        <div className="queue-list">
          {dueTasks.map((task) => (
            <div className="queue-item" key={task.id}>
              <PlantImage plant={task.plant} />
              <div>
                <strong>{task.plant.name}</strong>
                <span>{task.label} - {task.status.label}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="quiet-copy">No care due right now.</p>
      )}
    </section>
  );
}
