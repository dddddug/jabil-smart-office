import { ref, watch } from 'vue';

/**
 * Vue 3 Composable for synchronizing a ref with localStorage.
 * Automatically loads the initial value from localStorage if available,
 * and saves changes to localStorage whenever the ref value changes.
 *
 * @param key The key to use for localStorage.
 * @param defaultValue The default value if no value is found in localStorage.
 * @returns A ref synchronized with localStorage.
 */
export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const storedValue = localStorage.getItem(key);
  let initialValue: T;

  if (storedValue === null || storedValue === "undefined") {
    initialValue = defaultValue;
  } else {
    try {
      initialValue = JSON.parse(storedValue);
    } catch (e) {
      console.error(`Error parsing localStorage key "${key}":`, e);
      initialValue = defaultValue;
    }
  }
  
  const state = ref<T>(initialValue);

  watch(state, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue));
  }, { deep: true }); // Use deep: true for objects/arrays

  return state;
}
