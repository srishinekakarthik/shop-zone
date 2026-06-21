// src/components/common/AssistantChat.js
// Shared chat UI for the Gemini LangGraph business assistant, used by
// both AdminDashboard (platform-wide scope) and SupplierDashboard
// (own-store scope). Scoping itself happens entirely server-side in
// backend/lib/agent.js based on the caller's verified role — this
// component has no knowledge of or control over that boundary, it just
// posts the question to POST /api/assistant and renders the answer.
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { assistantAPI } from '../../api/services';

export default function AssistantChat({ suggestions = [], placeholder, storageKey }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [threadId, setThreadId] = useState(() => sessionStorage.getItem(storageKey) || null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0 || loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const ask = async (question) => {
    const q = question.trim();
    if (!q || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q, id: Date.now() }]);
    setLoading(true);

    try {
      const res = await assistantAPI.ask(q, threadId);
      if (!threadId) {
        setThreadId(res.data.threadId);
        sessionStorage.setItem(storageKey, res.data.threadId);
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.data.answer,
        toolsUsed: res.data.toolsUsed,
        id: Date.now() + 1,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: err.response?.data?.error || "Sorry, I couldn't process that right now. Please try again.",
        id: Date.now() + 1,
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); }
  };

  return (
    <div className="card" style={s.wrap}>
      <div style={s.messages}>
        {messages.length === 0 && (
          <div style={s.emptyState}>
            <p style={s.emptyTitle}>Ask anything about your reviews, complaints, or inventory</p>
            <div style={s.suggestionGrid}>
              {suggestions.map(sug => (
                <button key={sug} style={s.suggestionChip} onClick={() => ask(sug)}>{sug}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} style={{ ...s.bubbleRow, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              ...s.bubble,
              ...(m.role === 'user' ? s.userBubble : s.assistantBubble),
              ...(m.isError ? s.errorBubble : {}),
            }}>
              {m.role === 'user' ? m.text : <ReactMarkdown>{m.text}</ReactMarkdown>}
              {m.toolsUsed?.length > 0 && (
                <div style={s.toolsFootnote}>checked: {m.toolsUsed.map(t => t.replace(/_/g, ' ')).join(', ')}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...s.bubbleRow, justifyContent: 'flex-start' }}>
            <div style={{ ...s.bubble, ...s.assistantBubble }}>
              <span style={s.typingDots}>
                <span style={s.dot} /><span style={{ ...s.dot, animationDelay: '0.15s' }} /><span style={{ ...s.dot, animationDelay: '0.3s' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={s.inputRow}>
        <input
          className="form-control"
          style={{ flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={() => ask(input)} disabled={loading || !input.trim()}>
          Ask
        </button>
      </div>

      <style>{`
        @keyframes assistantPulse { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
      `}</style>
    </div>
  );
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', height: 420, padding: '1rem', marginBottom: '2rem' },
  messages: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 },
  emptyState: { textAlign: 'center', margin: 'auto', maxWidth: 460 },
  emptyTitle: { color: '#64748b', fontSize: '.9rem', marginBottom: 12 },
  suggestionGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  suggestionChip: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 999, padding: '6px 12px', fontSize: '.8rem', color: '#334155', cursor: 'pointer' },
  bubbleRow: { display: 'flex' },
  bubble: { maxWidth: '80%', padding: '10px 14px', borderRadius: 14, fontSize: '.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  userBubble: { background: '#7c3aed', color: '#fff', borderBottomRightRadius: 4 },
  assistantBubble: { background: '#f1f5f9', color: '#1e293b', borderBottomLeftRadius: 4 },
  errorBubble: { background: '#fef2f2', color: '#b91c1c' },
  toolsFootnote: { fontSize: '.7rem', color: '#94a3b8', marginTop: 6, fontStyle: 'italic' },
  typingDots: { display: 'inline-flex', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'assistantPulse 1.2s infinite' },
  inputRow: { display: 'flex', gap: 8, marginTop: 10 },
};
