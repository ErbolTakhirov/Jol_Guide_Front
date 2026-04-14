'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Destination } from '@/lib/api';
import styles from './page.module.css';

export default function DestinationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    api.getDestination(slug)
      .then((data) => {
        setDestination(data);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load destination.';
        setError(message);
        setDestination(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton}>Loading...</div>
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h1>Destination Not Found</h1>
          <p>{error || 'The requested destination could not be found.'}</p>
          <Link href="/destinations" className={styles.backLink}>
            ← Back to Destinations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section
        className={styles.hero}
        style={{
          backgroundImage: `url(${destination.hero_image_url || `https://picsum.photos/seed/${destination.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)}/1200/600`})`,
        }}
      >
        <div className={styles.heroOverlay}>
          <div className="container">
            <Link href="/destinations" className={styles.backButton}>
              ← Back to Destinations
            </Link>
            <h1 className={styles.heroTitle}>{destination.name}</h1>
            <p className={styles.heroCountry}>{destination.country}</p>
            <div className={styles.heroTags}>
              {destination.tags.map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className={styles.content}>
        <div className="container">
          <div className={styles.infoGrid}>
            <div className={styles.mainInfo}>
              <h2>About {destination.name}</h2>
              <p className={styles.description}>
                {destination.description || 'No description available for this destination.'}
              </p>

              {destination.places_count !== undefined && destination.places_count > 0 && (
                <div className={styles.placesInfo}>
                  <h3>Places to Visit</h3>
                  <p className={styles.placesCount}>
                    {destination.places_count} {destination.places_count === 1 ? 'place' : 'places'} to explore
                  </p>
                </div>
              )}
            </div>

            <div className={styles.sidebar}>
              <div className={styles.infoCard}>
                <h3>Quick Facts</h3>
                <div className={styles.factRow}>
                  <span className={styles.factLabel}>Country</span>
                  <span className={styles.factValue}>{destination.country}</span>
                </div>
                <div className={styles.factRow}>
                  <span className={styles.factLabel}>Popularity Score</span>
                  <span className={styles.factValue}>{destination.popularity_score}</span>
                </div>
                {destination.places_count !== undefined && (
                  <div className={styles.factRow}>
                    <span className={styles.factLabel}>Places</span>
                    <span className={styles.factValue}>{destination.places_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
