// src/components/supplier/SupplierAssistant.js
// Thin wrapper around the shared AssistantChat component, used on the
// supplier dashboard. The backend automatically scopes every answer to
// this supplier's own products (see backend/lib/agent.js) — no scope
// parameter is ever sent from here.
import React from 'react';
import AssistantChat from '../common/AssistantChat';

const SUPPLIER_SUGGESTIONS = [
  'Which of my products are receiving the most complaints?',
  'Summarize customer feedback for my best-selling product',
  'What are my biggest customer issues this month?',
  'What products of mine need restocking?',
];

export default function SupplierAssistant() {
  return (
    <AssistantChat
      suggestions={SUPPLIER_SUGGESTIONS}
      placeholder="Ask about your products, reviews, or inventory…"
      storageKey="shopzone_supplier_assistant_thread"
    />
  );
}
