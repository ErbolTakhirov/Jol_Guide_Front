'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    window.location.href = '/';
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L3 9v10l11 7 11-7V9L14 2z" stroke="url(#grad)" strokeWidth="2" fill="none"/>
              <path d="M14 8l-5 3v6l5 3 5-3v-6l-5-3z" fill="url(#grad)" opacity="0.3"/>
              <circle cx="14" cy="14" r="3" fill="url(#grad)"/>
              <defs>
                <linearGradient id="grad" x1="3" y1="2" x2="25" y2="26">
                  <stop stopColor="#6366f1"/>
                  <stop offset="1" stopColor="#a855f7"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className={styles.logoText}>TravelAI</span>
        </Link>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <Link href="/destinations" className={styles.navLink}>Destinations</Link>
          <Link href="/trips" className={styles.navLink}>My Trips</Link>
          <Link href="/collections" className={styles.navLink}>Collections</Link>
          <Link href="/chat" className={styles.navLink}>AI Chat</Link>
        </nav>

        <div className={styles.actions}>
          {isLoading ? (
            <div className={styles.loading} />
          ) : isAuthenticated ? (
            <>
              <span className={styles.userName}>{user?.display_name || user?.email}</span>
              <Link href="/trips" className="btn btn-ghost btn-sm">My Trips</Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>

        <button 
          className={styles.burger} 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span/>
          <span/>
          <span/>
        </button>
      </div>
    </header>
  );
}
