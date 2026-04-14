'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, type Collection } from '@/lib/api';
import styles from './page.module.css';

export default function CollectionsPage() {
  const { isAuthenticated, getToken, isLoading: authLoading } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setError('Please log in to view your collections.');
      setLoading(false);
      return;
    }

    const token = getToken();
    if (!token) {
      setError('Authentication error. Please log in again.');
      setLoading(false);
      return;
    }

    api.getCollections(token)
      .then((res) => {
        setCollections(res.results);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load collections.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, getToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const token = getToken();
    if (!token) return;

    setCreating(true);
    try {
      await api.createCollection(token, { title: newTitle.trim() });
      setNewTitle('');
      setShowCreate(false);
      // Refresh collections
      const res = await api.getCollections(token);
      setCollections(res.results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create collection.';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.skeleton}>Loading collections...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>My Collections</h1>
            <p className={styles.subtitle}>
              {collections.length} collection{collections.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Collection
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <form className={styles.createForm} onSubmit={handleCreate}>
            <input
              type="text"
              className={styles.createInput}
              placeholder="Collection name (e.g., Restaurants in Paris)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              required
            />
            <div className={styles.createActions}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating || !newTitle.trim()}>
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setShowCreate(false); setNewTitle(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error ? (
          <div className={styles.empty}>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : collections.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
              </svg>
            </div>
            <h3>No collections yet</h3>
            <p>Save your favorite places into themed collections.</p>
            <Link href="/destinations" className="btn btn-secondary">Browse Destinations</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {collections.map((col) => (
              <Link key={col.id} href={`/collections/${col.id}`} className={styles.card}>
                {col.cover_image_url ? (
                  <img
                    src={col.cover_image_url}
                    alt={col.title}
                    className={styles.cardImage}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.cardPlaceholder}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
                    </svg>
                  </div>
                )}
                <div className={styles.cardBody}>
                  <h3>{col.title}</h3>
                  {col.description && <p>{col.description}</p>}
                  <div className={styles.cardMeta}>
                    <span>{col.items_count} item{col.items_count !== 1 ? 's' : ''}</span>
                    {!col.is_public && <span className={styles.privateBadge}>Private</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
