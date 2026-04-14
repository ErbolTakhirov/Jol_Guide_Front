'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, Trip } from '@/lib/api';
import styles from './page.module.css';

export default function TripsPage() {
  const { isAuthenticated, getToken, isLoading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setError('Please log in to view your trips.');
      setLoading(false);
      return;
    }

    const token = getToken();
    if (!token) {
      setError('Authentication error. Please log in again.');
      setLoading(false);
      return;
    }

    api.getTrips(token)
      .then((res) => {
        setTrips(res.results);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load trips.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, getToken]);

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>My Trips</h1>
          <Link href="/chat" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Create with AI
          </Link>
        </div>

        {loading ? (
          <div className={styles.empty}>
            <p>Loading trips...</p>
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : trips.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
              </svg>
            </div>
            <h3>No trips yet</h3>
            <p>Start planning your first adventure with our AI assistant.</p>
            <Link href="/chat" className="btn btn-primary">Plan Your First Trip</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {trips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`} className={styles.tripCard}>
                <h3>{trip.title}</h3>
                <p>
                  {trip.start_date ?? 'No date'} — {trip.end_date ?? 'No date'}
                </p>
                {trip.days_count !== undefined && (
                  <span>{trip.days_count} day{trip.days_count !== 1 ? 's' : ''}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
