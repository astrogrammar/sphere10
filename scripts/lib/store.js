(function (global) {
  'use strict';

  /**
   * @typedef {{
   *   get: function(string): (string|null),
   *   set: function(string, string): boolean,
   *   remove: function(string): boolean
   * }} StoreApi
   */

  /**
   * @type {Map<string, string>}
   */
  const memoryFallback = new Map();

  /**
   * @returns {Storage | null}
   */
  function resolveLocalStorage() {
    try {
      if (!('localStorage' in global)) {
        return null;
      }
      const storage = global.localStorage;
      const testKey = '__store_test__';
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return storage;
    } catch (error) {
      return null;
    }
  }

  const storage = resolveLocalStorage();

  /**
   * @type {StoreApi}
   */
  function serialize(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  function deserialize(value, defaultValue) {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return value;
  }

  const api = {
    set(key, value) {
      const serialized = serialize(value);
      let stored = false;
      try {
        if (storage) {
          storage.setItem(key, serialized);
          memoryFallback.delete(key);
          stored = true;
        }
      } catch (error) {
        // ignore and fallback to memory storage
      }
      if (!stored) {
        memoryFallback.set(key, serialized);
      }
      return stored;
    },
    get(key, defaultValue) {
      let value = null;
      try {
        if (storage) {
          value = storage.getItem(key);
        }
      } catch (error) {
        // ignore and fallback to memory storage
      }
      if (value === null && memoryFallback.has(key)) {
        value = memoryFallback.get(key) ?? null;
      }
      if (value === null || value === undefined) {
        return typeof defaultValue === 'undefined' ? null : defaultValue;
      }
      return deserialize(value, defaultValue);
    },
    remove(key) {
      let removed = false;
      try {
        if (storage) {
          storage.removeItem(key);
          removed = true;
        }
      } catch (error) {
        // ignore and fallback to memory storage
      }
      if (memoryFallback.delete(key)) {
        removed = true;
      }
      return removed;
    }
  };

  if (!global.store) {
    global.store = api;
  }
})(typeof window !== 'undefined' ? window : this);
