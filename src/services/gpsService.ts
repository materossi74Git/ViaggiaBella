/**
 * Servizio GPS per ViaggiaBella (Cooperativa Clarabella).
 * Rileva il punto GPS esatto di dove viene effettuata la lettura del mezzo (partenza e arrivo)
 * con geocodifica inversa per ottenere nome del luogo/indirizzo.
 */

export interface GpsPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  timestamp: string;
}

/**
 * Ottiene la posizione GPS corrente del dispositivo in modo sicuro e non bloccante.
 * Se il GPS è spento, disattivato o il permesso è negato, restituisce null senza mai bloccare l'app.
 * Il timeout predefinito è breve (3 secondi) per non rallentare l'avvio del viaggio.
 */
export async function tryGetGpsPoint(timeoutMs: number = 3000): Promise<GpsPoint | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise(resolve => {
    let resolved = false;

    // Timer di sicurezza locale oltre alle options del browser
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 30000,
    };

    try {
      navigator.geolocation.getCurrentPosition(
        async position => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);

          try {
            const { latitude, longitude, accuracy } = position.coords;
            const timestamp = new Date(position.timestamp || Date.now()).toISOString();

            let address = '';
            try {
              address = await reverseGeocode(latitude, longitude);
            } catch {
              address = `Coordinate (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
            }

            resolve({
              latitude,
              longitude,
              accuracy: Math.round(accuracy || 0),
              address,
              timestamp,
            });
          } catch {
            resolve(null);
          }
        },
        _error => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          resolve(null); // Non fallisce mai: se GPS spento restituisce semplicemente null
        },
        options
      );
    } catch {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Ottiene la posizione GPS corrente del dispositivo con massima precisione disponibile.
 */
export async function getCurrentGpsPoint(timeoutMs: number = 5000): Promise<GpsPoint> {
  const pt = await tryGetGpsPoint(timeoutMs);
  if (!pt) {
    throw new Error('Segnale GPS non disponibile o disattivato sul dispositivo.');
  }
  return pt;
}

/**
 * Geocodifica inversa gratuita tramite OpenStreetMap Nominatim con cache locale.
 */
const geocodeCache = new Map<string, string>();

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'it',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.street || '';
      const houseNumber = addr.house_number ? ` ${addr.house_number}` : '';
      const city = addr.city || addr.town || addr.village || addr.municipality || '';
      const province = addr.province || addr.county || '';

      const parts: string[] = [];
      if (road) parts.push(`${road}${houseNumber}`);
      if (city) parts.push(city);
      if (province && province !== city) parts.push(`(${province})`);

      const formatted = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',') || '';
      if (formatted) {
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch {
    // Fallback pulito su coordinate formattate
  }

  const fallback = `Punto GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
  geocodeCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Genera il link per aprire il punto su Google Maps
 */
export function getGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
