/**
 * sessions-log 的 IndexedDB 升级（可选 / 自动 fallback）。
 *
 * 设计：
 * - localStorage 是默认实现（5MB 限制已经够 max=50 sessions）
 * - 当浏览器支持 IDB 且 `?idb=1` URL flag 启用时，切到 IDB（无 5MB 限制）
 * - 自动从 localStorage 迁移一次（一次性，迁移完成后写 localStorage flag）
 * - 跨 tab 同步：IDB 不触发 storage event → 我们自己在两 tab 间用 BroadcastChannel 同步
 * - 跨设备同步：不在本仓库范围（W9+ IndexedDB + cloud sync）
 *
 * **不引新依赖**（§3 约束）：用浏览器原生 IndexedDB API。
 * 不引 fake-indexeddb / idb-keyval —— 92 行手写够了。
 */

const DB_NAME = "genui-labs";
const DB_VERSION = 1;
const STORE_NAME = "sessions";
const MIGRATION_FLAG = "gen-ui-labs.idb.migrated";
const IDB_FLAG = "gen-ui-labs.idb.enabled";

export interface SessionLogEntry {
  id: string;
  title: string;
  lab: "streaming" | "codegen" | "workbench" | "observability";
  protocol: "MD" | "AG-UI" | "A2UI" | "DSL" | "TSX" | "Inspector";
  tokens: number;
  durationMs: number;
  model: string;
  finishedAt: number;
  accent: string;
}

function isClient(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function isEnabled(): boolean {
  if (!isClient()) return false;
  // 启用开关：
  //  1) URL query: ?idb=1 立即启用（用于测试 / 用户手动开）
  //  2) localStorage flag: gen-ui-labs.idb.enabled=true 持久启用
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("idb") === "1") return true;
    if (window.localStorage.getItem(IDB_FLAG) === "true") return true;
  } catch {
    // ignore
  }
  return false;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (!isClient()) return resolve(null);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("finishedAt", "finishedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null); // 静默失败 → 回退 localStorage
  });
  return dbPromise;
}

async function idbGetAll(): Promise<SessionLogEntry[] | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const rows = req.result as SessionLogEntry[];
      // 按 finishedAt 倒序
      rows.sort((a, b) => b.finishedAt - a.finishedAt);
      resolve(rows);
    };
    req.onerror = () => resolve(null);
  });
}

async function idbPut(entry: SessionLogEntry, max = 50): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(entry);
    // 修剪多余条目（按 finishedAt 倒序）
    const req = store.index("finishedAt").openCursor(null, "prev");
    let count = 0;
    const toDelete: string[] = [];
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) return;
      count++;
      if (count > max) toDelete.push(cur.value.id);
      cur.continue();
    };
    tx.oncomplete = () => {
      // 第二遍：删多余
      if (toDelete.length === 0) return resolve(true);
      const tx2 = db.transaction(STORE_NAME, "readwrite");
      for (const id of toDelete) tx2.objectStore(STORE_NAME).delete(id);
      tx2.oncomplete = () => resolve(true);
      tx2.onerror = () => resolve(true);
    };
    tx.onerror = () => resolve(false);
  });
}

async function idbClear(): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

/** 一次性迁移 localStorage → IndexedDB */
async function maybeMigrate(): Promise<void> {
  if (!isClient()) return;
  if (window.localStorage.getItem(MIGRATION_FLAG) === "1") return;
  try {
    const raw = window.localStorage.getItem("gen-ui-labs.sessions-log");
    if (raw) {
      const arr = JSON.parse(raw) as SessionLogEntry[];
      if (Array.isArray(arr) && arr.length > 0) {
        for (const entry of arr) await idbPut(entry, 9999);
      }
    }
    window.localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    // 迁移失败没关系，localStorage 仍可读
  }
}

/** IDB-aware read：IDB 启用走 IDB，否则回退 localStorage */
export async function readSessionsLogAsync(): Promise<SessionLogEntry[]> {
  if (!isEnabled()) return readSessionsLogLocal();
  await maybeMigrate();
  const rows = await idbGetAll();
  if (rows === null) return readSessionsLogLocal();
  return rows;
}

/** IDB-aware write */
export async function pushSessionLogAsync(entry: SessionLogEntry, max = 50): Promise<void> {
  if (!isEnabled()) {
    pushSessionLogLocal(entry, max);
    return;
  }
  await maybeMigrate();
  await idbPut(entry, max);
  // 跨 tab 通知
  if (typeof BroadcastChannel !== "undefined") {
    const bc = new BroadcastChannel("genui-labs:sessions");
    bc.postMessage({ type: "updated", id: entry.id });
    bc.close();
  }
}

export async function clearSessionsLogAsync(): Promise<void> {
  if (!isEnabled()) {
    clearSessionsLogLocal();
    return;
  }
  await idbClear();
  if (typeof BroadcastChannel !== "undefined") {
    const bc = new BroadcastChannel("genui-labs:sessions");
    bc.postMessage({ type: "cleared" });
    bc.close();
  }
}

/** 跨 tab IDB 订阅（不依赖 localStorage storage event） */
export function subscribeSessionsLogAsync(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (!isEnabled() || typeof BroadcastChannel === "undefined") {
    // 回退到 localStorage 版本
    return subscribeSessionsLogLocal(cb);
  }
  const bc = new BroadcastChannel("genui-labs:sessions");
  bc.onmessage = () => cb();
  return () => bc.close();
}

// === localStorage 实现（fallback + 默认） ===

const STORAGE_KEY = "gen-ui-labs.sessions-log";
const EVENT_NAME = "sessionsLog:updated";

function emitLocal(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function readSessionsLogLocal(): SessionLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionLogEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function writeSessionsLogLocal(entries: SessionLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    emitLocal();
  } catch {
    // ignore quota errors
  }
}

export function pushSessionLogLocal(entry: SessionLogEntry, max = 50): SessionLogEntry[] {
  const cur = readSessionsLogLocal();
  const next = [entry, ...cur.filter((e) => e.id !== entry.id)].slice(0, max);
  writeSessionsLogLocal(next);
  return next;
}

export function clearSessionsLogLocal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitLocal();
}

export function subscribeSessionsLogLocal(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onUpdate = () => cb();
  window.addEventListener(EVENT_NAME, onUpdate);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) onUpdate();
  });
  return () => {
    window.removeEventListener(EVENT_NAME, onUpdate);
  };
}
