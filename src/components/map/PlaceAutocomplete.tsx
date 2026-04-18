'use client';

import { useEffect, useRef } from 'react';
import styles from './PlaceAutocomplete.module.css';

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: { id: string; lat: number; lng: number; name: string }) => void;
  placeholder?: string;
  className?: string;
}

export function PlaceAutocomplete({ onPlaceSelect, placeholder = 'Search for a place...', className }: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Use functional API for Google Maps loader (Loader class is forbidden in latest)
    import('@googlemaps/js-api-loader').then(({ importLibrary, setOptions }) => {
      setOptions({
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        v: 'weekly',
      });

      importLibrary('places').then(() => {
        if (!inputRef.current) return;

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['place_id', 'geometry', 'name'],
          types: ['establishment', 'geocode'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place && place.place_id && place.geometry?.location && place.name) {
            onPlaceSelect({
              id: place.place_id,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: place.name,
            });
          }
        });
      }).catch((e: unknown) => {
         console.error("Google Maps Autocomplete load error:", e);
      });
    });

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onPlaceSelect]);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder={placeholder}
      />
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
         <circle cx="11" cy="11" r="8"></circle>
         <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </div>
  );
}
