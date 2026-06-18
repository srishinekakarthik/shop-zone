// frontend/src/components/common/ChatBot.js
// ShopZone LangChain-powered customer support chat widget

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

const CHATBOT_URL = process.env.REACT_APP_CHATBOT_URL || 'http://localhost:5001';

const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm ShopZone Assistant. I can help you with products, orders, returns, and more. How can I help you today?",
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const QUICK_PROMPTS = [
  'Track my order',
  'Return policy',
  'Payment methods',
  'Contact support',
];

export default function ChatBot() {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState([WELCOME_MSG]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError]         = useState(null);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const msg = text.trim();
    if (!msg || loading) return;

    setError(null);
    setInput('');
    setMessages(prev => [...prev, {
      id:   Date.now(),
      role: 'user',
      text: msg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setLoading(true);

    try {
      const res = await fetch(`${CHATBOT_URL}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, sessionId }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();

      if (!sessionId) setSessionId(data.sessionId);

      setMessages(prev => [...prev, {
        id:      Date.now() + 1,
        role:    'assistant',
        text:    data.answer,
        sources: data.sources,
        time:    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      setError('Unable to reach support. Please try again.');
      setMessages(prev => [...prev, {
        id:   Date.now() + 1,
        role: 'assistant',
        text: "Sorry, I'm having trouble connecting right now. Please try again in a moment or email us at support@shopzone.in",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = async () => {
    if (sessionId) {
      await fetch(`${CHATBOT_URL}/api/chat/${sessionId}`, { method: 'DELETE' }).catch(() => {});
    }
    setMessages([WELCOME_MSG]);
    setSessionId(null);
    setError(null);
  };

  return (
    <>
      {/* ── Floating Toggle Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:     'fixed',
          bottom:       '24px',
          right:        '24px',
          width:        '64px',
          height:       '64px',
          borderRadius: '50%',
          background:   '#1e40af',
          border:       'none',
          cursor:       'pointer',
          boxShadow:    '0 4px 20px rgba(30,64,175,0.4)',
          fontSize:     '16px',
          fontWeight:   'bold',
          color:        'white',
          zIndex:       9999,
          transition:   'transform 0.2s',
          transform:    open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        title="ShopZone Support"
      >
        {open ? (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* ── Chat Window ── */}
      {open && (
        <div style={{
          position:     'fixed',
          bottom:       '92px',
          right:        '24px',
          width:        '360px',
          maxHeight:    '560px',
          background:   'white',
          borderRadius: '16px',
          boxShadow:    '0 8px 40px rgba(0,0,0,0.18)',
          display:      'flex',
          flexDirection:'column',
          zIndex:       9998,
          overflow:     'hidden',
          fontFamily:   'system-ui, -apple-system, sans-serif',
        }}>

          {/* Header */}
          <div style={{
            background:    '#1e40af',
            color:         'white',
            padding:       '14px 16px',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2"/>
                  <circle cx="12" cy="5" r="2"/>
                  <path d="M12 7v4"/>
                  <line x1="8" y1="16" x2="8" y2="16"/>
                  <line x1="16" y1="16" x2="16" y2="16"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>ShopZone Support</div>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>
                  <span style={{
                    display: 'inline-block', width: '7px', height: '7px',
                    borderRadius: '50%', background: '#4ade80', marginRight: '4px',
                  }}/>
                  Online · Powered by AI
                </div>
              </div>
            </div>
            <button
              onClick={clearChat}
              title="Clear chat"
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: 'white', borderRadius: '6px', padding: '4px 8px',
                cursor: 'pointer', fontSize: '11px',
              }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex:       1,
            overflowY: 'auto',
            padding:   '12px',
            background: '#f8fafc',
            display:   'flex',
            flexDirection: 'column',
            gap:        '8px',
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display:       'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap:           '8px',
                alignItems:    'flex-end',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: '#1e40af', color: 'white', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="10" rx="2"/>
                      <circle cx="12" cy="5" r="2"/>
                      <path d="M12 7v4"/>
                      <line x1="8" y1="16" x2="8" y2="16"/>
                      <line x1="16" y1="16" x2="16" y2="16"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth:     '78%',
                  background:   msg.role === 'user' ? '#1e40af' : 'white',
                  color:        msg.role === 'user' ? 'white' : '#1e293b',
                  borderRadius: msg.role === 'user'
                    ? '14px 14px 2px 14px'
                    : '14px 14px 14px 2px',
                  padding:      '10px 13px',
                  fontSize:     '13.5px',
                  lineHeight:   '1.5',
                  boxShadow:    '0 1px 4px rgba(0,0,0,0.08)',
                }}>
                  <div className="markdown-body" style={{ margin: 0, padding: 0 }}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  <div style={{
                    fontSize: '10px',
                    opacity:  0.6,
                    marginTop:'4px',
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}>{msg.time}</div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#1e40af', color: 'white', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2"/>
                    <circle cx="12" cy="5" r="2"/>
                    <path d="M12 7v4"/>
                    <line x1="8" y1="16" x2="8" y2="16"/>
                    <line x1="16" y1="16" x2="16" y2="16"/>
                  </svg>
                </div>
                <div style={{
                  background: 'white', borderRadius: '14px 14px 14px 2px',
                  padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>
                  <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: '#94a3b8',
                        animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                      }}/>
                    ))}
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div style={{
                textAlign: 'center', color: '#ef4444', fontSize: '11px', padding: '4px 0'
              }}>
                {error}
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div style={{
              padding: '8px 12px', background: 'white',
              borderTop: '1px solid #e2e8f0',
              display: 'flex', gap: '6px', flexWrap: 'wrap',
            }}>
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    color: '#1e40af', borderRadius: '20px',
                    padding: '4px 10px', fontSize: '11.5px',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            background: 'white',
            borderTop: '1px solid #e2e8f0',
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={loading}
              style={{
                flex: 1, border: '1px solid #e2e8f0',
                borderRadius: '24px', padding: '9px 14px',
                fontSize: '13.5px', outline: 'none',
                background: loading ? '#f8fafc' : 'white',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: input.trim() && !loading ? '#1e40af' : '#e2e8f0',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                color: 'white', transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
