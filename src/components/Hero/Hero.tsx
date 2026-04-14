'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Hero.module.css';

const SUGGESTIONS = [
  '3 days in Istanbul on a budget 🇹🇷',
  'Romantic week in Paris for two 🇫🇷',
  'Adventure trip to Bishkek & Issyk-Kul 🇰🇬',
  'Best hidden gems in Tokyo 🇯🇵',
  'Family vacation in Bali 🇮🇩',
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
          AI-Powered Travel Planning
        </div>

        <h1 className={styles.title}>
          Your next adventure<br />
          starts with <span className={styles.highlight}>one question</span>
        </h1>

        <p className={styles.subtitle}>
          Tell our AI where you want to go. Get a personalized itinerary with restaurants, 
          hotels, activities — all in seconds.
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
            placeholder="Where do you want to go? Try 'A week in Kyoto'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <button type="submit" className={`btn btn-primary ${styles.searchBtn}`}>
            Plan My Trip
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </form>

        <div className={styles.suggestions}>
          <span className={styles.suggestionsLabel}>Try:</span>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className={styles.suggestionChip} onClick={() => handleSuggestion(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>40+</span>
            <span className={styles.statLabel}>Destinations</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>10K+</span>
            <span className={styles.statLabel}>Places</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>AI</span>
            <span className={styles.statLabel}>Powered by Gemini</span>
          </div>
        </div>
      </div>
    </section>
  );
}
