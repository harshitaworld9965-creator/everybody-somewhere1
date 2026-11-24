import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import gsap from "gsap";
import App from "../src/App.jsx";
import { getCounts, POPULATION } from "../src/data/model.js";
import { observed, preference } from "./setup.js";

describe("the complete experience", () => {
  it("starts at the approved preview time with six activities and 1,000 people", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Everybody,somewhere.");
    const canvas = screen.getByRole("img");
    expect(canvas.getAttribute("aria-label")).toContain("07:45");
    expect(canvas.getAttribute("aria-label")).toContain("Total: 1,000");
    expect(screen.getByRole("button", { name: "Following #0042" })).toBeTruthy();
  });

  it("jumps between presets, updates all counts and pauses playback on a jump", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Play the day" }));
    expect(screen.getByRole("button", { name: "Pause the day" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "03:00", exact: true }));
    const canvas = screen.getByRole("img");
    expect(canvas.getAttribute("aria-label")).toContain("Sleeping: 900 people");
    expect(canvas.getAttribute("aria-label")).toContain("03:00");
    expect(screen.getByRole("button", { name: "Play the day" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "08:00", exact: true }));
    const counts = getCounts(POPULATION, 480);
    expect(canvas.getAttribute("aria-label")).toContain(`Travelling: ${counts[2]} people`);
  });

  it("scrubs the full day and changes playback speed", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("slider", { name: "Time of day" }), { target: { value: "1140" } });
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("19:00");
    fireEvent.change(screen.getByRole("combobox", { name: "Playback speed" }), { target: { value: "4" } });
    expect(screen.getByRole("combobox", { name: "Playback speed" }).value).toBe("4");
  });

  it("follows person 1000 and allows following to be turned off", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole("spinbutton", { name: "Person number, 1 to 1000" });
    await user.clear(input);
    await user.type(input, "1000");
    await user.click(screen.getByRole("button", { name: "Follow this person" }));
    const button = screen.getByRole("button", { name: "Following #1000" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await user.click(button);
    expect(screen.getByRole("button", { name: "Follow this person" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("rejects invalid person IDs without losing the current selection", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole("spinbutton", { name: "Person number, 1 to 1000" });
    await user.clear(input);
    await user.type(input, "1001");
    await user.click(screen.getByRole("button", { name: "Follow this person" }));
    expect(screen.getByRole("alert").textContent).toContain("1 to 1,000");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("supports reduced motion while preserving the same data and interactions", async () => {
    preference.reduced = true;
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "23:00", exact: true }));
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("23:00");
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Total: 1,000");
  });

  it("cleans up every owned ticker and observer after React StrictMode remounts", () => {
    const added = vi.spyOn(gsap.ticker, "add");
    const removed = vi.spyOn(gsap.ticker, "remove");
    render(<StrictMode><App /></StrictMode>);
    const ownedTicks = added.mock.calls.map(([callback]) => callback).filter((callback) => callback.name === "tick");
    expect(ownedTicks.length).toBeGreaterThan(0);
    cleanup();
    for (const callback of ownedTicks) expect(removed.mock.calls.some(([fn]) => fn === callback)).toBe(true);
    expect(observed.resize.every((observer) => observer.disconnected)).toBe(true);
    expect(observed.intersection.every((observer) => observer.disconnected)).toBe(true);
  });
});
