'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, type Trip } from '@/lib/api';
import { TourismMap } from '@/components/map/TourismMap';
import styles from './page.module.css';

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  hotel: '🏨',
  attraction: '🏛️',
  activity: '🎯',
  cafe: '☕',
  bar: '🍸',
  museum: '🏛️',
  park: '🌳',
  shopping: '🛍️',
  transport: '🚗',
  other: '📍',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, getToken } = useAuth();
  const id = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Maps Integration State
  const [mapPlaces, setMapPlaces] = useState<any[]>([]);
  const [routePolyline, setRoutePolyline] = useState<string | undefined>();
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeStats, setRouteStats] = useState<{duration: string, distance: string} | null>(null);

  useEffect(() => {
    if (!id || !isAuthenticated) return;

    const token = getToken();
    if (!token) {
      setError('Authentication required.');
      setLoading(false);
      return;
    }

    api.getTrip(token, id)
      .then((data) => {
        setTrip(data);
        setError(null);
        
        // Extract places for map
        const places: any[] = [];
        data.days?.forEach(day => {
            day.items?.forEach(item => {
                if (item.place?.latitude && item.place?.longitude) {
                    places.push({
                        lat: Number(item.place.latitude),
                        lng: Number(item.place.longitude),
                        name: item.place.name,
                        category: item.place.category,
                        rating: item.place.rating,
                        address: item.place.address
                    });
                }
            });
        });
        setMapPlaces(places);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load trip.';
        setError(message);
        setTrip(null);
      })
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, getToken]);

  const handleShare = async () => {
    if (!trip || !isAuthenticated) return;
    const token = getToken();
    if (!token) return;

    try {
      const data = await api.shareTrip(token, trip.id);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.share_url);
        alert('Share link copied to clipboard!');
      }
    } catch {
      alert('Failed to generate share link.');
    }
  };

  const handleDuplicate = async () => {
    if (!trip || !isAuthenticated) return;
    const token = getToken();
    if (!token) return;

    try {
      await api.duplicateTrip(token, trip.id);
      router.push('/trips');
    } catch {
      alert('Failed to duplicate trip.');
    }
  };
  
  const handleBuildRoute = async () => {
      if (!trip || !isAuthenticated) return;
      const token = getToken();
      if (!token) return;
      
      setLoadingRoute(true);
      try {
          const routeData = await api.getTripRoute(token, trip.id, 'driving');
          if (routeData.polyline) {
              setRoutePolyline(routeData.polyline);
              setRouteStats({
                  duration: routeData.duration_text,
                  distance: routeData.distance_text
              });
          }
      } catch (err) {
          console.error("Failed to build route", err);
          alert("Не удалось построить маршрут. Возможно, места находятся слишком далеко друг от друга.");
      } finally {
          setLoadingRoute(false);
      }
  };

  if (loading) {
    return (
      <div className={`${styles.page} container`}>
        <div className={styles.skeleton}>Loading trip...</div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className={`${styles.page} container`}>
        <div className={styles.error}>
          <h1>Trip Not Found</h1>
          <p>{error || 'The requested trip could not be found.'}</p>
          <Link href="/trips" className={styles.backLink}>
            ← Back to My Trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} container`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/trips" className={styles.backLink}>
            ← Back to My Trips
          </Link>
          <h1 className={styles.title}>{trip.title}</h1>
          {trip.destination && (
            <p className={styles.subtitle}>📍 {trip.destination}</p>
          )}
          {(trip.start_date || trip.end_date) && (
            <p className={styles.subtitle}>
              {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
            </p>
          )}
          {trip.status && (
            <span className={`${styles.status} ${styles[`status_${trip.status}`]}`}>
              {trip.status}
            </span>
          )}
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-ghost btn-sm" onClick={handleShare}>
            🔗 Share
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleDuplicate}>
            📋 Duplicate
          </button>
          <Link href="/chat" className="btn btn-primary btn-sm">
            ✏️ Edit with AI
          </Link>
        </div>
      </div>

      {/* AI Query */}
      {trip.ai_query && (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>AI Query:</p>
          <p style={{ margin: 0, fontStyle: 'italic' }}>&ldquo;{trip.ai_query}&rdquo;</p>
        </div>
      )}
      
      {/* Google Maps Integration */}
      {mapPlaces.length > 0 && (
          <div style={{ marginBottom: '2rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>📍 Карта маршрута</h3>
                <div>
                    {routeStats && (
                        <span style={{ marginRight: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            🚗 {routeStats.duration} ({routeStats.distance})
                        </span>
                    )}
                    <button 
                        className="btn btn-primary btn-sm" 
                        onClick={handleBuildRoute}
                        disabled={loadingRoute}
                    >
                        {loadingRoute ? 'Строим...' : '🗺️ Построить маршрут'}
                    </button>
                </div>
              </div>
              <TourismMap 
                  places={mapPlaces} 
                  routePolyline={routePolyline} 
                  height="400px" 
              />
          </div>
      )}

      {/* Days */}
      {trip.days && trip.days.length > 0 ? (
        <div className={styles.daysList}>
          {trip.days.map((day) => (
            <div key={day.id} className={styles.dayCard}>
              <div className={styles.dayHeader}>
                <span className={styles.dayNumber}>Day {day.day_number}</span>
                <span className={styles.dayTitle}>{day.title || `Day ${day.day_number}`}</span>
                {day.date && <span className={styles.dayDate}>{formatDate(day.date)}</span>}
              </div>
              {day.notes && <div className={styles.dayNotes}>{day.notes}</div>}
              {day.items && day.items.length > 0 && (
                <div className={styles.itemsList}>
                  {day.items.map((item, i) => {
                    const icon = item.place
                      ? CATEGORY_ICONS[item.place.category] || '📍'
                      : '📌';
                    return (
                      <div key={item.id} className={styles.item}>
                        <span className={styles.itemTime}>
                          {item.start_time || ''}
                        </span>
                        <div className={styles.itemIcon}>{icon}</div>
                        <div className={styles.itemInfo}>
                          <p className={styles.itemName}>
                            {item.display_title || item.place?.name || item.custom_title}
                          </p>
                          {item.place?.address && (
                            <p className={styles.itemDesc}>{item.place.address}</p>
                          )}
                          {!item.place && item.custom_description && (
                            <p className={styles.itemDesc}>{item.custom_description}</p>
                          )}
                          {item.notes && (
                            <p className={styles.itemNotes}>{item.notes}</p>
                          )}
                          {item.place && (
                            <Link
                              href={`/place/${item.place.slug}`}
                              className={styles.itemLink}
                            >
                              View details →
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.error}>
          <p>No days in this trip yet.</p>
          <Link href="/chat" className="btn btn-primary">
            Plan with AI
          </Link>
        </div>
      )}
    </div>
  );
}
