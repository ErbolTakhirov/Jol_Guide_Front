'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './TourismMap.module.css';

interface PlaceLocation {
  lat: number;
  lng: number;
  name?: string;
  category?: string;
  rating?: number;
  price_level?: number;
  address?: string;
}

interface TourismMapProps {
  places?: PlaceLocation[];
  center?: { lat: number; lng: number };
  routePolyline?: string;
  onPlaceSelect?: (place: PlaceLocation) => void;
  height?: string;
}

const MARKER_COLORS: Record<string, string> = {
  museum: '#8B5CF6',
  restaurant: '#F59E0B',
  hotel: '#3B82F6',
  attraction: '#EF4444',
  park: '#10B981',
  activity: '#F97316',
  shopping: '#EC4899',
};

export function TourismMap({ places = [], center, routePolyline, onPlaceSelect, height = '500px' }: TourismMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    import('@googlemaps/js-api-loader').then(({ importLibrary, setOptions }) => {
      setOptions({
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        v: 'weekly',
      });

      Promise.all([
        importLibrary('maps'),
        importLibrary('geometry') // pre-load geometry for polylines
      ]).then(() => {
        if (!mapRef.current) return;

        const defaultCenter = center || { lat: 42.8746, lng: 74.5698 }; // Bishkek default
        const m = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 13,
          mapId: 'TOURISM_MAP',
          disableDefaultUI: false,
          styles: [
            { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.attraction', stylers: [{ visibility: 'on' }] },
          ],
        });
        setMap(m);
      }).catch((e: unknown) => {
         console.error("Google Maps load error:", e);
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    // Add new markers
    if (places && places.length > 0) {
      const infoWindow = new google.maps.InfoWindow();

      places.forEach(place => {
        if (!place.lat || !place.lng) return;
        const position = { lat: place.lat, lng: place.lng };
        hasPoints = true;
        bounds.extend(position);

        const category = (place.category || 'other').toLowerCase();
        const color = MARKER_COLORS[category] || '#10B981';

        const marker = new google.maps.Marker({
          position,
          map,
          title: place.name || 'Place',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });

        marker.addListener('click', () => {
          const content = `
            <div class="${styles.infoWindow}">
              <strong>${place.name || 'Unnamed place'}</strong><br/>
              ${place.rating ? `⭐ ${place.rating}` : ''}
              ${place.price_level ? ` | ${'$'.repeat(place.price_level)}` : ''}<br/>
              ${place.address ? `📍 ${place.address}` : ''}
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
          if (onPlaceSelect) onPlaceSelect(place);
        });

        markersRef.current.push(marker);
      });
    }

    // Handle polyline if provided
    if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
    }

    if (routePolyline) {
        try {
            const decodedPath = google.maps.geometry.encoding.decodePath(routePolyline);
            polylineRef.current = new google.maps.Polyline({
                path: decodedPath,
                geodesic: true,
                strokeColor: '#3B82F6',
                strokeOpacity: 0.8,
                strokeWeight: 5,
            });
            polylineRef.current.setMap(map);
            
            // Expand bounds to include polyline
            decodedPath.forEach(point => {
               bounds.extend(point);
               hasPoints = true;
            });
        } catch (e) {
            console.error("Failed to decode polyline:", e);
        }
    }

    // Fit bounds if we added any points
    if (hasPoints && !center) { // Only auto-fit if center wasn't explicitly forced
       if (places.length === 1 && !routePolyline) {
           map.setCenter({lat: places[0].lat, lng: places[0].lng});
           map.setZoom(15);
       } else {
           map.fitBounds(bounds);
       }
    } else if (center) {
        map.setCenter(center);
    }

  }, [map, places, routePolyline, center, onPlaceSelect]);

  return <div ref={mapRef} style={{ width: '100%', height, borderRadius: '12px', overflow: 'hidden' }} />;
}
