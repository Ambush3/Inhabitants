import React, { createContext, useContext, useState } from 'react';

type SplashContextValue = {
  splashDone: boolean;
  setSplashDone: (done: boolean) => void;
};

const SplashContext = createContext<SplashContextValue>({
  splashDone: false,
  setSplashDone: () => {},
});

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false);
  return (
    <SplashContext.Provider value={{ splashDone, setSplashDone }}>
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  return useContext(SplashContext);
}
