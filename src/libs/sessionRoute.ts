import { Spot } from '@/src/types';
import { haversineMiles } from '@/src/libs/distance';

export const MAX_GOOGLE_WAYPOINTS = 9;

export type RouteStop = {
  spot: Spot;
  legMiles: number;
  cumulativeMiles: number;
};

export type SessionRoute = {
  stops: RouteStop[];
  totalMiles: number;
};

export function buildSessionRoute(
  spots: Spot[],
  start: { latitude: number; longitude: number } | null
): SessionRoute {
  if (spots.length === 0) return { stops: [], totalMiles: 0 };

  const remaining = [...spots];
  const ordered: Spot[] = [];

  let currentLat = start?.latitude ?? spots[0].lat;
  let currentLng = start?.longitude ?? spots[0].lng;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(currentLat, currentLng, remaining[i].lat, remaining[i].lng);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }

    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    currentLat = next.lat;
    currentLng = next.lng;
  }

  return describeRoute(ordered, start);
}

export function describeRoute(
  ordered: Spot[],
  start: { latitude: number; longitude: number } | null
): SessionRoute {
  let cumulative = 0;
  let fromLat = start?.latitude ?? ordered[0]?.lat ?? 0;
  let fromLng = start?.longitude ?? ordered[0]?.lng ?? 0;

  const stops: RouteStop[] = ordered.map((spot, i) => {
    const legMiles = i === 0 && !start ? 0 : haversineMiles(fromLat, fromLng, spot.lat, spot.lng);
    cumulative += legMiles;
    fromLat = spot.lat;
    fromLng = spot.lng;
    return { spot, legMiles, cumulativeMiles: cumulative };
  });

  return { stops, totalMiles: cumulative };
}

export function formatMiles(miles: number): string {
  if (miles < 0.1) return '<0.1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function googleMapsRouteUrl(
  stops: Spot[],
  start: { latitude: number; longitude: number } | null
): string | null {
  if (stops.length === 0) return null;

  const segments = [
    start ? `${start.latitude},${start.longitude}` : null,
    ...stops.slice(0, MAX_GOOGLE_WAYPOINTS + 1).map((s) => `${s.lat},${s.lng}`),
  ].filter(Boolean);

  return `https://www.google.com/maps/dir/${segments.join('/')}`;
}
