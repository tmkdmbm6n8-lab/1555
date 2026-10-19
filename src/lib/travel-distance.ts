// Adresse de l'entreprise : 4 rue de la Marquise de Sévigné, 67200 Strasbourg
export const COMPANY_COORDS = { lon: 7.69879, lat: 48.594205 };
export const FREE_RADIUS_KM = 20;
export const FAR_BASE_FEE = 9;
export const FAR_PER_KM_FEE = 1;

// Distance à vol d'oiseau, en kilomètres, depuis l'adresse de l'entreprise.
export function haversineKm(lon: number, lat: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - COMPANY_COORDS.lat);
  const dLon = toRad(lon - COMPANY_COORDS.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(COMPANY_COORDS.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Frais hors rayon : 9 € + 1 € par km (distance totale). Renvoie null dans le rayon.
export function farTravelFee(distanceKm: number | null | undefined): number | null {
  if (distanceKm == null || distanceKm <= FREE_RADIUS_KM) return null;
  return FAR_BASE_FEE + Math.round(distanceKm) * FAR_PER_KM_FEE;
}

// Géocodage via l'API Adresse du gouvernement (gratuite, sans clé).
export async function geocodeAddress(query: string): Promise<{ lon: number; lat: number } | null> {
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`);
  if (!res.ok) throw new Error('Vérification de l’adresse impossible.');
  const json = await res.json();
  const f = json.features?.[0];
  if (!f || (f.properties?.score ?? 0) < 0.5) return null;
  const [lon, lat] = f.geometry.coordinates as [number, number];
  return { lon, lat };
}
