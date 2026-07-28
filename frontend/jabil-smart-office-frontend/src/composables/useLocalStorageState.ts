import { ref, watch } from 'vue';

/**
 * Vue 3 Composable for synchronizing a ref with localStorage.
 * Automatically loads the initial value from localStorage if available,
 * and saves changes to localStorage whenever the ref value changes.
 *
 * @param key The key to use for localStorage.
 * @param defaultValue The default value if no value is found in localStorage.
 * @param scope Optional scope to namespace the key, making it unique per page/component.
 * @returns A ref synchronized with localStorage.
 */
export function useLocalStorageState<T>(key: string, defaultValue: T, scope?: string) {
  const storageKey = scope ? `${scope}:${key}` : key;
  const oldStorageKey = key; // 旧版 key（无 scope）

  // 清理旧的 localStorage key（当有 scope 时）
  if (scope && localStorage.getItem(oldStorageKey) !== null) {
    localStorage.removeItem(oldStorageKey);
  }

  const storedValue = localStorage.getItem(storageKey);
  let initialValue: T;

  if (storedValue === null || storedValue === "undefined") {
    initialValue = defaultValue;
  } else {
    try {
      initialValue = JSON.parse(storedValue);
    } catch (e) {
      console.error(`Error parsing localStorage key "${storageKey}":`, e);
      initialValue = defaultValue;
    }
  }

  const state = ref<T>(initialValue);

  watch(state, (newValue) => {
    localStorage.setItem(storageKey, JSON.stringify(newValue));
  }, { deep: true }); // Use deep: true for objects/arrays

  return state;
}
