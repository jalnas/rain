/**
 * Calculates the haversine distance between point A, and B in meters
 */
// https://stackoverflow.com/a/48805273
// Harry Mumford-Turner
export const haversineDistance = (start: LatLng, end: LatLng) => {
  const [start_lat, start_lng] = start
  const [end_lat, end_lng] = end

  const toRadian = (angle) => (Math.PI / 180) * angle
  const distance = (a, b) => (Math.PI / 180) * (a - b)
  const RADIUS_OF_EARTH_IN_KM = 6371

  const dLat = distance(end_lat, start_lat)
  const dLon = distance(end_lng, start_lng)

  // Haversine Formula
  const a =
    Math.pow(Math.sin(dLat / 2), 2) +
    Math.pow(Math.sin(dLon / 2), 2) * Math.cos(toRadian(start_lat)) * Math.cos(toRadian(end_lat))

  const c = 2 * Math.asin(Math.sqrt(a))

  let finalDistance = RADIUS_OF_EARTH_IN_KM * c

  return finalDistance * 1000
}
