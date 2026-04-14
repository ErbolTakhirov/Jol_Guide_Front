'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, type Place } from '@/lib/api';
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

function formatPrice(level: number | null): string {
  if (!level) return '';
  return '$'.repeat(level);
}

export default function PlaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, getToken } = useAuth();
  const slug = params.slug as string;

  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!slug) return;

    api.getPlace(slug)
      .then((data) => {
        setPlace(data);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load place.';
        setError(message);
        setPlace(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSave = async () => {
    if (!isAuthenticated || !place) return;
    const token = getToken();
    if (!token) return;

    setSaving(true);
    try {
      // Find or create a collection, then add this place
      // For now, just show a toast-like message
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Ignore errors for now
    } finally {
      setSaving(false);
    }
  };

  const handleAddToTrip = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Navigate to trips page to create/select a trip
    router.push('/trips');
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton}>Loading...</div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h1>Place Not Found</h1>
          <p>{error || 'The requested place could not be found.'}</p>
          <Link href="/destinations" className={styles.backLink}>
            ← Back to Destinations
          </Link>
        </div>
      </div>
    );
  }

  const mainPhoto = place.photos?.[0] || `https://picsum.photos/seed/${place.slug}/1200/600`;
  const categoryIcon = CATEGORY_ICONS[place.category] || '📍';

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero} style={{ backgroundImage: `url(${mainPhoto})` }}>
        <div className={styles.heroOverlay}>
          <div className="container">
            <Link href="/destinations" className={styles.backButton}>
              ← Back to Destinations
            </Link>
            <div className={styles.heroContent}>
              <span className={styles.categoryBadge}>
                {categoryIcon} {place.category}
              </span>
              <h1 className={styles.title}>{place.name}</h1>
              <p className={styles.location}>
                {place.city && `${place.city}, `}{place.country}
              </p>
              <div className={styles.heroMeta}>
                {place.rating && (
                  <span className={styles.rating}>
                    ⭐ {place.rating} {place.reviews_count ? `(${place.reviews_count} reviews)` : ''}
                  </span>
                )}
                {place.price_level && (
                  <span className={styles.price}>{formatPrice(place.price_level)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className={styles.content}>
        <div className="container">
          <div className={styles.grid}>
            <div className={styles.main}>
              {/* Description */}
              <div className={styles.section}>
                <h2>About</h2>
                <p className={styles.description}>
                  {place.description || 'No description available for this place.'}
                </p>
              </div>

              {/* Photo Gallery */}
              {place.photos && place.photos.length > 1 && (
                <div className={styles.section}>
                  <h2>Photos</h2>
                  <div className={styles.gallery}>
                    {place.photos.map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt={`${place.name} - photo ${i + 1}`}
                        className={styles.galleryImg}
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Opening Hours */}
              {place.opening_hours && Object.keys(place.opening_hours).length > 0 && (
                <div className={styles.section}>
                  <h2>Opening Hours</h2>
                  <div className={styles.hours}>
                    {Object.entries(place.opening_hours).map(([day, hours]) => (
                      <div key={day} className={styles.hourRow}>
                        <span className={styles.hourDay}>{day}</span>
                        <span className={styles.hourTime}>{hours as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {place.tags && place.tags.length > 0 && (
                <div className={styles.section}>
                  <h2>Tags</h2>
                  <div className={styles.tags}>
                    {place.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
              <div className={styles.infoCard}>
                <h3>Quick Info</h3>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Category</span>
                  <span className={styles.infoValue}>{place.category}</span>
                </div>
                {place.address && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Address</span>
                    <span className={styles.infoValue}>{place.address}</span>
                  </div>
                )}
                {place.rating && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Rating</span>
                    <span className={styles.infoValue}>⭐ {place.rating}</span>
                  </div>
                )}
                {place.price_level && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Price</span>
                    <span className={styles.infoValue}>{formatPrice(place.price_level)}</span>
                  </div>
                )}
                {place.destination && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Destination</span>
                    <span className={styles.infoValue}>{place.destination}</span>
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                {isAuthenticated ? (
                  <button
                    className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : saved ? '✓ Saved!' : '♥ Save to Collection'}
                  </button>
                ) : (
                  <Link href="/login" className="btn btn-primary" style={{ textAlign: 'center' as const }}>
                    ♥ Save to Collection
                  </Link>
                )}
                <button className="btn btn-secondary" onClick={handleAddToTrip}>
                  + Add to Trip
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
