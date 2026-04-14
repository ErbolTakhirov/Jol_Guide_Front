'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  places?: PlaceResult[];
  loading?: boolean;
}

interface PlaceResult {
  name: string;
  category: string;
  description: string;
  city: string;
  country: string;
  rating?: number;
  price_level?: number;
  tags?: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

const QUICK_PROMPTS = [
  { emoji: '🏛️', text: '3 days in Rome on a budget' },
  { emoji: '🌊', text: 'Beach vacation in Bali for a week' },
  { emoji: '🏔️', text: 'Adventure trip to Kyrgyzstan' },
  { emoji: '🍣', text: 'Food tour in Tokyo, 5 days' },
  { emoji: '💑', text: 'Romantic weekend in Paris' },
  { emoji: '🎒', text: 'Backpacking in Southeast Asia, 2 weeks' },
];

function ChatContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Create anonymous session on mount
  useEffect(() => {
    const getToken = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/anonymous/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          console.error('Anonymous session creation failed:', res.status);
          return;
        }
        const data = await res.json();
        if (data.access) {
          setToken(data.access);
        }
      } catch (err) {
        console.error('Could not create anonymous session:', err);
      }
    };
    getToken();
  }, []);

  // Handle initial query from URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && token && messages.length === 0) {
      sendMessage(q);
    }
  }, [searchParams, token]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/ai/chat/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text.trim(),
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let places: PlaceResult[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                // Handle both "data: " (with space) and "data:" (without space)
                const jsonStr = line.startsWith('data: ') ? line.slice(6) : line.slice(5);
                const data = JSON.parse(jsonStr);

                if (data.content) {
                  fullContent += data.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: fullContent, loading: false }
                        : m
                    )
                  );
                }

                if (data.places) {
                  places = data.places;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, places }
                        : m
                    )
                  );
                }

                if (data.session_id) {
                  setSessionId(data.session_id);
                }
              } catch (parseErr) {
                console.warn('Failed to parse SSE data:', parseErr, 'line:', line);
              }
            }
          }
        }
      }

      // If no streaming happened, show fallback
      if (!fullContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'I\'m ready to help you plan! Please configure API key for full AI features.', loading: false }
              : m
          )
        );
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: 'Sorry, I couldn\'t process your request. Please make sure the backend server is running.', loading: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Parse markdown-like content
  const renderContent = (content: string) => {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(content);
      if (parsed.text) {
        return <div className={styles.msgText}>{parsed.text}</div>;
      }
    } catch {}

    return <div className={styles.msgText}>{content}</div>;
  };

  return (
    <div className={styles.page}>
      <div className={styles.chatContainer}>
        {/* Messages Area */}
        <div className={styles.messages}>
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#chatGrad)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                  <defs>
                    <linearGradient id="chatGrad" x1="2" y1="5" x2="22" y2="19">
                      <stop stopColor="#6366f1"/>
                      <stop offset="1" stopColor="#a855f7"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className={styles.welcomeTitle}>How can I help you travel?</h2>
              <p className={styles.welcomeSubtitle}>
                Ask me anything about destinations, itineraries, restaurants, hotels, or activities.
              </p>
              <div className={styles.quickPrompts}>
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    className={styles.quickPrompt}
                    onClick={() => sendMessage(p.text)}
                  >
                    <span className={styles.promptEmoji}>{p.emoji}</span>
                    {p.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg}`}
                >
                  {msg.role === 'assistant' && (
                    <div className={styles.avatar}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25"/>
                      </svg>
                    </div>
                  )}
                  <div className={styles.msgContent}>
                    {msg.loading ? (
                      <div className={styles.typing}>
                        <span/><span/><span/>
                      </div>
                    ) : (
                      renderContent(msg.content)
                    )}

                    {/* Place cards */}
                    {msg.places && msg.places.length > 0 && (
                      <div className={styles.placesGrid}>
                        {msg.places.map((place, i) => (
                          <div key={i} className={styles.placeCard}>
                            <div className={styles.placeHeader}>
                              <span className={styles.placeCategory}>{place.category}</span>
                              {place.rating && (
                                <span className={styles.placeRating}>★ {place.rating}</span>
                              )}
                            </div>
                            <h4 className={styles.placeName}>{place.name}</h4>
                            <p className={styles.placeLocation}>{place.city}, {place.country}</p>
                            <p className={styles.placeDesc}>{place.description}</p>
                            {place.tags && (
                              <div className={styles.placeTags}>
                                {place.tags.slice(0, 3).map((t) => (
                                  <span key={t} className={styles.placeTag}>{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className={styles.inputArea}>
          <form className={styles.inputForm} onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className={styles.input}
              placeholder="Ask about your next trip..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
            />
            <button
              type="submit"
              className={`${styles.sendBtn} ${input.trim() ? styles.sendActive : ''}`}
              disabled={!input.trim() || isStreaming}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </form>
          <p className={styles.disclaimer}>
            AI can make mistakes. Verify important travel info independently.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />}>
      <ChatContent />
    </Suspense>
  );
}
