export const GOLDEN_ANGLE = 2.399963229728653;
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const lerp = (from, to, progress) => from + (to - from) * progress;

export function getCluster(index, width, height) {
  if (width < 560) {
    return {
      x: width * (index % 2 === 0 ? 0.26 : 0.74),
      y: height * (0.17 + Math.floor(index / 2) * 0.325),
    };
  }
  return {
    x: width * (0.17 + (index % 3) * 0.33),
    y: height * (index < 3 ? 0.28 : 0.77),
  };
}

export function getMaxRadius(width, height) {
  return width < 560
    ? Math.min(width * 0.205, height * 0.14)
    : Math.min(width * 0.155, height * 0.195);
}

/** Radius ∝ √population, so a circular cluster's area ∝ population. */
export function getTarget(group, count, rank, width, height, total = 1000) {
  const center = getCluster(group, width, height);
  const radius = getMaxRadius(width, height) * Math.sqrt(count / total);

  if (group === 1) {
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const gap = Math.max(1.8, (radius * 1.75) / columns);
    return {
      x: center.x + ((rank % columns) - (columns - 1) / 2) * gap,
      y: center.y + (Math.floor(rank / columns) - (rows - 1) / 2) * gap,
    };
  }

  if (group === 2) {
    const t = (rank + 0.5) / Math.max(count, 1);
    return {
      x: center.x + (t - 0.5) * radius * 2.25,
      y: center.y + Math.sin(t * Math.PI * 2) * radius * 0.34 + ((rank % 3) - 1) * 3.5,
    };
  }

  const angle = rank * GOLDEN_ANGLE;
  const r = Math.sqrt((rank + 0.5) / Math.max(count, 1)) * radius;
  return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r };
}

export function buildCurve(start, end, bend, bounds) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const points = [
    start,
    { x: start.x + dx * 0.28 + nx * bend, y: start.y + dy * 0.28 + ny * bend },
    { x: start.x + dx * 0.72 + nx * bend, y: start.y + dy * 0.72 + ny * bend },
    end,
  ];
  if (!bounds) return points;
  return points.map((point, index) => index === 0 || index === 3 ? point : ({
    x: clamp(point.x, 8, bounds.width - 8),
    y: clamp(point.y, 8, bounds.height - 8),
  }));
}

/** Cubic Bézier interpolation; t=0 returns start, t=1 returns end. */
export function curvePoint(points, t) {
  const [a, b, c, d] = points;
  const s = 1 - t;
  return {
    x: s ** 3 * a.x + 3 * s ** 2 * t * b.x + 3 * s * t ** 2 * c.x + t ** 3 * d.x,
    y: s ** 3 * a.y + 3 * s ** 2 * t * b.y + 3 * s * t ** 2 * c.y + t ** 3 * d.y,
  };
}
