// focus/src/hooks/useHiddenFieldIds.js
import { useState, useEffect } from 'react';

// ✅ Key HARUS sama di semua halaman agar sinkron
const STORAGE_KEY = 'dataDetailItem.hiddenFieldIds';

export const useHiddenFieldIds = () => {
  const [hiddenFieldIds, setHiddenFieldIds] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persist setiap kali berubah
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenFieldIds));
    } catch {
      // localStorage tidak tersedia → abaikan
    }
  }, [hiddenFieldIds]);

  // ✅ Sync real-time antar tab/window
  useEffect(() => {
    const handler = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : [];
          setHiddenFieldIds(parsed);
        } catch {
          // abaikan
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return [hiddenFieldIds, setHiddenFieldIds];
};