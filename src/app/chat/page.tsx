'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const quickSuggestions = [
  'Am I overtraining?',
  'What should I eat today?',
  "How's my recovery?",
  'Help me sleep better',
];

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-md w-fit" style={{ backgroundColor: 'var(--bg-card)' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full animate-bounce"
          style={{
            backgroundColor: 'var(--text-muted)',
            animationDelay: `${i * 150}ms`,
            animationDuration: '600ms',
          }}
        />
      ))}
    </div>
  );
}

function WelcomeCard({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8">
      <div
        className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="text-4xl mb-3">🤖⚽</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Hey! I'm Coach AI
        </h2>
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
          I'm your personal football fitness assistant. I can see your training, nutrition, sleep,
          and recovery data — so just ask me anything!
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {quickSuggestions.map((text) => (
            <button
              key={text}
              onClick={() => onSuggestionClick(text)}
              className="text-xs font-medium px-3 py-2 rounded-full transition-all active:scale-95"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                opacity: 0.9,
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '1')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '0.9')}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fadeIn`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'
        }`}
        style={{
          backgroundColor: isUser ? 'var(--accent)' : 'var(--bg-card)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border)',
        }}
      >
        {message.content}
      </div>
      <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
        {formatTime(message.created_at)}
      </span>
    </div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex flex-col items-start animate-fadeIn">
      <div
        className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl rounded-bl-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        {content}
        <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm align-middle" style={{ backgroundColor: 'var(--accent)' }} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [hasFetched, setHasFetched] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch existing messages on mount
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch('/api/chat');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data);
          }
        }
      } catch {
        // API doesn't exist yet — start with empty messages
      } finally {
        setHasFetched(true);
      }
    }
    fetchMessages();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: Message = {
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setStreamingMessage('');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullResponse += chunk;
          setStreamingMessage(fullResponse);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: fullResponse,
            created_at: new Date().toISOString(),
          },
        ]);
        setStreamingMessage('');
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
            created_at: new Date().toISOString(),
          },
        ]);
        setStreamingMessage('');
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showWelcome = hasFetched && messages.length === 0 && !isLoading;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>

      <div
        className="flex flex-col"
        style={{
          height: 'calc(100dvh - 60px - 56px)',
          marginLeft: '-1rem',
          marginRight: '-1rem',
          marginTop: '-1rem',
          marginBottom: '-1rem',
        }}
      >
        {/* Chat messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {showWelcome ? (
            <WelcomeCard onSuggestionClick={sendMessage} />
          ) : (
            <div className="flex flex-col gap-3 max-w-lg mx-auto">
              {messages.map((msg, i) => (
                <MessageBubble key={`${msg.created_at}-${i}`} message={msg} />
              ))}
              {streamingMessage && <StreamingBubble content={streamingMessage} />}
              {isLoading && !streamingMessage && (
                <div className="animate-fadeIn">
                  <TypingIndicator />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          className="shrink-0 px-4 py-3"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-lg mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Coach AI..."
              rows={1}
              className="flex-1 resize-none text-sm px-4 py-2.5 rounded-2xl outline-none transition-colors placeholder:opacity-50"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                maxHeight: '80px',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
