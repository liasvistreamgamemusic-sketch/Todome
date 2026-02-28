import { useCallback, useEffect, useState } from 'react';

const getStoredValue = <T>(key: string, initialValue: T): T => {
  if (typeof window === 'undefined') return initialValue;

  try {
    const item = window.localStorage.getItem(key);
    return item !== null ? (JSON.parse(item) as T) : initialValue;
  } catch {
    return initialValue;
  }
};

export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() =>
    getStoredValue(key, initialValue),
  );

  const setValue = useCallback(
    (value: T) => {
      setStoredValue(value);
      if (typeof window === 'undefined') return;

      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage full or unavailable
      }
    },
    [key],
  );

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return;

      try {
        const newValue = event.newValue !== null
          ? (JSON.parse(event.newValue) as T)
          : initialValue;
        setStoredValue(newValue);
      } catch {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
};
