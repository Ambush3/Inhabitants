export function extractLatLngFromExif(exif: any): { lat: number; lng: number } | null {
  if (!exif) return null;

  if (typeof exif.GPSLatitude === 'number' && typeof exif.GPSLongitude === 'number') {
    const latRef = exif.GPSLatitudeRef ?? 'N';
    const lngRef = exif.GPSLongitudeRef ?? 'E';
    const lat = latRef === 'S' ? -exif.GPSLatitude : exif.GPSLatitude;
    const lng = lngRef === 'W' ? -exif.GPSLongitude : exif.GPSLongitude;
    return { lat, lng };
  }

  return null;
}
