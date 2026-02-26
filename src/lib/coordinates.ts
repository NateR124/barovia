import L from "leaflet";

// Map image dimensions — update these to match your actual map image
export const MAP_WIDTH = 1558;
export const MAP_HEIGHT = 1000;

// Leaflet bounds: [[0,0], [height, width]] for CRS.Simple
export const IMAGE_BOUNDS: L.LatLngBoundsExpression = [
  [0, 0],
  [MAP_HEIGHT, MAP_WIDTH],
];

/**
 * Convert pixel [x, y] coordinates (as from an image editor) to Leaflet LatLng.
 * Leaflet CRS.Simple uses [y, x] and y increases upward,
 * while image y increases downward — so we flip the y-axis.
 */
export function pixelToLatLng(coords: [number, number]): L.LatLng {
  const [x, y] = coords;
  return L.latLng(MAP_HEIGHT - y, x);
}

/**
 * Convert Leaflet LatLng back to pixel [x, y] coordinates.
 */
export function latLngToPixel(latlng: L.LatLng): [number, number] {
  return [latlng.lng, MAP_HEIGHT - latlng.lat];
}
