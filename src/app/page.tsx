'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Hero from '@/components/Hero/Hero';
import Features from '@/components/Features/Features';
import DestinationCard from '@/components/DestinationCard/DestinationCard';
import { api, type Destination } from '@/lib/api';
import styles from './page.module.css';

export default function HomePage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDestinations('ordering=-popularity_score&page_size=8')
      .then((data) => {
        setDestinations(data.results);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load destinations.';
        setError(message);
        setDestinations([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Hero />

      {/* Popular Destinations */}
      <section className={`section ${styles.destinations}`}>
        <div className="container">
          <div className="section-header">
            <h2>Popular Destinations</h2>
            <p>Discover the most loved destinations around the world</p>
          </div>

          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
              <p>Unable to load destinations. {error}</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {destinations.map((d, i) => (
                <DestinationCard key={d.id} destination={d} index={i} />
              ))}
            </div>
          )}

          <div className={styles.viewAll}>
            <Link href="/destinations" className="btn btn-secondary">
              View All Destinations
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <Features />

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaCard}>
            <div className={styles.ctaOrb} />
            <h2 className={styles.ctaTitle}>Ready to plan your next trip?</h2>
            <p className={styles.ctaSubtitle}>
              Start a conversation with our AI and get a personalized itinerary in seconds.
            </p>
            <Link href="/chat" className="btn btn-primary btn-lg">
              Start Planning
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
