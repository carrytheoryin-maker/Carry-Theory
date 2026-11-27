import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

const STARTER_PROMPTS = [
  'What is currently in stock?',
  'Shipping & payment options?',
  'How does customisation work?',
];

const INITIAL_GREETING: ChatMessage = {
  id: 'ct-welcome',
  role: 'model',
  text: 'Welcome to Carry Theory. Ask me anything about our tumblers, travel mugs, ceramic mugs, MagSafe wallets, digital focus clock, stock availability, shipping, or payments.',
};

export function CarryTheoryChat() {
  const { cartOpen } = useStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  if (cartOpen) return null;

  async function sendMessage(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const historyForApi = messages
      .filter((m) => m.id !== INITIAL_GREETING.id && !m.isError)
      .slice(-10)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'Live chat service is unavailable on this static preview. For quick assistance, reach us via WhatsApp (+91 73000 04000) or carrytheoryin@gmail.com.'
        );
      }

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(
          data.error || 'Unable to get a response right now. Please try again shortly.'
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: data.reply as string,
        },
      ]);
    } catch (err) {
      const errMessage =
        err instanceof Error
          ? err.message
          : 'Unable to reach the Carry Theory assistant right now.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: errMessage,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  const showStarterChips = messages.length === 1 && !loading;

  return (
    <div
      className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {open ? (
        <section
          role="dialog"
          aria-label="Carry Theory Concierge"
          className="flex w-[calc(100vw-1.5rem)] sm:w-[390px] max-h-[min(78vh,560px)] flex-col border border-[#C6A77A]/35 bg-[#0B0B0B] text-[#F5F3EF] shadow-[0_24px_60px_rgba(0,0,0,0.75)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#F5F3EF]/12 bg-[#121212] px-4 py-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#C6A77A]/40 bg-[#0B0B0B] text-[#C6A77A]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-[#F5F3EF]">
                  Carry Theory Concierge
                </p>
                <p className="text-[11px] text-[#C6A77A]/85 truncate">
                  Product, stock &amp; order guidance
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Carry Theory chat"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-[#F5F3EF]/65 hover:text-[#C6A77A] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-[#0B0B0B]">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#C6A77A] text-[#0B0B0B] font-medium'
                        : msg.isError
                          ? 'border border-[#FF8A3D]/40 bg-[#18120E] text-[#F5F3EF]/90'
                          : 'border border-[#F5F3EF]/12 bg-[#141414] text-[#F5F3EF]/90'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {showStarterChips && (
              <div className="flex flex-wrap gap-2 pt-1">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="border border-[#C6A77A]/35 bg-[#121212] px-3 py-1.5 text-left text-xs text-[#F5F3EF]/85 hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="border border-[#F5F3EF]/12 bg-[#141414] px-3.5 py-2.5 text-xs uppercase tracking-[0.18em] text-[#C6A77A]">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-[#F5F3EF]/12 bg-[#121212] p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Carry Theory..."
              maxLength={600}
              disabled={loading}
              aria-label="Ask a Carry Theory question"
              className="flex-1 min-w-0 border border-[#F5F3EF]/18 bg-[#0B0B0B] px-3 py-2.5 text-base sm:text-sm text-[#F5F3EF] placeholder:text-[#F5F3EF]/40 focus:border-[#C6A77A] focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#F5F3EF] text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Carry Theory Concierge chat"
          className="group flex items-center gap-2.5 border border-[#C6A77A]/55 bg-[#0B0B0B]/95 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5F3EF] shadow-[0_14px_34px_rgba(0,0,0,0.65)] hover:border-[#C6A77A] hover:bg-[#C6A77A] hover:text-[#0B0B0B] transition-colors cursor-pointer"
        >
          <MessageSquare className="h-4 w-4 text-[#C6A77A] group-hover:text-[#0B0B0B] transition-colors" />
          <span>Ask Carry Theory</span>
        </button>
      )}
    </div>
  );
}
