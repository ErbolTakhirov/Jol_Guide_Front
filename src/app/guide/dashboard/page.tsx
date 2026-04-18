"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./guide-dashboard.module.css";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

export default function GuideDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we're fully loaded and the user doesn't have guide access, kick them out
    if (user && user.role !== 'guide' && user.role !== 'anon') {
      router.push("/become-guide");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const [profileRes, servicesRes] = await Promise.all([
          api.get("/api/v1/guides/me/"),
          api.get("/api/v1/services/"), // actually we need Guide's own services. Let's filter client-side for now or rely on an endpoint.
          // In a real app we'd have /api/v1/services/my/ or similar.
        ]);
        setProfile(profileRes.data);
        
        // Filter out services that belong to this profile
        const myServices = servicesRes.data.filter((s: any) => s.guide?.id === profileRes.data.id);
        setServices(myServices);
      } catch (error) {
        console.error("Dashboard error", error);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'guide') {
      fetchDashboardData();
    }
  }, [user, router]);

  if (loading || !user) {
    return <div className={styles.loader}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Панель Гида</h1>
        <p>Добро пожаловать, {profile?.user?.display_name || "Гид"}!</p>
      </header>

      <div className={styles.dashboardGrid}>
        {/* Profile Card */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Ваш Профиль</h2>
            <button className={styles.editBtn}>Редактировать</button>
          </div>
          <div className={styles.profileDetails}>
            <p><strong>Город:</strong> {profile?.location_city}</p>
            <p><strong>Рейтинг:</strong> {profile?.rating} ({profile?.total_reviews} отзывов)</p>
            <p><strong>Телефон:</strong> {profile?.phone}</p>
            <p><strong>Bio:</strong> {profile?.bio}</p>
          </div>
        </section>

        {/* Services Card */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Мои услуги</h2>
            <Link href="/guide/services/create" className={styles.createBtn}>
              + Добавить
            </Link>
          </div>
          
          {services.length === 0 ? (
            <p className={styles.emptyText}>У вас пока нет услуг.</p>
          ) : (
            <div className={styles.servicesList}>
              {services.map(service => (
                <div key={service.id} className={styles.serviceItem}>
                  <div>
                    <h4>{service.title}</h4>
                    <span className={styles.tag}>{service.service_type}</span>
                  </div>
                  <div>
                    <span className={styles.price}>{service.price} {service.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
