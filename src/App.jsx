import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ACTIVITIES,
  INITIAL_MINUTE,
  INITIAL_PERSON,
  POPULATION,
  formatPerson,
  formatTime,
  getActivity,
  getCounts,
  getNextActivity,
  getPhase,
} from "./data/model.js";
import { createScene } from "./visualization/createScene.js";

gsap.registerPlugin(useGSAP);

const PRESETS = [180, 480, 780, 1140, 1380];

function initialView() {
  return {
    minute: INITIAL_MINUTE,
    selected: INITIAL_PERSON,
    following: true,
    playing: false,
    speed: 1,
    counts: getCounts(POPULATION, INITIAL_MINUTE),
  };
}

export default function App() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const personInputRef = useRef(null);
  const [view, setView] = useState(initialView);
  const [personInput, setPersonInput] = useState(String(INITIAL_PERSON + 1));
  const [announcement, setAnnouncement] = useState("");
  const [personError, setPersonError] = useState("");
  const [sceneError, setSceneError] = useState("");

  useGSAP(
    () => {
      let scene;
      try {
        scene = createScene(canvasRef.current, {
          onSnapshot(nextView, message) {
            setView(nextView);
            if (message) setAnnouncement(message);
          },
        });
        sceneRef.current = scene;
      } catch (error) {
        setSceneError(error.message);
      }

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.fromTo(
          ".intro-piece",
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.09, ease: "power2.out" },
        );
      }

      // The canvas engine owns its later-created GSAP journeys and ticker.
      // Its cleanup kills those journeys and removes every observer/listener.
      return () => {
        scene?.destroy();
        if (sceneRef.current === scene) sceneRef.current = null;
      };
    },
    { scope: rootRef },
  );

  useEffect(() => {
    setPersonInput(String(view.selected + 1));
    setPersonError("");
  }, [view.selected]);

  function selectPerson() {
    const number = Number(personInput);
    if (!Number.isInteger(number) || number < 1 || number > POPULATION.length) {
      setPersonError("Choose a whole number from 1 to 1,000.");
      return false;
    }
    setPersonError("");
    sceneRef.current?.setSelected(number - 1);
    return true;
  }

  function toggleFollowing() {
    if (view.following && Number(personInput) === view.selected + 1) {
      sceneRef.current?.toggleFollow();
    } else {
      selectPerson();
    }
  }

  const person = POPULATION[view.selected];
  const currentActivity = getActivity(person, view.minute);
  const next = getNextActivity(person, view.minute);
  const sceneDescription = ACTIVITIES.map(
    (activity, index) => `${activity.name}: ${view.counts[index]} people`,
  ).join(". ");

  return (
    <main className="observatory" ref={rootRef}>
      <header>
        <div className="masthead intro-piece">
          <span>A thousand people / one day</span>
          <span>Living census · 001</span>
        </div>
        <h1 className="intro-piece">Everybody,<br /><span>somewhere.</span></h1>
        <div className="clock-row intro-piece">
          <label className="clock" htmlFor="day-time">{formatTime(view.minute)}</label>
          <span className="phase">{getPhase(view.minute)}</span>
        </div>
      </header>

      <section className="scene-stage" aria-label="The living census">
        <canvas
          ref={canvasRef}
          className="population-canvas"
          role="img"
          aria-label={`At ${formatTime(view.minute)}, ${sceneDescription}. Total: 1,000 fictional people.`}
          aria-describedby="visual-encoding"
        >
          One thousand fictional people grouped by activity.
        </canvas>
        {sceneError && <p className="scene-error" role="alert">{sceneError}</p>}
      </section>

      <section className="time-controls" aria-label="Explore the day">
        <label className="sr-only" htmlFor="day-time">Time of day</label>
        <input
          className="timeline"
          id="day-time"
          type="range"
          min="0"
          max="1439"
          step="1"
          value={Math.floor(view.minute)}
          aria-label="Time of day"
          aria-valuetext={formatTime(view.minute)}
          onChange={(event) => sceneRef.current?.setTime(Number(event.target.value))}
        />
        <div className="time-ticks" aria-hidden="true">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
        </div>
        <div className="playback-row">
          <button
            type="button"
            className="play-button"
            aria-label={view.playing ? "Pause the day" : "Play the day"}
            onClick={() => sceneRef.current?.togglePlayback()}
          >
            <span aria-hidden="true">{view.playing ? "Ⅱ" : "▶"}</span>
            {view.playing ? "Pause" : "Play the day"}
          </button>
          <div className="time-presets" aria-label="Jump to a time">
            {PRESETS.map((minute) => (
              <button key={minute} type="button" onClick={() => sceneRef.current?.setTime(minute)}>
                {formatTime(minute)}
              </button>
            ))}
          </div>
          <label className="speed-label" htmlFor="day-speed">Speed</label>
          <select
            id="day-speed"
            aria-label="Playback speed"
            value={view.speed}
            onChange={(event) => sceneRef.current?.setSpeed(Number(event.target.value))}
          >
            <option value="0.5">½×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
            <option value="4">4×</option>
          </select>
        </div>
      </section>

      <section className="person-controls" aria-label="Follow one person">
        <div className="person-row">
          <label htmlFor="person-number">Follow person</label>
          <input
            ref={personInputRef}
            id="person-number"
            type="number"
            min="1"
            max="1000"
            step="1"
            value={personInput}
            aria-label="Person number, 1 to 1000"
            aria-invalid={Boolean(personError)}
            aria-describedby={personError ? "person-error" : "person-detail"}
            onChange={(event) => { setPersonInput(event.target.value); setPersonError(""); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") selectPerson();
            }}
          />
          <button
            type="button"
            className="follow-button"
            aria-pressed={view.following && Number(personInput) === view.selected + 1}
            onClick={toggleFollowing}
          >
            {view.following && Number(personInput) === view.selected + 1 ? `Following ${formatPerson(view.selected)}` : "Follow this person"}
          </button>
        </div>
        {personError && <p className="input-error" id="person-error" role="alert">{personError}</p>}
        <p className="person-detail" id="person-detail">
          {view.following ? (
            <>
              <span>{formatPerson(view.selected)}</span>
              <span className="detail-divider" aria-hidden="true">·</span>
              <span>{ACTIVITIES[currentActivity].name}</span>
              {next && <span className="next-activity"> · next: {ACTIVITIES[next.activity].name} at {formatTime(next.minute)}</span>}
            </>
          ) : "Select a dot or enter a person’s number to follow their day."}
        </p>
      </section>

      <footer>
        <span>One dot = one person · 1,000 people always accounted for</span>
        <span>Fictional routines · model 042</span>
      </footer>

      <details className="model-notes">
        <summary>How to read this day</summary>
        <p id="visual-encoding">
          Each point is the same fictional person throughout the day. Position and colour
          show activity; the numbered ring marks the person you are following. Short trails
          show transitions between activity snapshots. They are not extra people or real routes.
          Labels count people at the selected time, including while dots are moving into place.
        </p>
        <p>
          These routines are simulated, not survey results or live location data. The model
          includes day schedules, shifted night schedules and home-focused schedules. It
          does not estimate how any real city spends its time. At 1×, a full day takes 160 seconds.
        </p>
      </details>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    </main>
  );
}
