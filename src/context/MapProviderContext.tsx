import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'map_provider';

export type MapProviderPref = 'google' | 'apple';

type MapProviderContextType = {
  mapProvider: MapProviderPref;
  setMapProvider: (p: MapProviderPref) => void;
};

const MapProviderContext = createContext<MapProviderContextType>({
  mapProvider: 'google',
  setMapProvider: () => {},
});

export function MapProviderProvider({ children }: { children: React.ReactNode }) {
  const [mapProvider, setMapProviderState] = useState<MapProviderPref>('google');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'google' || saved === 'apple') setMapProviderState(saved);
    });
  }, []);

  function setMapProvider(p: MapProviderPref) {
    setMapProviderState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }

  return (
    <MapProviderContext.Provider value={{ mapProvider, setMapProvider }}>
      {children}
    </MapProviderContext.Provider>
  );
}

export function useMapProvider() {
  return useContext(MapProviderContext);
}
