/**
 * Versioned client-side persistence adapter (IndexedDB primary + synchronous localStorage mirror).
 * Pure headless TypeScript: uses globalThis feature detection with zero DOM/UI imports.
 */

export const PERSISTENCE_SCHEMA_VERSION = 2;

const IDB_NAME = 'lucy-workspace-db';
const IDB_VERSION = 2;
const IDB_STORE = 'snapshots';

const LS_WORKSPACE_KEY = 'lucy:workspace:v2';
const LS_ADMIN_KEY = 'lucy:admin:v2';

export interface PersistedEnvelope<T> {
  readonly schemaVersion: number;
  readonly savedAtIso: string;
  readonly payload: T;
}

export interface StorageBackend {
  readSync: <T>(key: string) => T | null;
  writeSync: <T>(key: string, payload: T) => void;
  readAsync: <T>(key: string) => Promise<T | null>;
  writeAsync: <T>(key: string, payload: T) => Promise<void>;
  clearAll: () => Promise<void>;
}

function getLocalStorageSafe(): Storage | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    return ls && typeof ls.getItem === 'function' ? ls : null;
  } catch {
    return null;
  }
}

function getIndexedDbSafe(): IDBFactory | null {
  try {
    const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    return idb && typeof idb.open === 'function' ? idb : null;
  } catch {
    return null;
  }
}

function openSnapshotDb(): Promise<IDBDatabase | null> {
  const idb = getIndexedDbSafe();
  if (!idb) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const req = idb.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function unwrapEnvelope<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') return null;
  const env = raw as Partial<PersistedEnvelope<T>>;
  if (env.schemaVersion !== PERSISTENCE_SCHEMA_VERSION || env.payload === undefined) {
    return null;
  }
  return env.payload;
}

export function createBrowserPersistenceBackend(): StorageBackend {
  return {
    readSync<T>(key: string): T | null {
      const ls = getLocalStorageSafe();
      if (!ls) return null;
      try {
        const text = ls.getItem(key);
        if (!text) return null;
        return unwrapEnvelope<T>(JSON.parse(text));
      } catch {
        return null;
      }
    },

    writeSync<T>(key: string, payload: T): void {
      const ls = getLocalStorageSafe();
      if (!ls) return;
      try {
        const env: PersistedEnvelope<T> = {
          schemaVersion: PERSISTENCE_SCHEMA_VERSION,
          savedAtIso: new Date().toISOString(),
          payload,
        };
        ls.setItem(key, JSON.stringify(env));
      } catch {
        // Ignore quota errors on large binary workbooks; IndexedDB handles full payload
      }
    },

    async readAsync<T>(key: string): Promise<T | null> {
      const db = await openSnapshotDb();
      if (!db) return this.readSync<T>(key);

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const req = tx.objectStore(IDB_STORE).get(key);
          req.onsuccess = () => {
            db.close();
            resolve(unwrapEnvelope<T>(req.result) ?? this.readSync<T>(key));
          };
          req.onerror = () => {
            db.close();
            resolve(this.readSync<T>(key));
          };
        } catch {
          db.close();
          resolve(this.readSync<T>(key));
        }
      });
    },

    async writeAsync<T>(key: string, payload: T): Promise<void> {
      this.writeSync(key, payload);
      const db = await openSnapshotDb();
      if (!db) return;

      const env: PersistedEnvelope<T> = {
        schemaVersion: PERSISTENCE_SCHEMA_VERSION,
        savedAtIso: new Date().toISOString(),
        payload,
      };

      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(env, key);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          db.close();
          resolve();
        }
      });
    },

    async clearAll(): Promise<void> {
      const ls = getLocalStorageSafe();
      if (ls) {
        try {
          ls.removeItem(LS_WORKSPACE_KEY);
          ls.removeItem(LS_ADMIN_KEY);
        } catch {
          // Ignore restricted storage environments
        }
      }
      const db = await openSnapshotDb();
      if (db) {
        await new Promise<void>((resolve) => {
          try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).clear();
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              resolve();
            };
          } catch {
            db.close();
            resolve();
          }
        });
      }
    },
  };
}

export const PERSISTENCE_KEYS = {
  workspace: LS_WORKSPACE_KEY,
  admin: LS_ADMIN_KEY,
} as const;
