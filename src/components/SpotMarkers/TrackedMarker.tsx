import React, { forwardRef, useEffect, useState } from 'react';
import { Marker, MapMarkerProps } from 'react-native-maps';

type Props = MapMarkerProps & { keepActive?: boolean };

export const TrackedMarker = forwardRef<any, Props>(({ keepActive, ...props }, ref) => {
  const [tracking, setTracking] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setTracking(false), 800);
    return () => clearTimeout(t);
  }, []);

  return <Marker ref={ref} {...props} tracksViewChanges={tracking} />;
});

TrackedMarker.displayName = 'TrackedMarker';
