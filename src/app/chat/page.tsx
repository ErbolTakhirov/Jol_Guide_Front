'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import styles from './page.module.css';
interface ItineraryItemSchema {
  time?: string;
  end_time?: string;
  place?: PlaceResult;
  notes?: string;
}

interface ItineraryDaySchema {
  day_number: number;
  title: string;
  items: ItineraryItemSchema[];
}

interface ItinerarySchema {
  title: string;
  destination: string;
  days: ItineraryDaySchema[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  places?: PlaceResult[];
  options?: string[];
  wizard?: WizardSchema;
  wizard_answers?: Record<string, string>;
  itinerary?: ItinerarySchema;
  loading?: boolean;
}

interface PlaceResult {
  name: string;
  slug?: string;
  category: string;
  description: string;
  address?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviews_count?: number;
  price_level?: number;
  tags?: string[];
}

interface WizardStep {
  id: string;
  question: string;
  options: string[];
  allows_free_text?: boolean;
}

interface WizardSchema {
  title: string;
  steps: WizardStep[];
}

interface ChatSession {
  id: string;
  title: string;
  messages_count: number;
  last_message: {
    role: string;
    content: string;
    created_at: string;
  } | null;
  updated_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

const QUICK_PROMPTS = [
  { emoji: '🏔️', text: 'Приключенческий тур по Кыргызстану на 7 дней' },
  { emoji: '🏞️', text: 'Треккинг к озеру Ала-Куль из Каракола' },
  { emoji: '🐴', text: 'Конный поход к Сон-Кулю на 3 дня' },
  { emoji: '🌊', text: 'Отдых на Иссык-Куле, бюджетный вариант' },
  { emoji: '🏙️', text: 'Что посмотреть в Бишкеке за 2 дня?' },
  { emoji: '🦅', text: 'Охота с беркутом и кочевая культура' },
];

function InteractiveWizard({ wizard, disabled, answers, onSubmit }: { wizard: WizardSchema, disabled: boolean, answers?: Record<string, string>, onSubmit: (ans: Record<string, string>) => void }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [showFreeText, setShowFreeText] = useState(false);

  // Safety check for malformed LLM responses
  if (!wizard || !wizard.steps || !Array.isArray(wizard.steps)) {
    return null;
  }

  // If there are saved answers (or it's disabled), render read-only summary
  const finalAnswers = answers || localAnswers;
  if (disabled || Object.keys(finalAnswers).length >= wizard.steps.length) {
    return (
      <div className={styles.wizardCompleted}>
        <div className={styles.wizardCompletedHeader}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
          <h4>{wizard.title} (Завершено)</h4>
        </div>
        <div className={styles.wizardAnswers}>
          {wizard.steps.map((step) => (
             finalAnswers[step.question] ? (
               <div key={step.id} className={styles.wizardAnswerRow}>
                 <strong>{step.question}</strong>
                 <span>{finalAnswers[step.question]}</span>
               </div>
             ) : null
          ))}
        </div>
      </div>
    );
  }

  const step = wizard.steps[currentStepIndex];
  if (!step) return null;

  const handleSelect = (val: string) => {
    const newAnswers = { ...localAnswers, [step.question]: val };
    setLocalAnswers(newAnswers);
    if (currentStepIndex < wizard.steps.length - 1) {
      setCurrentStepIndex(i => i + 1);
      setShowFreeText(false);
      setFreeText("");
    } else {
      onSubmit(newAnswers);
    }
  };

  return (
    <div className={styles.wizardCard}>
      <div className={styles.wizardHeader}>
         <h4>{wizard.title}</h4>
         <span className={styles.wizardProgress}>Шаг {currentStepIndex + 1} из {wizard.steps.length}</span>
      </div>
      <div className={styles.wizardBody}>
         <p className={styles.wizardQuestion}>{step.question}</p>
         
         <div className={styles.optionsGrid}>
           {step.options.map(opt => (
             <button key={opt} className={styles.optionButton} onClick={() => handleSelect(opt)}>{opt}</button>
           ))}
           {step.allows_free_text && !showFreeText && (
             <button className={styles.optionButtonOther} onClick={() => setShowFreeText(true)}>Другое (Написать)</button>
           )}
         </div>

         {showFreeText && (
           <div className={styles.freeTextContainer}>
             <input autoFocus type="text" className={styles.freeTextInput} placeholder="Ваш ответ..." value={freeText} onChange={e => setFreeText(e.target.value)} onKeyDown={e => e.key === 'Enter' && freeText.trim() && handleSelect(freeText.trim())} />
             <button className={styles.freeTextSubmit} disabled={!freeText.trim()} onClick={() => handleSelect(freeText.trim())}>Далее</button>
           </div>
         )}
      </div>
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [autoScrollEnabled]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 100;
    setAutoScrollEnabled(isAtBottom);
  };

  // Create anonymous session on mount
  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = localStorage.getItem('travelai_anon_token');
        if (storedToken) {
          setToken(storedToken);
          return;
        }

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
          localStorage.setItem('travelai_anon_token', data.access);
          setToken(data.access);
        }
      } catch (err) {
        console.error('Could not create anonymous session:', err);
      }
    };
    getToken();
  }, []);

  // Fetch Sessions list
  const fetchSessions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/ai/sessions/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch(err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load a specific session
  const loadSession = async (id: string) => {
    if (!token) return;
    setIsLoadingHistory(true);
    setIsSidebarOpen(false);
    
    try {
      const res = await fetch(`${API_BASE}/ai/sessions/${id}/messages/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load session');
      
      const data = await res.json();
      data.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      const mappedMessages: Message[] = data.map((m: any) => ({
        id: m.id.toString(),
        role: m.role,
        content: m.content || '',
        places: m.structured_data?.places || [],
        options: m.structured_data?.options || [],
        wizard: m.structured_data?.wizard || undefined,
        itinerary: m.structured_data?.itinerary || undefined,
        loading: false
      }));

      setMessages(mappedMessages);
      setSessionId(id);
      
      router.replace(`/chat?session=${id}`, { scroll: false });
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
      setAutoScrollEnabled(true);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    router.replace('/chat', { scroll: false });
    setIsSidebarOpen(false);
  };

  // Handle initial query or session from URL
  useEffect(() => {
    if (!token) return;
    
    const sid = searchParams.get('session');
    if (sid && !sessionId && messages.length === 0) {
      loadSession(sid);
      return;
    }

    const q = searchParams.get('q');
    if (q && messages.length === 0) {
      sendMessage(q);
    }
  }, [searchParams, token]);

  // Sync URL when a new session is created via streaming
  useEffect(() => {
    const currentSessionParam = searchParams.get('session');
    if (sessionId && currentSessionParam !== sessionId) {
      router.replace(`/chat?session=${sessionId}`, { scroll: false });
    }
  }, [sessionId, searchParams, router]);

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
    setAutoScrollEnabled(true);

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
      let sseBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          // SSE events are separated by double newline
          const events = sseBuffer.split('\n\n');
          // Last element may be incomplete — keep it in the buffer
          sseBuffer = events.pop() || '';

          for (const event of events) {
            const lines = event.split('\n');
            let dataLine = '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                dataLine = line.slice(6);
              } else if (line.startsWith('data:')) {
                dataLine = line.slice(5);
              }
            }

            if (!dataLine) continue;

            try {
              const data = JSON.parse(dataLine);

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

              if (data.options) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, options: data.options }
                      : m
                  )
                );
              }

              if (data.wizard) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, wizard: data.wizard }
                      : m
                  )
                );
              }

              if (data.session_id) {
                setSessionId(data.session_id);
              }
            } catch (parseErr) {
              console.warn('Failed to parse SSE data:', parseErr, 'data:', dataLine);
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
      fetchSessions();
    }
  };

  const handleWizardSubmit = (messageId: string, ans: Record<string, string>) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, wizard_answers: ans } : m));
    
    let promptBlock = "Дополнительные ответы:\n";
    for (const [q, a] of Object.entries(ans)) {
      promptBlock += `- ${q}: ${a}\n`;
    }
    
    sendMessage(promptBlock);
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

  const handleSaveTrip = async (itinerary: ItinerarySchema) => {
    if (!token) {
       alert('Пожалуйста, войдите в систему, чтобы сохранить маршрут.');
       router.push('/login');
       return;
    }
    setIsSavingTrip(true);
    try {
      const res = await fetch(`${API_BASE}/trips/import-ai/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itinerary })
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/trips/${data.id}`);
      } else {
        throw new Error('Failed to save trip');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении маршрута');
    } finally {
      setIsSavingTrip(false);
    }
  };

  // Extract the "text" JSON string value by walking characters and tracking escapes.
  // Works on both complete and in-progress (streaming) JSON.
  const extractTextValue = (json: string): string | null => {
    const marker = json.match(/"text"\s*:\s*"/);
    if (!marker || marker.index === undefined) return null;

    const start = marker.index + marker[0].length;
    let result = '';

    for (let i = start; i < json.length; i++) {
      if (json[i] === '\\' && i + 1 < json.length) {
        const next = json[i + 1];
        if (next === 'n') result += '\n';
        else if (next === 't') result += '\t';
        else if (next === '"') result += '"';
        else if (next === '\\') result += '\\';
        else result += next;
        i++;
      } else if (json[i] === '"') {
        return result;
      } else {
        result += json[i];
      }
    }

    // String not closed yet — still streaming
    return result;
  };

  const renderContent = (content: string) => {
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\n?/, '');
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.replace(/```$/, '');
    }

    // Try full JSON parse first (works once streaming is complete)
    try {
      const parsed = JSON.parse(cleanContent);
      if (parsed.text) {
        return (
          <div className={`${styles.msgText} ${styles.markdownBody}`}>
            <ReactMarkdown>{parsed.text}</ReactMarkdown>
          </div>
        );
      }
    } catch {}

    // Fallback: extract "text" value while streaming is in progress
    const extracted = extractTextValue(cleanContent);
    if (extracted) {
      return (
        <div className={`${styles.msgText} ${styles.markdownBody}`}>
          <ReactMarkdown>{extracted}</ReactMarkdown>
        </div>
      );
    }

    // JSON is still arriving but "text" key hasn't appeared yet
    if (cleanContent.startsWith('{')) {
      return <div className={styles.msgText}>...</div>;
    }

    // Plain text (non-JSON response)
    return (
      <div className={`${styles.msgText} ${styles.markdownBody}`}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={`${styles.page} chat-page-wrapper`}>
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.sidebarOverlayOpen : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <button className={styles.newChatBtn} onClick={startNewChat}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Chat
          </button>
        </div>
        <div className={styles.sessionList}>
          {sessions.map(s => (
            <button 
              key={s.id} 
              className={`${styles.sessionItem} ${s.id === sessionId ? styles.sessionItemActive : ''}`}
              onClick={() => loadSession(s.id)}
            >
              <div className={styles.sessionTitle}>{s.title || 'Travel Chat'}</div>
              <div className={styles.sessionDate}>
                {new Date(s.updated_at).toLocaleDateString()}
              </div>
            </button>
          ))}
          {sessions.length === 0 && (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
              No previous chats
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.chatMain}>
        {/* Mobile Hamburger toggle */}
        <button className={styles.mobileToggle} onClick={() => setIsSidebarOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        <div className={styles.chatContainer}>
          {/* Messages Area */}
          <div className={styles.messages} ref={messagesContainerRef} onScroll={handleScroll}>
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
              <h2 className={styles.welcomeTitle}>Откройте Кыргызстан вместе с Jol Guide</h2>
              <p className={styles.welcomeSubtitle}>
                Спросите о маршрутах, достопримечательностях, отелях, ресторанах и активностях по всему Кыргызстану.
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
                      <>
                        {renderContent(msg.content)}
                        
                        {/* Interactive Wizard */}
                        {msg.wizard && (
                          <InteractiveWizard 
                            wizard={msg.wizard} 
                            disabled={isStreaming || !!msg.wizard_answers} 
                            answers={msg.wizard_answers}
                            onSubmit={(ans) => handleWizardSubmit(msg.id, ans)} 
                          />
                        )}

                        {/* Options Buttons */}
                        {!msg.wizard && Array.isArray(msg.options) && msg.options.length > 0 && (
                          <div className={styles.optionsGrid}>
                            {msg.options.map((opt, i) => (
                              <button
                                key={i}
                                className={styles.optionButton}
                                onClick={() => sendMessage(opt)}
                                disabled={isStreaming}
                              >
                                {opt}
                              </button>
                            ))}
                            <button
                              className={styles.optionButtonOther}
                              onClick={() => inputRef.current?.focus()}
                              disabled={isStreaming}
                            >
                              Другое (Написать)
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Place cards */}
                    {msg.places && Array.isArray(msg.places) && msg.places.length > 0 && (
                      <div className={styles.placesGrid}>
                        {msg.places.map((place, i) => {
                          const card = (
                            <div key={i} className={`${styles.placeCard} ${place.slug ? styles.placeCardClickable : ''}`}>
                              <div className={styles.placeHeader}>
                                <span className={styles.placeCategory}>{place.category}</span>
                                <div className={styles.placeHeaderRight}>
                                  {place.price_level != null && place.price_level > 0 && (
                                    <span className={styles.placePrice}>{'$'.repeat(place.price_level)}</span>
                                  )}
                                  {place.rating && (
                                    <span className={styles.placeRating}>★ {place.rating}</span>
                                  )}
                                </div>
                              </div>
                              <h4 className={styles.placeName}>{place.name}</h4>
                              <p className={styles.placeLocation}>
                                {place.address || `${place.city}, ${place.country}`}
                              </p>
                              <p className={styles.placeDesc}>{place.description}</p>
                              {place.reviews_count != null && place.reviews_count > 0 && (
                                <p className={styles.placeReviews}>{place.reviews_count} reviews</p>
                              )}
                              {place.tags && (
                                <div className={styles.placeTags}>
                                  {place.tags.slice(0, 4).map((t) => (
                                    <span key={t} className={styles.placeTag}>{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                          return place.slug ? (
                            <Link key={i} href={`/place/${place.slug}`} className={styles.placeCardLink}>
                              {card}
                            </Link>
                          ) : card;
                        })}
                      </div>
                    )}

                    {/* Itinerary Display */}
                    {msg.itinerary && (
                      <div className={styles.itineraryCard}>
                        <div className={styles.itineraryHeader}>
                          <div>
                            <h4>{msg.itinerary.title}</h4>
                            <span className={styles.itineraryDest}>{msg.itinerary.destination}</span>
                          </div>
                        </div>
                        <div className={styles.itineraryBody}>
                          {msg.itinerary.days?.map(day => (
                            <div key={day.day_number} className={styles.itineraryDay}>
                              <div className={styles.itineraryDayTitle}>
                                День {day.day_number}: {day.title}
                              </div>
                              {day.items.map((item, idx) => (
                                <div key={idx} className={styles.itineraryItem}>
                                  <div className={styles.itineraryTime}>
                                    {item.time || ''} {item.end_time ? `- ${item.end_time}` : ''}
                                  </div>
                                  <div className={styles.itineraryDetails}>
                                    <strong>{item.place?.name || 'Активность'}</strong>
                                    {item.notes && <p>{item.notes}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                          <button 
                            className={styles.saveTripBtn} 
                            onClick={() => handleSaveTrip(msg.itinerary!)}
                            disabled={isSavingTrip}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                              <polyline points="17 21 17 13 7 13 7 21"></polyline>
                              <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            {isSavingTrip ? 'Сохранение...' : 'Сохранить тур в Мои Поездки'}
                          </button>
                        </div>
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
              placeholder="Спросите о путешествии по Кыргызстану..."
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
            Рекомендации основаны на реальных данных. Уточняйте детали перед бронированием.
          </p>
        </div>
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
