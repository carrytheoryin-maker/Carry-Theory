import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, RotateCcw, Send, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'ct-welcome',
  role: 'model',
  text: 'Welcome to Carry Theory. I am trained exclusively on Carry Theory products, stock availability, customisation, shipping, payments, and store policies—how may I assist you?',
};

const QUICK_PROMPTS = [
  'Which tumblers & travel mugs are in stock?',
  'How does ₹50 customisation work?',
  'What are delivery charges & payment options?',
];

export function ConciergeChat() {
  const { cartOpen } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && cartOpen) {
      setOpen(false);
    }
  }, [cartOpen, open]);

  useEffect(() => {
    if (!open) return;
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, error, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;

    const historyForRequest = messages
      .filter((m) => m.id !== WELCOME_MESSAGE.id)
      .map((m) => ({ role: m.role, text: m.text }));

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyForRequest,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg =
          typeof payload?.error === 'string' && payload.error.trim()
            ? payload.error
            : 'Unable to reach Carry Theory concierge right now.';
        throw new Error(errMsg);
      }

      const replyText =
        typeof payload?.reply === 'string' && payload.reply.trim()
          ? payload.reply.trim()
          : '';
      if (!replyText) {
        throw new Error('The concierge did not return a response. Please try again.');
      }

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'model',
        text: replyText,
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach Carry Theory concierge right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleReset = () => {
    if (loading) return;
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    setInput('');
    inputRef.current?.focus();
  };

  if (cartOpen) return null;

  const hasUserTurns = messages.some((m) => m.role === 'user');

  return (
    <>
      {/* Launcher Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Carry Theory AI Concierge"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 border border-[#C6A77A]/60 bg-[#0B0B0B]/95 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#F5F3EF] shadow-[0_12px_32px_rgba(0,0,0,0.65)] transition-colors hover:border-[#C6A77A] hover:bg-[#141414] hover:text-[#C6A77A] cursor-pointer"
        >
          <MessageSquare className="h-4 w-4 text-[#C6A77A]" strokeWidth={1.7} />
          <span>Ask Concierge</span>
        </button>
      )}

      {/* Floating Concierge Drawer */}
      {open && (
        <section
          role="dialog"
          aria-label="Carry Theory AI Concierge"
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-5 sm:right-5 z-40 flex concierge-panel-height max-h-[560px] sm:w-[390px] flex-col border border-[#C6A77A]/40 bg-[#0B0B0B] text-[#F5F3EF] shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#F5F3EF]/12 bg-[#121212] px-4 py-3.5 shrink-0">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
                Carry Theory
              </p>
              <h2 className="mt-0.5 font-display text-xs font-semibold uppercase tracking-[0.18em] text-[#F5F3EF]">
                Brand &amp; Store Concierge
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                aria-label="Reset conversation"
                title="New conversation"
                className="flex h-8 w-8 items-center justify-center text-[#F5F3EF]/65 hover:text-[#C6A77A] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.6} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Carry Theory Concierge"
                className="flex h-8 w-8 items-center justify-center text-[#F5F3EF]/65 hover:text-[#F5F3EF] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'border border-[#C6A77A]/45 bg-[#1B1814] text-[#F5F3EF]'
                      : 'border border-[#F5F3EF]/12 bg-[#121212] text-[#F5F3EF]/90'
                  }`}
                >
                  <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.22em] text-[#C6A77A]">
                    {msg.role === 'user' ? 'You' : 'Carry Theory'}
                  </p>
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Suggested Carry Theory Questions (before user sends first message) */}
            {!hasUserTurns && !loading && (
              <div className="pt-1 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#F5F3EF]/45">
                  Quick Topics
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="border border-[#F5F3EF]/14 bg-[#121212] px-3 py-2 text-left text-xs text-[#F5F3EF]/82 hover:border-[#C6A77A]/60 hover:text-[#C6A77A] transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-start">
                <div className="border border-[#F5F3EF]/12 bg-[#121212] px-3.5 py-2.5 text-xs uppercase tracking-[0.18em] text-[#C6A77A]">
                  Checking Carry Theory catalog...
                </div>
              </div>
            )}

            {/* Real Error Display */}
            {error && (
              <div
                role="alert"
                className="border border-[#FF8A3D]/45 bg-[#FF8A3D]/10 px-3.5 py-2.5 text-xs leading-relaxed text-[#F5F3EF]"
              >
                <p className="font-medium uppercase tracking-[0.18em] text-[#FF8A3D]">
                  Concierge Notice
                </p>
                <p className="mt-1 text-[#F5F3EF]/85">{error}</p>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-[#F5F3EF]/12 bg-[#121212] p-3 shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Carry Theory products or orders..."
                maxLength={600}
                disabled={loading}
                className="min-w-0 flex-1 border border-[#F5F3EF]/18 bg-[#0B0B0B] px-3 py-2.5 text-base sm:text-sm text-[#F5F3EF] placeholder:text-[#F5F3EF]/40 focus:border-[#C6A77A] focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-[42px] shrink-0 items-center justify-center bg-[#F5F3EF] px-3.5 text-[#0B0B0B] hover:bg-[#C6A77A] disabled:opacity-40 disabled:hover:bg-[#F5F3EF] transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-[#F5F3EF]/40">
              Answers Carry Theory brand, catalog &amp; website queries only.
            </p>
          </form>
        </section>
      )}
    </>
  );
}
