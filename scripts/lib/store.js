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
  const api = {
    set(key, value) {
      let stored = false;
      try {
        if (storage) {
          storage.setItem(key, String(value));
          memoryFallback.delete(key);
          stored = true;
        }
      } catch (error) {
        // ignore and fallback to memory storage
      }
      if (!stored) {
        memoryFallback.set(key, String(value));
      }
      return stored;
    },
    get(key) {
      try {
        if (storage) {
          const value = storage.getItem(key);
          if (value !== null) {
            return value;
          }
        }
      } catch (error) {
        // ignore and fallback to memory storage
      }
      if (memoryFallback.has(key)) {
        return memoryFallback.get(key) || null;
      }
      return null;
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
