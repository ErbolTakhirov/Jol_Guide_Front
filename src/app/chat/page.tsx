'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import styles from './page.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  places?: PlaceResult[];
  options?: string[];
  wizard?: WizardSchema;
  wizard_answers?: Record<string, string>;
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
  { emoji: '🏛️', text: '3 days in Rome on a budget' },
  { emoji: '🌊', text: 'Beach vacation in Bali for a week' },
  { emoji: '🏔️', text: 'Adventure trip to Kyrgyzstan' },
  { emoji: '🍣', text: 'Food tour in Tokyo, 5 days' },
  { emoji: '💑', text: 'Romantic weekend in Paris' },
  { emoji: '🎒', text: 'Backpacking in Southeast Asia, 2 weeks' },
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

  // Parse markdown-like content
  const renderContent = (content: string) => {
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\n?/, '');
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.replace(/```$/, '');
    }

    // Try full JSON parse
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

    // Fallback: extract text during streaming
    const match = cleanContent.match(/"text"\s*:\s*"([\s\S]*)/);
    if (match && match[1]) {
      let extracted = match[1];
      const nextKeyMatch = extracted.match(/",\s*"(?:itinerary|places|options)"\s*:/);
      if (nextKeyMatch && nextKeyMatch.index !== undefined) {
        extracted = extracted.substring(0, nextKeyMatch.index);
      } else {
        if (extracted.endsWith('"') && !extracted.endsWith('\\"')) {
          extracted = extracted.slice(0, -1);
        }
      }
      const unescaped = extracted
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
      return (
        <div className={`${styles.msgText} ${styles.markdownBody}`}>
          <ReactMarkdown>{unescaped}</ReactMarkdown>
        </div>
      );
    }

    if (cleanContent.startsWith('{')) {
      return <div className={styles.msgText}>...</div>;
    }

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
