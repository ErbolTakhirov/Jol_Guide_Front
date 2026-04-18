import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './PlaceChip.module.css';

interface PlaceData {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  address?: string;
  photo_reference?: string;
}

interface PlaceChipProps {
  place: PlaceData;
  displayName: string;
}

export function PlaceChip({ place, displayName }: PlaceChipProps) {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/places/${place.place_id}`);
  };

  return (
    <span 
      className={styles.chipWrapper}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={styles.chip} onClick={handleClick}>
        <span className={styles.icon}>📍</span>
        <span className={styles.name}>{displayName}</span>
      </span>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipTitle}>{place.name}</div>
          {place.rating && <div className={styles.tooltipRating}>⭐ {place.rating}</div>}
          {place.address && <div className={styles.tooltipAddress}>{place.address}</div>}
        </div>
      )}
    </span>
  );
}
