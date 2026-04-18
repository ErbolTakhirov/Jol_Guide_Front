'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TourismMap } from '@/components/map/TourismMap';
import styles from './page.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface PlaceDetail {
  place_id: string;
  name: string;
  rating: number | null;
  formatted_address: string | null;
  formatted_phone_number: string | null;
  opening_hours: {
    open_now?: boolean;
    weekday_text?: string[];
  } | null;
  website: string | null;
  photos: string[];
  reviews: {
    author_name: string;
    rating: number;
    text: string;
    relative_time_description: string;
    profile_photo_url?: string;
  }[];
  coordinates: { lat: number; lng: number };
  google_maps_url: string | null;
  types: string[];
  price_level: number | null;
  description?: string;
}

interface TripOption {
  id: string;
  title: string;
}

export default function PlaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const placeId = params.placeId as string;

  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);

  // Trip modal
  const [showTripModal, setShowTripModal] = useState(false);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [addingToTrip, setAddingToTrip] = useState(false);

  // Hours expand
  const [showAllHours, setShowAllHours] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const fetchPlace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res;
      // Google Place IDs almost always start with 'ChI'
      if (placeId.startsWith('ChI')) {
        res = await fetch(`${API_BASE}/places/google/${placeId}/`, { headers });
      } else {
        // Otherwise assume it's a slug for a local database place
        res = await fetch(`${API_BASE}/places/${placeId}/`, { headers });
      }

      if (!res.ok) {
        if (res.status === 404) throw new Error('Место не найдено');
        throw new Error(`Ошибка загрузки (${res.status})`);
      }
      const data = await res.json();
      
      // Adapt local place data format to match Google place details if needed
      if (!placeId.startsWith('ChI')) {
         setPlace({
           place_id: data.slug,
           name: data.name,
           rating: data.rating,
           formatted_address: data.address || `${data.city || ''}, ${data.country || ''}`.replace(/^, | , $/g, ''),
           formatted_phone_number: data.formatted_phone_number || null,
           opening_hours: data.opening_hours || null,
           website: data.website || null,
           photos: Array.isArray(data.photos) && data.photos.length > 0 ? data.photos : [],
           reviews: Array.isArray(data.reviews) ? data.reviews : [],
           coordinates: { 
             lat: data.latitude ? parseFloat(data.latitude) : 42.8746, 
             lng: data.longitude ? parseFloat(data.longitude) : 74.5698 
           },
           google_maps_url: null,
           types: data.tags || [],
           price_level: data.price_level,
           description: data.description,
         });
      } else {
         setPlace(data as PlaceDetail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }, [placeId, token]);

  useEffect(() => {
    if (placeId) fetchPlace();
  }, [placeId, fetchPlace]);

  const fetchTrips = async () => {
    if (!token) return;
    setTripsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || data;
        setTrips(results.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })));
      }
    } catch (err) {
      console.error('Failed to load trips', err);
    } finally {
      setTripsLoading(false);
    }
  };

  const handleAddToTrip = async (tripId: string) => {
    if (!token || !place) return;
    setAddingToTrip(true);
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          place_name: place.name,
          place_address: place.formatted_address,
          place_latitude: place.coordinates.lat,
          place_longitude: place.coordinates.lng,
          google_place_id: place.place_id,
        }),
      });
      if (res.ok) {
        setShowTripModal(false);
        alert('Место добавлено в поездку!');
      } else {
        throw new Error('Ошибка при добавлении');
      }
    } catch (err) {
      console.error(err);
      alert('Не удалось добавить место в поездку');
    } finally {
      setAddingToTrip(false);
    }
  };

  const openTripModal = () => {
    setShowTripModal(true);
    fetchTrips();
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars: string[] = [];
    for (let i = 0; i < full; i++) stars.push('★');
    if (half) stars.push('½');
    return stars.join('');
  };

  const getPriceLabel = (level: number | null) => {
    if (level === null || level === undefined) return null;
    return '$'.repeat(level);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.skeleton}>
            <div className={styles.skeletonGallery} />
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonGrid}>
              <div className={styles.skeletonBlock} />
              <div className={styles.skeletonBlock} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2>Что-то пошло не так</h2>
            <p>{error}</p>
            <button className={styles.retryBtn} onClick={fetchPlace}>Попробовать снова</button>
            <button className={styles.backBtnAlt} onClick={() => router.back()}>← Назад</button>
          </div>
        </div>
      </div>
    );
  }

  if (!place) return null;

  const isOpenNow = place.opening_hours?.open_now;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Back button */}
        <button className={styles.backBtn} onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Назад
        </button>

        {/* Photo Gallery */}
        {place.photos.length > 0 && (
          <div className={styles.gallery}>
            <div className={styles.mainPhoto}>
              <img
                src={place.photos[activePhoto]}
                alt={place.name}
                className={styles.mainPhotoImg}
              />
            </div>
            {place.photos.length > 1 && (
              <div className={styles.thumbStrip}>
                {place.photos.map((url, i) => (
                  <button
                    key={i}
                    className={`${styles.thumb} ${i === activePhoto ? styles.thumbActive : ''}`}
                    onClick={() => setActivePhoto(i)}
                  >
                    <img src={url} alt={`${place.name} photo ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Header Info */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.placeName}>{place.name}</h1>
            {place.formatted_address && (
              <p className={styles.address}>
                <span className={styles.infoIcon}>📍</span>
                {place.formatted_address}
              </p>
            )}
          </div>
          <div className={styles.headerRight}>
            {place.rating && (
              <div className={styles.ratingBadge}>
                <span className={styles.ratingStars}>{renderStars(place.rating)}</span>
                <span className={styles.ratingNumber}>{place.rating}</span>
              </div>
            )}
            {place.price_level !== null && place.price_level !== undefined && (
              <div className={styles.priceBadge}>{getPriceLabel(place.price_level)}</div>
            )}
          </div>
        </div>

        {/* Quick Info Row */}
        <div className={styles.quickInfo}>
          {place.opening_hours && (
            <div className={styles.infoChip}>
              <span className={styles.infoIcon}>🕐</span>
              <span className={isOpenNow ? styles.openNow : styles.closedNow}>
                {isOpenNow ? 'Открыто' : 'Закрыто'}
              </span>
            </div>
          )}
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener noreferrer" className={styles.infoChip}>
              <span className={styles.infoIcon}>🌐</span>
              Сайт
            </a>
          )}
          {place.formatted_phone_number && (
            <a href={`tel:${place.formatted_phone_number}`} className={styles.infoChip}>
              <span className={styles.infoIcon}>📞</span>
              {place.formatted_phone_number}
            </a>
          )}
          {place.google_maps_url && (
            <a href={place.google_maps_url} target="_blank" rel="noopener noreferrer" className={styles.infoChip}>
              <span className={styles.infoIcon}>🗺️</span>
              Google Maps
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={openTripModal}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Добавить в поездку
          </button>
        </div>

        {/* Description Section */}
        {place.description && (
          <div className={styles.descriptionSection}>
            <h3 className={styles.sectionTitle}>Описание</h3>
            <div className={styles.descriptionText}>
              {place.description.split('\n').map((paragraph, idx) => (
                <p key={idx} style={{ marginBottom: '10px' }}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {/* Content Grid: Map + Reviews */}
        <div className={styles.contentGrid}>
          {/* Map */}
          <div className={styles.mapSection}>
            <h3 className={styles.sectionTitle}>Расположение</h3>
            <TourismMap
              places={[{
                lat: place.coordinates.lat,
                lng: place.coordinates.lng,
                name: place.name,
                address: place.formatted_address || undefined,
                rating: place.rating || undefined,
              }]}
              center={place.coordinates}
              height="350px"
            />
            {/* Opening Hours */}
            {place.opening_hours?.weekday_text && place.opening_hours.weekday_text.length > 0 && (
              <div className={styles.hoursSection}>
                <h4 className={styles.hoursTitle} onClick={() => setShowAllHours(!showAllHours)}>
                  <span className={styles.infoIcon}>🕐</span>
                  Часы работы
                  <span className={styles.chevron}>{showAllHours ? '▲' : '▼'}</span>
                </h4>
                {showAllHours && (
                  <ul className={styles.hoursList}>
                    {place.opening_hours.weekday_text.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className={styles.reviewsSection}>
            <h3 className={styles.sectionTitle}>
              Отзывы
              {place.reviews.length > 0 && <span className={styles.reviewCount}> ({place.reviews.length})</span>}
            </h3>
            {place.reviews.length === 0 ? (
              <div className={styles.emptyReviews}>Отзывы пока не загружены</div>
            ) : (
              <div className={styles.reviewList}>
                {place.reviews.map((review, i) => (
                  <div key={i} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewAuthor}>
                        {review.profile_photo_url && (
                          <img src={review.profile_photo_url} alt="" className={styles.reviewAvatar} />
                        )}
                        <span className={styles.authorName}>{review.author_name}</span>
                      </div>
                      <div className={styles.reviewMeta}>
                        <span className={styles.reviewStars}>{'★'.repeat(review.rating)}</span>
                        <span className={styles.reviewTime}>{review.relative_time_description}</span>
                      </div>
                    </div>
                    <p className={styles.reviewText}>{review.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trip Modal */}
      {showTripModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTripModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Выберите поездку</h3>
            {!token ? (
              <p className={styles.modalEmpty}>
                <a href="/login">Войдите</a>, чтобы добавить место в поездку
              </p>
            ) : tripsLoading ? (
              <div className={styles.modalLoading}>Загрузка...</div>
            ) : trips.length === 0 ? (
              <p className={styles.modalEmpty}>У вас пока нет поездок. Создайте поездку в разделе My Trips.</p>
            ) : (
              <div className={styles.tripList}>
                {trips.map(trip => (
                  <button
                    key={trip.id}
                    className={styles.tripItem}
                    onClick={() => handleAddToTrip(trip.id)}
                    disabled={addingToTrip}
                  >
                    {trip.title}
                  </button>
                ))}
              </div>
            )}
            <button className={styles.modalClose} onClick={() => setShowTripModal(false)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}
