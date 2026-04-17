'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Hero.module.css';

const SUGGESTIONS = [
  'Приключенческий тур по Кыргызстану 🏔️',
  'Неделя на Иссык-Куле с семьёй 🌊',
  'Треккинг к Сон-Кулю и Ала-Куль 🥾',
  'Что посмотреть в Бишкеке и Оше 🏛️',
  'Конный поход и юрты — кочевая культура 🐴',
];

export default function Hero() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/chat?q=${encodeURIComponent(query)}`);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    router.push(`/chat?q=${encodeURIComponent(suggestion)}`);
  };

  return (
    <section className={styles.hero}>
      {/* Animated background mesh */}
      <div className={styles.meshBg} />
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      <div className={`container ${styles.content}`}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          AI-гид по Кыргызстану
        </div>

        <h1 className={styles.title}>
          Ваше приключение<br />
          начинается с <span className={styles.highlight}>одного вопроса</span>
        </h1>

        <p className={styles.subtitle}>
          Расскажите нашему AI, куда хотите поехать. Получите персональный маршрут с реальными отелями,
          ресторанами и активностями за считанные секунды.
        </p>

        <form className={`${styles.searchBox} ${focused ? styles.searchFocused : ''}`} onSubmit={handleSubmit}>
          <div className={styles.searchIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Куда хотите поехать? Попробуйте 'Неделя на Иссык-Куле'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <button type="submit" className={`btn btn-primary ${styles.searchBtn}`}>
            Спланировать
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </form>

        <div className={styles.suggestions}>
          <span className={styles.suggestionsLabel}>Попробуйте:</span>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className={styles.suggestionChip} onClick={() => handleSuggestion(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>11</span>
            <span className={styles.statLabel}>Направлений</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>45+</span>
            <span className={styles.statLabel}>Реальных мест</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>AI</span>
            <span className={styles.statLabel}>На основе данных</span>
          </div>
        </div>
      </div>
    </section>
  );
}
