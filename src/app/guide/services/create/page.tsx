"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./create-service.module.css";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

export default function CreateServicePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: "",
    service_type: "tour",
    short_description: "",
    description: "",
    price: "",
    price_type: "per_person",
    currency: "USD",
    duration_hours: "",
    max_group_size: "",
    meeting_point: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role !== 'guide') {
      router.push("/become-guide");
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        duration_hours: parseFloat(formData.duration_hours),
        max_group_size: parseInt(formData.max_group_size, 10),
      };
      
      await api.post("/api/v1/services/", payload);
      router.push("/guide/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка при создании услуги");
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'guide') return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>← Назад</button>
        <h1>Добавить новую услугу</h1>
      </header>
      
      <div className={styles.formCard}>
        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Название услуги *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              required 
              placeholder="Например, Пешая экскурсия по Бишкеку"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Тип услуги</label>
              <select name="service_type" value={formData.service_type} onChange={handleChange}>
                <option value="tour">Экскурсия</option>
                <option value="transfer">Трансфер</option>
                <option value="photo">Фотосессия</option>
                <option value="food">Гастро-тур</option>
                <option value="adventure">Приключение</option>
                <option value="custom">Индивидуальный маршрут</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Длительность (в часах) *</label>
              <input 
                type="number" 
                step="0.5" 
                name="duration_hours" 
                value={formData.duration_hours} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Краткое описание *</label>
            <input 
              type="text" 
              name="short_description" 
              value={formData.short_description} 
              onChange={handleChange} 
              required 
              maxLength={300}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Полное описание *</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              required 
              rows={6}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Цена *</label>
              <input 
                type="number" 
                name="price" 
                value={formData.price} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <label>Валюта</label>
              <select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="USD">USD</option>
                <option value="KGS">KGS</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Тип цены</label>
              <select name="price_type" value={formData.price_type} onChange={handleChange}>
                <option value="per_person">За человека</option>
                <option value="per_group">За группу</option>
                <option value="per_hour">За час</option>
                <option value="per_day">За день</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Макс. размер группы *</label>
              <input 
                type="number" 
                name="max_group_size" 
                value={formData.max_group_size} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <label>Место встречи</label>
              <input 
                type="text" 
                name="meeting_point" 
                value={formData.meeting_point} 
                onChange={handleChange} 
                placeholder="Где вы встретите туристов"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "Сохранение..." : "Создать услугу"}
          </button>
        </form>
      </div>
    </div>
  );
}
