import React from 'react';
import Link from 'next/link';
import styles from './ServiceChip.module.css';

interface ServiceChipProps {
  id: string | number;
  displayName: string;
  guideName?: string;
  price?: number | string;
  currency?: string;
  rating?: number;
  duration?: number;
}

export const ServiceChip: React.FC<ServiceChipProps> = ({ 
  id, 
  displayName, 
  guideName, 
  price, 
  currency = 'USD',
  rating,
  duration
}) => {
  return (
    <div className={styles.chipWrapper}>
      <Link href={`/services/${id}`} className={styles.chip}>
        <span className={styles.icon}>🧭</span>
        <span className={styles.name}>{displayName}</span>
        {guideName && <span className={styles.guide}>by {guideName}</span>}
        {price && <span className={styles.price}>{price} {currency}</span>}
      </Link>
      
      {/* Tooltip */}
      {(rating || duration) && (
        <div className={styles.tooltip}>
          {rating ? `★ ${rating}` : ''}
          {rating && duration ? ' • ' : ''}
          {duration ? `${duration} hrs` : ''}
        </div>
      )}
    </div>
  );
};
