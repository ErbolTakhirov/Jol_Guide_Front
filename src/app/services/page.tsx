"use client";

import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import styles from "./services.module.css";
import api from "@/lib/axios";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await api.get("/api/v1/services/");
        setServices(response.data);
      } catch (error) {
        console.error("Failed to load services", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Уникальные впечатления</h1>
        <p>Откройте для себя Кыргызстан с местными гидами</p>
      </header>

      {loading ? (
        <div className={styles.loader}>Загрузка...</div>
      ) : (
        <div className={styles.grid}>
          {services.map((service) => (
            <Link key={service.id} href={`/services/${service.id}`} className={styles.card}>
              <div 
                className={styles.imageBox} 
                style={{ backgroundImage: `url(${service.cover_photo || '/placeholder.jpg'})` }}
              >
                <div className={styles.priceTag}>{service.price} {service.currency}</div>
              </div>
              <div className={styles.content}>
                <div className={styles.guideInfo}>
                  {service.guide && (
                    <span className={styles.guideName}>★ {service.rating} · Гид: {service.guide.user?.display_name || 'Guide'}</span>
                  )}
                </div>
                <h3 className={styles.title}>{service.title}</h3>
                <div className={styles.meta}>
                  <span>⏱ {service.duration_hours} ч.</span>
                  <span>📍 {service.meeting_point || 'Уточняется'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
