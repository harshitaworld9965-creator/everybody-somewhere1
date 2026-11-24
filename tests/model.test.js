import { describe, expect, it } from "vitest";
import {
  ACTIVITIES, POPULATION, createPopulation, formatTime,
  getActivity, getCounts, getNextActivity,
} from "../src/data/model.js";
import { buildCurve, curvePoint, getCluster, getMaxRadius, getTarget } from "../src/visualization/geometry.js";

describe("the fictional population", () => {
  it("has 1,000 unique stable identities and reproduces the same routines", () => {
    expect(POPULATION).toHaveLength(1000);
    expect(new Set(POPULATION.map((person) => person.id)).size).toBe(1000);
    expect(createPopulation()).toEqual(POPULATION);
    expect(createPopulation(1000, 43)).not.toEqual(POPULATION);
  });

  it("assigns exactly one valid activity to everyone at every minute", () => {
    for (let minute = 0; minute < 1440; minute += 1) {
      const counts = getCounts(POPULATION, minute);
      expect(counts).toHaveLength(ACTIVITIES.length);
      expect(counts.every((count) => Number.isInteger(count) && count >= 0)).toBe(true);
      expect(counts.reduce((a, b) => a + b, 0)).toBe(1000);
    }
  });

  it("is cyclic across midnight, including shifted night schedules", () => {
    for (const person of POPULATION) {
      expect(getActivity(person, 0)).toBe(getActivity(person, 1440));
      expect(getActivity(person, -1)).toBe(getActivity(person, 1439));
    }
    expect(formatTime(1440)).toBe("00:00");
    expect(formatTime(-1)).toBe("23:59");
  });

  it("has a quiet night and a distinct morning commute", () => {
    const night = getCounts(POPULATION, 180);
    const morning = getCounts(POPULATION, 480);
    expect(night[0]).toBe(900);
    expect(morning[2]).toBeGreaterThan(night[2]);
    expect(morning[1]).toBeGreaterThan(night[1]);
  });

  it("reports the next actual activity, including across the next midnight", () => {
    for (const person of [POPULATION[0], POPULATION[41], POPULATION[999]]) {
      for (const minute of [0, 465, 1140, 1439]) {
        const next = getNextActivity(person, minute);
        expect(next).not.toBeNull();
        expect(getActivity(person, next.minute)).toBe(next.activity);
        expect(next.activity).not.toBe(getActivity(person, minute));
      }
    }
  });
});

describe("the visual mathematics", () => {
  it("keeps every dot finite and on the canvas at narrow and wide sizes", () => {
    for (const [width, height] of [[286, 610], [375, 610], [680, 485], [944, 550]]) {
      for (const minute of [0, 180, 465, 780, 1140, 1380]) {
        const counts = getCounts(POPULATION, minute);
        counts.forEach((count, group) => {
          for (let rank = 0; rank < count; rank += 1) {
            const point = getTarget(group, count, rank, width, height);
            expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
            expect(point.x).toBeGreaterThanOrEqual(0);
            expect(point.x).toBeLessThanOrEqual(width);
            expect(point.y).toBeGreaterThanOrEqual(0);
            expect(point.y).toBeLessThanOrEqual(height);
          }
        });
      }
    }
  });

  it("keeps category label anchors above their largest possible cluster", () => {
    for (const [width, height] of [[286, 610], [680, 485], [944, 550]]) {
      for (let k = 0; k < ACTIVITIES.length; k += 1) {
        expect(getCluster(k, width, height).y - getMaxRadius(width, height) - 24).toBeGreaterThan(0);
      }
    }
  });

  it("preserves Bézier endpoints and handles a stationary person", () => {
    const start = { x: 24, y: 99 }, end = { x: 450, y: 120 };
    const curve = buildCurve(start, end, 70);
    expect(curvePoint(curve, 0)).toEqual(start);
    expect(curvePoint(curve, 1)).toEqual(end);
    const stationary = curvePoint(buildCurve(start, start, 0), 0.5);
    expect(stationary.x).toBeCloseTo(start.x);
    expect(stationary.y).toBeCloseTo(start.y);
  });

  it("keeps bowed journeys within the phone canvas without changing endpoints", () => {
    const bounds = { width: 286, height: 610 };
    for (const start of [{ x: 12, y: 90 }, { x: 270, y: 500 }]) {
      for (const end of [{ x: 270, y: 90 }, { x: 12, y: 500 }]) {
        for (const bend of [-150, 150]) {
          const curve = buildCurve(start, end, bend, bounds);
          expect(curvePoint(curve, 0)).toEqual(start);
          expect(curvePoint(curve, 1)).toEqual(end);
          for (let step = 0; step <= 50; step += 1) {
            const point = curvePoint(curve, step / 50);
            expect(point.x).toBeGreaterThanOrEqual(0);
            expect(point.x).toBeLessThanOrEqual(bounds.width);
            expect(point.y).toBeGreaterThanOrEqual(0);
            expect(point.y).toBeLessThanOrEqual(bounds.height);
          }
        }
      }
    }
  });
});
