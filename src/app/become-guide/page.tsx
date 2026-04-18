"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./become-guide.module.css";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function BecomeGuidePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    city: "",
    bio: "",
    languages: "Русский, English",
    phone: "",
    whatsapp: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        location_city: formData.city,
        bio: formData.bio,
        languages: formData.languages.split(",").map(l => l.trim()),
        phone: formData.phone,
        whatsapp: formData.whatsapp
      };
      
      await api.post("/api/v1/guides/become_guide/", payload);
      // Ensure the user gets re-fetched to update role to 'guide'
      // router.push("/guide/dashboard");
      window.location.href = "/guide/dashboard";
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Пожалуйста, зарегистрируйтесь или войдите в систему");
      } else {
        setError(err.response?.data?.detail || "Ошибка при регистрации гида");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role === 'anon') {
    return (
      <div className={styles.container}>
        <div className={styles.unAuth}>
          <h2>Необходима регистрация</h2>
          <p>Чтобы стать гидом, создайте аккаунт или войдите.</p>
          <button onClick={() => router.push("/login")} className={styles.submitBtn}>
            Войти / Регистрация
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1>Стать гидом</h1>
        <p className={styles.subtitle}>
          Делитесь своей страстью к путешествиям и зарабатывайте вместе с TravelAI.
        </p>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Ваш город *</label>
            <input 
              type="text" 
              name="city" 
              value={formData.city} 
              onChange={handleChange} 
              required 
              placeholder="Например, Бишкек"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Расскажите о себе (Био) *</label>
            <textarea 
              name="bio" 
              value={formData.bio} 
              onChange={handleChange} 
              required 
              rows={4}
              placeholder="Какой у вас опыт? Почему вы любите свой город?"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Языки (через запятую) *</label>
            <input 
              type="text" 
              name="languages" 
              value={formData.languages} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Номер телефона *</label>
            <input 
              type="tel" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              required 
              placeholder="+996..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>WhatsApp</label>
            <input 
              type="tel" 
              name="whatsapp" 
              value={formData.whatsapp} 
              onChange={handleChange} 
              placeholder="+996..."
            />
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "Отправка..." : "Зарегистрироваться профиль гида"}
          </button>
        </form>
      </div>
    </div>
  );
}
