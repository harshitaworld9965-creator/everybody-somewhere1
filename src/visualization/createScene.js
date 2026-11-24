import gsap from "gsap";
import {
  ACTIVITIES,
  INITIAL_MINUTE,
  INITIAL_PERSON,
  POPULATION,
  formatPerson,
  getActivity,
  seededFraction,
  wrapMinute,
} from "../data/model.js";
import { buildCurve, clamp, curvePoint, getCluster, getMaxRadius, getTarget, lerp } from "./geometry.js";

const rgba = (color, alpha) => `rgba(${color.join(",")},${alpha})`;
const rgb = (color) => `rgb(${color.map(Math.round).join(",")})`;
const mixColor = (a, b, t) => a.map((channel, i) => lerp(channel, b[i], t));

/**
 * Canvas owns pixels; GSAP owns transition progress; React owns the controls.
 * All resources created here have one explicit owner and one destroy method.
 */
export function createScene(canvas, { onSnapshot, initialMinute = INITIAL_MINUTE } = {}) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not create a 2D canvas.");

  const dots = POPULATION.map((person) => ({
    id: person.id,
    x: 0,
    y: 0,
    target: { x: 0, y: 0 },
    from: { x: 0, y: 0 },
    group: -1,
    progress: 1,
    moving: false,
    curve: null,
    bend: 0,
    fromColor: ACTIVITIES[0].color,
    renderColor: ACTIVITIES[0].color,
    alpha: 0.76 + seededFraction(person.id, 10) * 0.24,
  }));

  let minute = initialMinute;
  let selected = INITIAL_PERSON;
  let following = true;
  let playing = false;
  let speed = 1;
  let counts = Array(ACTIVITIES.length).fill(0);
  let width = 720;
  let height = 485;
  let initialized = false;
  let tickerActive = false;
  let destroyed = false;
  let inView = true;
  let documentVisible = !document.hidden;
  let lastMinute = -1;
  const tweens = new Map();
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function snapshot() {
    return { minute, selected, following, playing, speed, counts: [...counts] };
  }

  function emit(message = "") {
    if (!destroyed) onSnapshot?.(snapshot(), message);
  }

  function cancelTransition(dot) {
    tweens.get(dot.id)?.kill();
    tweens.delete(dot.id);
    dot.moving = false;
  }

  function startTransition(dot, group, target) {
    cancelTransition(dot);
    dot.from = { x: dot.x, y: dot.y };
    dot.fromColor = [...dot.renderColor];
    dot.target = target;
    dot.group = group;
    dot.progress = 0;
    dot.moving = true;
    const length = Math.hypot(target.x - dot.x, target.y - dot.y);
    dot.bend = (seededFraction(dot.id, 9) - 0.5) * Math.min(150, length * 0.65);
    dot.curve = buildCurve(dot.from, dot.target, dot.bend, { width, height });

    // Completed tweens are removed; only active journeys remain in this map.
    let tween;
    tween = gsap.to(dot, {
      progress: 1,
      duration: 1.05 + seededFraction(dot.id, 8) * 0.65,
      ease: "power2.inOut",
      overwrite: true,
      onComplete: () => {
        dot.x = dot.target.x;
        dot.y = dot.target.y;
        dot.renderColor = ACTIVITIES[dot.group].color;
        dot.moving = false;
        if (tweens.get(dot.id) === tween) tweens.delete(dot.id);
      },
    });
    tweens.set(dot.id, tween);
    if (!inView || !documentVisible) tween.pause();
  }

  function retarget(instant = false) {
    const groups = ACTIVITIES.map(() => []);
    POPULATION.forEach((person) => groups[getActivity(person, minute)].push(dots[person.id]));
    counts = groups.map((group) => group.length);

    groups.forEach((group, groupIndex) => {
      group.forEach((dot, rank) => {
        const target = getTarget(groupIndex, group.length, rank, width, height, dots.length);

        if (!initialized || instant || reducedMotion) {
          cancelTransition(dot);
          dot.x = target.x;
          dot.y = target.y;
          dot.target = target;
          dot.group = groupIndex;
          dot.progress = 1;
          dot.renderColor = ACTIVITIES[groupIndex].color;
        } else if (dot.group !== groupIndex) {
          startTransition(dot, groupIndex, target);
        } else {
          dot.target = target;
          if (dot.moving) dot.curve = buildCurve(dot.from, target, dot.bend, { width, height });
        }
      });
    });

    initialized = true;
    lastMinute = Math.floor(minute);
  }

  function halo(x, y, radius, color, alpha) {
    if (radius < 1) return;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(color, alpha));
    gradient.addColorStop(1, rgba(color, 0));
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function draw(delta = 1 / 60) {
    context.clearRect(0, 0, width, height);
    const maxRadius = getMaxRadius(width, height);
    let settling = false;

    ACTIVITIES.forEach((activity, index) => {
      const center = getCluster(index, width, height);
      const radius = maxRadius * Math.sqrt(counts[index] / dots.length);
      halo(center.x, center.y, Math.max(10, radius * 1.55), activity.color, 0.06);
      const labelY = center.y - maxRadius - 24;
      context.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
      context.textAlign = "center";
      context.fillStyle = "#ccd8df";
      context.fillText(activity.name, center.x, labelY);
      context.fillStyle = "#94a8b8";
      context.fillText(`${counts[index].toLocaleString("en-IN")} people`, center.x, labelY + 16);
    });

    for (const dot of dots) {
      const color = ACTIVITIES[dot.group].color;

      if (dot.moving) {
        const point = curvePoint(dot.curve, dot.progress);
        dot.x = point.x;
        dot.y = point.y;
        dot.renderColor = mixColor(dot.fromColor, color, dot.progress);

        // One short trail per moving person; trails are not additional people.
        context.beginPath();
        for (let j = 0; j <= 7; j += 1) {
          const tail = curvePoint(dot.curve, Math.max(0, dot.progress - j * 0.019));
          if (j === 0) context.moveTo(tail.x, tail.y);
          else context.lineTo(tail.x, tail.y);
        }
        context.strokeStyle = rgba(dot.renderColor, 0.23);
        context.lineWidth = 0.65;
        context.stroke();
        settling = true;
      } else {
        const distance = Math.hypot(dot.target.x - dot.x, dot.target.y - dot.y);
        if (distance > 0.08) {
          const fraction = reducedMotion ? 1 : Math.min(1, delta * 12);
          dot.x = lerp(dot.x, dot.target.x, fraction);
          dot.y = lerp(dot.y, dot.target.y, fraction);
          settling = true;
        }
      }

      const highlighted = following && dot.id === selected;
      context.beginPath();
      context.arc(dot.x, dot.y, highlighted ? 2.7 : width < 560 ? 1.05 : 1.25, 0, Math.PI * 2);
      context.fillStyle = highlighted ? "#f4fff3" : rgb(dot.renderColor);
      context.globalAlpha = highlighted ? 1 : dot.alpha;
      context.fill();
      context.globalAlpha = 1;
    }

    if (following) {
      const dot = dots[selected];
      halo(dot.x, dot.y, 14, [225, 244, 221], 0.18);
      context.beginPath();
      context.arc(dot.x, dot.y, 7, 0, Math.PI * 2);
      context.strokeStyle = "#e5f2e0";
      context.lineWidth = 0.8;
      context.stroke();
      const right = dot.x > width * 0.65;
      context.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
      context.fillStyle = "#d5e3dc";
      context.textAlign = right ? "right" : "left";
      context.fillText(formatPerson(selected), clamp(dot.x + (right ? -12 : 12), 55, width - 55), Math.max(15, dot.y - 10));
    }

    return settling;
  }

  function removeTicker() {
    if (!tickerActive) return;
    gsap.ticker.remove(tick);
    tickerActive = false;
  }

  function wake() {
    if (destroyed || tickerActive || !inView || !documentVisible) return;
    tickerActive = true;
    gsap.ticker.add(tick);
  }

  function tick(_time, deltaMilliseconds) {
    if (destroyed) return;
    const delta = Math.min((deltaMilliseconds || 16.67) / 1000, 0.05);
    if (playing) {
      minute = wrapMinute(minute + delta * 9 * speed);
      if (Math.floor(minute) !== lastMinute) {
        retarget();
        emit();
      }
    }
    const settling = draw(delta);
    if (!playing && !settling && tweens.size === 0) removeTicker();
  }

  function resize() {
    if (destroyed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width || 720);
    height = Math.max(1, bounds.height || 485);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    retarget(true);
    draw();
    emit();
    wake();
  }

  function syncVisibility() {
    const active = inView && documentVisible;
    for (const tween of tweens.values()) active ? tween.resume() : tween.pause();
    if (active) wake();
    else removeTicker();
  }

  const onVisibility = () => {
    documentVisible = !document.hidden;
    syncVisibility();
  };
  const onMotionChange = (event) => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      retarget(true);
      draw();
    }
    wake();
  };
  const onCanvasClick = (event) => {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    let nearest = null;
    let distance = 20;
    for (const dot of dots) {
      const d = Math.hypot(dot.x - x, dot.y - y);
      if (d < distance) {
        distance = d;
        nearest = dot;
      }
    }
    if (nearest) setSelected(nearest.id);
  };

  function setSelected(id) {
    if (!Number.isInteger(id) || id < 0 || id >= dots.length) return;
    selected = id;
    following = true;
    emit(`Following person ${formatPerson(id)}.`);
    wake();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? true;
    syncVisibility();
  });
  intersectionObserver.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  motionQuery.addEventListener("change", onMotionChange);
  canvas.addEventListener("click", onCanvasClick);
  resize();

  return {
    getSnapshot: snapshot,
    setTime(value) {
      if (!Number.isFinite(value)) return;
      playing = false;
      minute = clamp(value, 0, 1439);
      retarget();
      emit("Selected time updated. Playback paused.");
      wake();
    },
    togglePlayback() {
      playing = !playing;
      emit(playing ? "Day playback started." : "Day playback paused.");
      wake();
    },
    setSpeed(value) {
      if (![0.5, 1, 2, 4].includes(value)) return;
      speed = value;
      emit(`Playback speed ${value} times.`);
    },
    setSelected,
    toggleFollow() {
      following = !following;
      emit(following ? `Following person ${formatPerson(selected)}.` : "Person following turned off.");
      wake();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      removeTicker();
      for (const tween of tweens.values()) tween.kill();
      tweens.clear();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onMotionChange);
      canvas.removeEventListener("click", onCanvasClick);
      context.clearRect(0, 0, width, height);
    },
  };
}
