'use client';

import Link from 'next/link';
import styles from './DestinationCard.module.css';
import type { Destination } from '@/lib/api';

// Map of destination images (using picsum for demo, keyed by city name hash)
function getImageUrl(name: string): string {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${hash}/600/400`;
}

interface Props {
  destination: Destination;
  index?: number;
}

export default function DestinationCard({ destination, index = 0 }: Props) {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className={styles.card}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className={styles.imageWrap}>
        <img
          src={destination.hero_image_url || getImageUrl(destination.name)}
          alt={destination.name}
          className={styles.image}
          loading="lazy"
        />
        <div className={styles.overlay} />
        <div className={styles.tags}>
          {destination.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      </div>
      <div className={styles.info}>
        <h3 className={styles.name}>{destination.name}</h3>
        <p className={styles.country}>{destination.country}</p>
        <div className={styles.meta}>
          <span className={styles.score}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            {destination.popularity_score}
          </span>
          {destination.places_count !== undefined && destination.places_count > 0 && (
            <span className={styles.places}>{destination.places_count} places</span>
          )}
        </div>
      </div>
    </Link>
  );
}
