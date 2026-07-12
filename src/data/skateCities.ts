export type SkateCity = {
  id: string;
  name: string;
  country: string;
  emoji: string;
  color: string;
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const CITY_DELTA = 0.25;

export const SKATE_CITIES: SkateCity[] = [
  { id: 'la', name: 'Los Angeles', country: 'USA', emoji: '🌴', color: '#FF9500', latitude: 34.0522, longitude: -118.2437, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
  { id: 'nyc', name: 'New York', country: 'USA', emoji: '🗽', color: '#5856D6', latitude: 40.7128, longitude: -74.006, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain', emoji: '🇪🇸', color: '#FF3B30', latitude: 41.3874, longitude: 2.1686, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
  { id: 'sf', name: 'San Francisco', country: 'USA', emoji: '🌉', color: '#FF2D55', latitude: 37.7749, longitude: -122.4194, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
  { id: 'london', name: 'London', country: 'UK', emoji: '🎡', color: '#34C759', latitude: 51.5074, longitude: -0.1278, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', emoji: '🗼', color: '#FF375F', latitude: 35.6762, longitude: 139.6503, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
  { id: 'paris', name: 'Paris', country: 'France', emoji: '🗼', color: '#007AFF', latitude: 48.8566, longitude: 2.3522, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
  { id: 'berlin', name: 'Berlin', country: 'Germany', emoji: '🐻', color: '#AF52DE', latitude: 52.52, longitude: 13.405, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', emoji: '🦘', color: '#30B0C7', latitude: -37.8136, longitude: 144.9631, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
  { id: 'copenhagen', name: 'Copenhagen', country: 'Denmark', emoji: '🚲', color: '#32ADE6', latitude: 55.6761, longitude: 12.5683, latitudeDelta: CITY_DELTA, longitudeDelta: CITY_DELTA },
];
