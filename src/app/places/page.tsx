'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlaceAutocomplete } from '@/components/map/PlaceAutocomplete';
import { TourismMap } from '@/components/map/TourismMap';
import styles from './page.module.css';

export default function PlacesPage() {
  const { getToken, isAuthenticated } = useAuth();
  
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Map State
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Initial load - fetch some popular places or default search
  useEffect(() => {
     if (isAuthenticated) {
         handleSearch('Кыргызстан достопримечательности');
     }
  }, [isAuthenticated]);

  const handleSearch = async (searchQuery: string, lat?: number, lng?: number) => {
    if (!isAuthenticated) {
        setError("Please login to search places");
        return;
    }
    
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.googleSearchPlaces(token, searchQuery, lat, lng);
      setPlaces(data.results || []);
      
      if (lat && lng) {
          setMapCenter({lat, lng});
      } else if (data.results && data.results.length > 0) {
          // Center on first result
          const first = data.results[0];
          if (first.latitude && first.longitude) {
              setMapCenter({ lat: first.latitude, lng: first.longitude });
          }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const onAutocompleteSelect = (place: { id: string; lat: number; lng: number; name: string }) => {
     setQuery(place.name);
     setMapCenter({ lat: place.lat, lng: place.lng });
     // Search nearby around selected place
     handleSearch('', place.lat, place.lng);
  };

  // Convert API places to Map places format
  const mapPlaces = places.map((p, idx) => ({
      id: p.google_place_id || String(idx),
      lat: parseFloat(p.latitude),
      lng: parseFloat(p.longitude),
      name: p.name,
      rating: p.rating,
      address: p.address,
      category: p.types?.[0] || 'attraction'
  })).filter(p => !isNaN(p.lat) && !isNaN(p.lng));

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <h1>Искать места (Google Maps)</h1>
        <p className={styles.subtitle}>
          Найдите лучшие отели, рестораны и достопримечательности с реальными рейтингами из Google.
        </p>
      </div>

      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
            <input 
                type="text" 
                placeholder="Поиск по названию (например, 'Кафе в Бишкеке')" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
                className={styles.textInput}
            />
            <button className="btn btn-primary" onClick={() => handleSearch(query)} disabled={loading}>
                {loading ? 'Поиск...' : 'Искать'}
            </button>
        </div>
        
        <div className={styles.autocompleteWrapper}>
            <p>Или выберите точную локацию:</p>
            <PlaceAutocomplete onPlaceSelect={onAutocompleteSelect} placeholder="Введите адрес или место..." />
        </div>
      </div>
      
      {error && <div className={styles.errorAlert}>{error}</div>}

      <div className={styles.mainContent}>
        {/* List View */}
        <div className={styles.placesList}>
           <h3>Результаты {places.length > 0 && `(${places.length})`}</h3>
           
           {!isAuthenticated && (
               <div className={styles.emptyState}>Пожалуйста, авторизуйтесь для поиска мест.</div>
           )}
           
           {isAuthenticated && !loading && places.length === 0 && !error && (
               <div className={styles.emptyState}>Ничего не найдено. Попробуйте изменить запрос.</div>
           )}
           
           {loading && <div className={styles.loadingState}>Идет поиск в Google Maps...</div>}
           
           {!loading && places.map((place, idx) => (
               <div 
                  key={place.google_place_id || idx} 
                  className={`${styles.placeCard} ${selectedPlaceId === place.google_place_id ? styles.selectedCard : ''}`}
                  onClick={() => {
                      if (place.latitude && place.longitude) {
                          setMapCenter({ lat: parseFloat(place.latitude), lng: parseFloat(place.longitude) });
                          setSelectedPlaceId(place.google_place_id);
                      }
                  }}
               >
                   {place.photo_url && (
                       <img src={place.photo_url} alt={place.name} className={styles.placeImage} />
                   )}
                   <div className={styles.placeInfo}>
                       <h4>{place.name}</h4>
                       <p className={styles.address}>📍 {place.address}</p>
                       <div className={styles.meta}>
                           {place.rating && <span>⭐ {place.rating} ({place.reviews_count} отзывов)</span>}
                           {place.price_level != null && <span>💸 {'$'.repeat(place.price_level)}</span>}
                           {!place.is_open && <span className={styles.closed}>Закрыто</span>}
                       </div>
                   </div>
               </div>
           ))}
        </div>
        
        {/* Map View */}
        <div className={styles.mapContainer}>
             <div className={styles.mapSticky}>
                 <TourismMap 
                     places={mapPlaces} 
                     center={mapCenter} 
                     height="100%" 
                     onPlaceSelect={(p) => {
                         // Find the ID if possible (TourismMap currently doesn't pass ID back easily, 
                         // but it's an enhancement for later)
                     }} 
                 />
             </div>
        </div>
      </div>
    </div>
  );
}
