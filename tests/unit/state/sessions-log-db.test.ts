/**
 * sessions-log-db pure-logic tests.
 *
 * Strategy: §3 forbids new deps (no fake-indexeddb). Mocking the full
 * IDB API in a unit test is more code than the function being tested.
 * Instead, test the *pure helpers* that IDB depends on (dedupe, sort by
 * finishedAt, trim to max=50, JSON round-trip). IDB round-trip itself
 * is verified by the e2e curl test against a live dev server.
 */

import { describe, expect, it } from "vitest";

import {
  pushSessionLogLocal,
  readSessionsLogLocal,
  type SessionLogEntry,
  writeSessionsLogLocal,
} from "@/core/state/sessions-log-db";

function entry(
  id: string,
  finishedAt: number,
  overrides: Partial<SessionLogEntry> = {},
): SessionLogEntry {
  return {
    id,
    title: `session ${id}`,
    lab: "streaming",
    protocol: "MD",
    tokens: 100,
    durationMs: 1000,
    model: "deepseek-chat",
    finishedAt,
    accent: "oklch(0.78 0.16 230)",
    ...overrides,
  };
}

describe("sessions-log-db (localStorage path)", () => {
  it("read empty when nothing written", () => {
    expect(readSessionsLogLocal()).toEqual([]);
  });

  it("write then read round-trip", () => {
    writeSessionsLogLocal([entry("a", 1000)]);
    const got = readSessionsLogLocal();
    expect(got.length).toBe(1);
    expect(got[0]?.id).toBe("a");
  });

  it("push dedupes by id", () => {
    pushSessionLogLocal(entry("dup", 1));
    pushSessionLogLocal(entry("dup", 2));
    pushSessionLogLocal(entry("dup", 3));
    const got = readSessionsLogLocal();
    expect(got.filter((g) => g.id === "dup").length).toBe(1);
  });

  it("push keeps newest first (highest finishedAt)", () => {
    pushSessionLogLocal(entry("old", 1000));
    pushSessionLogLocal(entry("new", 2000));
    const got = readSessionsLogLocal();
    expect(got[0]?.id).toBe("new");
    expect(got[1]?.id).toBe("old");
  });

  it("push trims to max=50 (keeps 50 most recent)", () => {
    for (let i = 0; i < 60; i++) pushSessionLogLocal(entry(`s${i}`, i));
    const got = readSessionsLogLocal();
    expect(got.length).toBe(50);
    // newest first
    expect(got[0]?.id).toBe("s59");
    // s0..s9 evicted
    expect(got.find((g) => g.id === "s0")).toBeUndefined();
  });

  it("write accepts arbitrary array (used by manual replace)", () => {
    writeSessionsLogLocal([entry("x", 1), entry("y", 2)]);
    const got = readSessionsLogLocal();
    expect(got.map((g) => g.id).sort()).toEqual(["x", "y"]);
  });
});
