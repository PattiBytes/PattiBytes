interface Coordinates {
  lat: number;
  lng: number;
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
    Math.cos(toRad(coord2.lat)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimals
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Calculate delivery charges based on distance
export function calculateDeliveryCharges(distanceInKm: number): number {
  if (distanceInKm <= 10) {
    return 50; // Flat ₹50 for within 10km
  }
  return 50 + Math.ceil(distanceInKm - 10) * 15; // ₹15 per km beyond 10km
}

// Get coordinates from pincode (using external API or database)
export async function getCoordinatesFromPincode(pincode: string): Promise<Coordinates | null> {
  try {
    // Using Nominatim (OpenStreetMap) API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get coordinates:', error);
    return null;
  }
}

// Get current location using browser geolocation
export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
}

// Punjab pincodes database (partial - add more as needed)
export const punjabPincodes: Record<string, Coordinates> = {
  '141001': { lat: 30.9010, lng: 75.8573 }, // Ludhiana
  '141002': { lat: 30.9123, lng: 75.8454 },
  '141003': { lat: 30.8876, lng: 75.8632 },
  '141008': { lat: 30.8945, lng: 75.8512 },
  '141012': { lat: 30.9234, lng: 75.8745 },
  '160001': { lat: 30.7333, lng: 76.7794 }, // Chandigarh
  '143001': { lat: 31.6340, lng: 74.8723 }, // Amritsar
  '144001': { lat: 31.3260, lng: 75.5762 }, // Jalandhar
  '147001': { lat: 30.2100, lng: 74.9455 }, // Patiala
};
