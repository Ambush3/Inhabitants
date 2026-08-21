import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Spot } from '@/src/types';

const CACHE_KEY_MAP_SPOTS = 'offline_cache_map_spots';
const CACHE_KEY_FAVORITES = 'offline_cache_favorites';
const CACHE_KEY_FAVORITE_PHOTOS = 'offline_cache_favorite_photos';
const CACHE_KEY_TIMESTAMP = 'offline_cache_timestamp';
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export const MAX_OFFLINE_PHOTOS_PER_SPOT = 5;
const MAX_OFFLINE_PHOTOS_TOTAL = 150;

type CachePayload = {
  spots: Spot[];
  cachedAt: string;
};

export function useOfflineCache() {
  const [isOnline, setIsOnline] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [cachedMapSpots, setCachedMapSpots] = useState<Spot[]>([]);
  const [cachedFavorites, setCachedFavorites] = useState<Spot[]>([]);
  const [cachedFavoritePhotos, setCachedFavoritePhotos] = useState<Record<string, string[]>>({});
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
      const [mapRaw, favRaw, photosRaw, timestampRaw] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY_MAP_SPOTS),
        AsyncStorage.getItem(CACHE_KEY_FAVORITES),
        AsyncStorage.getItem(CACHE_KEY_FAVORITE_PHOTOS),
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
      if (photosRaw) {
        setCachedFavoritePhotos(JSON.parse(photosRaw));
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

  const cacheFavoritePhotos = useCallback(async (photosBySpot: Record<string, string[]>) => {
    try {
      const trimmed: Record<string, string[]> = {};
      let total = 0;
      for (const [spotId, urls] of Object.entries(photosBySpot)) {
        if (total >= MAX_OFFLINE_PHOTOS_TOTAL) break;
        const room = Math.min(MAX_OFFLINE_PHOTOS_PER_SPOT, MAX_OFFLINE_PHOTOS_TOTAL - total);
        const slice = urls.slice(0, room);
        if (slice.length === 0) continue;
        trimmed[spotId] = slice;
        total += slice.length;
      }

      await AsyncStorage.setItem(CACHE_KEY_FAVORITE_PHOTOS, JSON.stringify(trimmed));
      setCachedFavoritePhotos(trimmed);

      const urls = Object.values(trimmed).flat();
      if (urls.length > 0) await Image.prefetch(urls, 'disk');
    } catch { }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEY_MAP_SPOTS,
        CACHE_KEY_FAVORITES,
        CACHE_KEY_FAVORITE_PHOTOS,
        CACHE_KEY_TIMESTAMP,
      ]);
      await Image.clearDiskCache();
      setCachedMapSpots([]);
      setCachedFavorites([]);
      setCachedFavoritePhotos({});
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
    cachedFavoritePhotos,
    showOfflineBanner,
    bannerMessage,
    cacheMapSpots,
    cacheFavorites,
    cacheFavoritePhotos,
    clearCache,
  };
}
