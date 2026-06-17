import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spot } from '@/src/types';

const CACHE_KEY_MAP_SPOTS = 'offline_cache_map_spots';
const CACHE_KEY_FAVORITES = 'offline_cache_favorites';
const CACHE_KEY_TIMESTAMP = 'offline_cache_timestamp';
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

type CachePayload = {
  spots: Spot[];
  cachedAt: string;
};

export function useOfflineCache() {
  const [isOnline, setIsOnline] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [cachedMapSpots, setCachedMapSpots] = useState<Spot[]>([]);
  const [cachedFavorites, setCachedFavorites] = useState<Spot[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const Network = await import('expo-network');
        if (cancelled) return;
        sub = Network.addNetworkStateListener((state) => {
          setIsOnline(!!state.isConnected && !!state.isInternetReachable);
        });
        const state = await Network.getNetworkStateAsync();
        if (cancelled) return;
        setIsOnline(!!state.isConnected && !!state.isInternetReachable);
      } catch {
        setIsOnline(true);
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    loadCache();
  }, []);

  async function loadCache() {
    try {
      const [mapRaw, favRaw, timestampRaw] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY_MAP_SPOTS),
        AsyncStorage.getItem(CACHE_KEY_FAVORITES),
        AsyncStorage.getItem(CACHE_KEY_TIMESTAMP),
      ]);

      if (mapRaw) {
        const parsed: CachePayload = JSON.parse(mapRaw);
        setCachedMapSpots(parsed.spots);
      }
      if (favRaw) {
        const parsed: CachePayload = JSON.parse(favRaw);
        setCachedFavorites(parsed.spots);
      }
      if (timestampRaw) {
        const cachedAt = new Date(timestampRaw).getTime();
        const age = Date.now() - cachedAt;
        setIsStale(age > STALE_THRESHOLD_MS);
      }
    } catch {
    } finally {
      setCacheLoaded(true);
    }
  }

  const cacheMapSpots = useCallback(async (spots: Spot[]) => {
    try {
      const now = new Date().toISOString();
      const payload: CachePayload = { spots, cachedAt: now };
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEY_MAP_SPOTS, JSON.stringify(payload)),
        AsyncStorage.setItem(CACHE_KEY_TIMESTAMP, now),
      ]);
      setCachedMapSpots(spots);
      setIsStale(false);
    } catch { }
  }, []);

  const cacheFavorites = useCallback(async (spots: Spot[]) => {
    try {
      const now = new Date().toISOString();
      const payload: CachePayload = { spots, cachedAt: now };
      await AsyncStorage.setItem(CACHE_KEY_FAVORITES, JSON.stringify(payload));
      setCachedFavorites(spots);
    } catch { }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([CACHE_KEY_MAP_SPOTS, CACHE_KEY_FAVORITES, CACHE_KEY_TIMESTAMP]);
      setCachedMapSpots([]);
      setCachedFavorites([]);
      setIsStale(false);
    } catch { }
  }, []);

  const showOfflineBanner =
    !isOnline || (isOnline && isStale && (cachedMapSpots.length > 0 || cachedFavorites.length > 0));
  const bannerMessage = !isOnline ? "You're offline — showing cached data" : '';

  return {
    isOnline,
    isStale,
    cacheLoaded,
    cachedMapSpots,
    cachedFavorites,
    showOfflineBanner,
    bannerMessage,
    cacheMapSpots,
    cacheFavorites,
    clearCache,
  };
}
