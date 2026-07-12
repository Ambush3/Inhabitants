import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'map_provider';
const MAP_TYPE_KEY = 'map_type';

export type MapProviderPref = 'google' | 'apple';
export type MapTypePref = 'standard' | 'satellite' | 'hybrid';

type MapProviderContextType = {
  mapProvider: MapProviderPref;
  setMapProvider: (p: MapProviderPref) => void;
  mapType: MapTypePref;
  setMapType: (t: MapTypePref) => void;
};

const MapProviderContext = createContext<MapProviderContextType>({
  mapProvider: 'google',
  setMapProvider: () => {},
  mapType: 'standard',
  setMapType: () => {},
});

export function MapProviderProvider({ children }: { children: React.ReactNode }) {
  const [mapProvider, setMapProviderState] = useState<MapProviderPref>('google');
  const [mapType, setMapTypeState] = useState<MapTypePref>('standard');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'google' || saved === 'apple') setMapProviderState(saved);
    });
    AsyncStorage.getItem(MAP_TYPE_KEY).then((saved) => {
      if (saved === 'standard' || saved === 'satellite' || saved === 'hybrid') setMapTypeState(saved);
    });
  }, []);

  function setMapProvider(p: MapProviderPref) {
    setMapProviderState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }

  function setMapType(t: MapTypePref) {
    setMapTypeState(t);
    AsyncStorage.setItem(MAP_TYPE_KEY, t);
  }

  return (
    <MapProviderContext.Provider value={{ mapProvider, setMapProvider, mapType, setMapType }}>
      {children}
    </MapProviderContext.Provider>
  );
}

export function useMapProvider() {
  return useContext(MapProviderContext);
}
