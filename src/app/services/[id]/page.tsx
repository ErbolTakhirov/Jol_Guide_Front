"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./service-detail.module.css";
import api from "@/lib/axios";

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    const fetchService = async () => {
      try {
        const response = await api.get(`/api/v1/services/${params.id}/`);
        setService(response.data);
      } catch (error) {
        console.error("Failed to load service", error);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [params.id]);

  if (loading) return <div className={styles.loader}>Загрузка...</div>;
  if (!service) return <div className={styles.loader}>Услуга не найдена</div>;

  const photos = service.photos || [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Назад
        </button>
        <h1 className={styles.title}>{service.title}</h1>
        <div className={styles.metaRow}>
          <span className={styles.rating}>★ {service.rating} ({service.total_reviews} отзывов)</span>
          <span className={styles.location}>📍 {service.meeting_point || "Уточняется"}</span>
        </div>
      </header>

      <div className={styles.gallery}>
        {photos.slice(0, 3).map((p: any, i: number) => (
          <div key={p.id || i} className={styles.photoWrapper}>
            <img src={p.photo} alt={`Photo ${i+1}`} className={styles.photo} />
          </div>
        ))}
      </div>

      <div className={styles.mainContent}>
        <div className={styles.leftColumn}>
          <div className={styles.guideSection}>
            <img 
              src={service.guide?.user?.avatar_url || '/placeholder.jpg'} 
              alt="Guide avatar" 
              className={styles.avatar} 
            />
            <div>
              <h3>Проводит: {service.guide?.user?.display_name || "Местный гид"}</h3>
              <p>Языки: {service.languages?.join(", ") || "Русский"}</p>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Об услуге</h2>
            <p className={styles.description}>{service.description}</p>
          </div>

          <div className={styles.section}>
            <h2>Детали</h2>
            <ul className={styles.detailsList}>
              <li><strong>Длительность:</strong> {service.duration_hours} часов</li>
              <li><strong>Макс. размер группы:</strong> {service.max_group_size} человек</li>
              <li><strong>Тип:</strong> {service.service_type}</li>
            </ul>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.bookingCard}>
            <div className={styles.priceHeader}>
              <span className={styles.price}>{service.price} {service.currency}</span>
              <span className={styles.priceType}>/ {service.price_type === 'per_person' ? 'за человека' : 'за группу'}</span>
            </div>
            
            {/* Mock Booking Button for now, until booking wizard is built */}
            <button className={styles.bookButton}>Забронировать</button>
            <p className={styles.policyText}>Отмена: {service.cancellation_policy}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
