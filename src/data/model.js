export const POPULATION_SIZE = 1000;
export const MODEL_SEED = 42;
export const INITIAL_MINUTE = 465;
export const INITIAL_PERSON = 41;
export const MINUTES_PER_DAY = 1440;

export const ACTIVITIES = Object.freeze([
  { key: "sleep", name: "Sleeping", color: [186, 171, 244] },
  { key: "work", name: "Working / studying", color: [126, 225, 218] },
  { key: "travel", name: "Travelling", color: [246, 199, 132] },
  { key: "eat", name: "Eating", color: [247, 160, 140] },
  { key: "relax", name: "Unwinding", color: [231, 168, 219] },
  { key: "care", name: "Home & care", color: [168, 198, 230] },
]);

/** A deterministic, reproducible pseudo-random fraction. Not a statistical model. */
export function seededFraction(id, salt = 0, seed = MODEL_SEED) {
  const x = Math.sin((id + seed) * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function wrapMinute(minute) {
  return ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function createPopulation(size = POPULATION_SIZE, seed = MODEL_SEED) {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError("Population size must be a positive integer.");
  }

  return Array.from({ length: size }, (_, id) => {
    const random = (salt) => seededFraction(id, salt, seed);
    const wake = 5.4 + random(1) * 2.2;
    const depart = wake + 0.8 + random(2) * 0.5;
    const travel = 0.3 + random(3) * 0.65;

    return Object.freeze({
      id,
      wake,
      depart,
      travel,
      start: depart + travel,
      lunch: 12 + random(4) * 1.35,
      end: 16 + random(5) * 2.5,
      dinner: 19 + random(6) * 1.5,
      bed: 22 + random(7) * 1.8,
      shift: id % 10 === 0 ? 8 : 0,
      home: id % 10 === 1 || id % 10 === 2,
    });
  });
}

/** Exactly one mutually exclusive activity per person at every time. */
export function getActivity(person, minute) {
  const h = wrapMinute(minute + person.shift * 60) / 60;

  if (h < person.wake || h >= person.bed) return 0;
  if (h < person.wake + 0.35) return 3;
  if (h < person.depart) return 5;

  if (person.home) {
    if (h < 10) return 5;
    if (h < 10 + person.travel) return 2;
    if (h < person.lunch) return 4;
    if (h < person.lunch + 0.55) return 3;
    if (h < 16.5) return 5;
    if (h < 16.5 + person.travel) return 2;
    if (h < person.dinner) return 4;
    if (h < person.dinner + 0.6) return 3;
    return 5;
  }

  if (h < person.start) return 2;
  if (h < person.lunch) return 1;
  if (h < person.lunch + 0.55) return 3;
  if (h < person.end) return 1;
  if (h < person.end + person.travel) return 2;
  if (h < person.dinner) return person.id % 4 === 0 ? 5 : 4;
  if (h < person.dinner + 0.6) return 3;
  return person.id % 4 === 0 ? 5 : 4;
}

export function getCounts(population, minute) {
  const counts = Array(ACTIVITIES.length).fill(0);
  for (const person of population) counts[getActivity(person, minute)] += 1;
  return counts;
}

export function getNextActivity(person, minute) {
  const current = getActivity(person, minute);
  for (let offset = 1; offset <= MINUTES_PER_DAY; offset += 1) {
    const time = wrapMinute(Math.floor(minute) + offset);
    const activity = getActivity(person, time);
    if (activity !== current) return { minute: time, activity };
  }
  return null;
}

export function formatTime(minute) {
  const m = Math.floor(wrapMinute(minute));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function formatPerson(id) {
  return `#${String(id + 1).padStart(4, "0")}`;
}

export function getPhase(minute) {
  const t = wrapMinute(minute);
  if (t < 330) return "The quieter hours";
  if (t < 600) return "The morning dispersal";
  if (t < 900) return "A thousand afternoons";
  if (t < 1200) return "The long way home";
  return "The city gathers inward";
}

// These cohorts are narrative assumptions: 10% shifted routines and 20% home-focused
// routines. They are not survey estimates, demographic claims, or real tracking.
export const POPULATION = Object.freeze(createPopulation());
