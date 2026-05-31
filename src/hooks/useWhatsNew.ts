import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changelog } from '@/src/changelog';

const STORAGE_KEY = 'last_seen_version';
const LATEST_VERSION = changelog[0].version;

export function useWhatsNew(isLoggedIn: boolean) {
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    checkVersion();
  }, [isLoggedIn]);

  async function checkVersion() {
    try {
      const lastSeen = await AsyncStorage.getItem(STORAGE_KEY);
      if (lastSeen !== LATEST_VERSION) {
        setShowWhatsNew(true);
      }
    } catch { }
  }

  async function dismissWhatsNew() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, LATEST_VERSION);
    } catch { }
    setShowWhatsNew(false);
  }

  return { showWhatsNew, dismissWhatsNew };
}
