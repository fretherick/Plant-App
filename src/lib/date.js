export function todayInputValue() {
  return toDateInputValue(new Date());
}

export function toDateInputValue(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateInputToIso(value) {
  return new Date(`${value}T12:00:00`).toISOString();
}

export function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + Number(days));
  return date;
}

export function daysUntil(value) {
  const day = 24 * 60 * 60 * 1000;
  const today = new Date();
  const target = new Date(value);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / day);
}

export function nextWateringDate(plant) {
  return addDays(plant.lastWateredAt, plant.wateringIntervalDays);
}

export function nextFertilizingDate(plant) {
  if (!plant.fertilizingEnabled || !plant.lastFertilizedAt || !plant.fertilizingIntervalDays) {
    return null;
  }

  return addDays(plant.lastFertilizedAt, plant.fertilizingIntervalDays);
}

export function getDueStatus(nextDate, labels) {
  const days = daysUntil(nextDate);

  if (days < 0) {
    return {
      tone: "overdue",
      label: `${Math.abs(days)}d overdue`,
      nextDate
    };
  }

  if (days === 0) {
    return {
      tone: "due",
      label: labels.today,
      nextDate
    };
  }

  if (days <= 2) {
    return {
      tone: "soon",
      label: `Due in ${days}d`,
      nextDate
    };
  }

  return {
    tone: "ok",
    label: `Due in ${days}d`,
    nextDate
  };
}

export function getPlantStatus(plant) {
  const status = getDueStatus(nextWateringDate(plant), {
    today: "Water today"
  });

  return {
    ...status,
    nextWatering: status.nextDate
  };
}

export function getFertilizingStatus(plant) {
  const nextFertilizing = nextFertilizingDate(plant);
  if (!nextFertilizing) {
    return {
      tone: "off",
      label: "Fertilizing off",
      nextFertilizing: null
    };
  }

  const status = getDueStatus(nextFertilizing, {
    today: "Fertilize today"
  });

  return {
    ...status,
    nextFertilizing: status.nextDate
  };
}

export function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
