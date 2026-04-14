'use client';

import { useEffect, useState } from 'react';
import DestinationCard from '@/components/DestinationCard/DestinationCard';
import { api, type Destination } from '@/lib/api';
import styles from './page.module.css';

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDestinations('ordering=-popularity_score&page_size=40')
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

  const filtered = destinations.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.country.toLowerCase().includes(search.toLowerCase()) ||
    (d.tags && d.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Explore Destinations</h1>
          <p className={styles.subtitle}>
            Browse {destinations.length}+ handpicked destinations. Find your perfect getaway.
          </p>
          <div className={styles.searchWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className={styles.search}
              placeholder="Search destinations, countries, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className="container">
          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : error ? (
            <div className={styles.empty}>
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className={styles.grid}>
              {filtered.map((d, i) => (
                <DestinationCard key={d.id} destination={d} index={i} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>No destinations found for &quot;{search}&quot;</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
