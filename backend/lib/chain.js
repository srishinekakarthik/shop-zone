// chatbot/lib/chain.js
// Core LangChain conversational RAG chain with Supabase vector store
// LLM: Google Gemini 2.0 Flash | Embeddings: text-embedding-004

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { SupabaseVectorStore } = require('@langchain/community/vectorstores/supabase');
const { createClient } = require('@supabase/supabase-js');
const { ConversationalRetrievalQAChain } = require('langchain/chains');
const { BufferMemory } = require('langchain/memory');
const { PromptTemplate } = require('@langchain/core/prompts');

// ── Supabase client (service role for vector ops) ────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Embeddings & Vector Store (Gemini text-embedding-004) ────
// Note: text-embedding-004 outputs 768-dim vectors.
// If migrating from OpenAI (1536-dim), re-run ingest after updating
// migrations_vector.sql to use VECTOR(768) instead of VECTOR(1536).
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-2',
  apiKey: process.env.GOOGLE_API_KEY,
});

const getVectorStore = () =>
  new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: 'documents',        // created by migrations_vector.sql
    queryName: 'match_documents',
  });

// ── System Prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are ShopZone's friendly and knowledgeable customer support assistant.

You help customers with:
- Finding products and checking availability
- Order status, tracking, and returns
- Account and profile questions
- Payment and checkout issues
- General shopping guidance

Guidelines:
- Be warm, concise, and professional
- If a customer asks about a specific order, ask for their order number
- For issues you cannot resolve, say: "I'll connect you with our support team"
- Never fabricate product details, prices, or inventory not found in context
- Respond in the same language the customer uses

Context from ShopZone's knowledge base:
{context}

Chat History:
{chat_history}

Customer: {question}
ShopZone Assistant:`;

const QA_PROMPT = PromptTemplate.fromTemplate(SYSTEM_PROMPT);

// ── Session Memory Store ──────────────────────────────────────
// In production, replace with Redis or Supabase-backed memory
const sessionMemories = new Map();

function getMemory(sessionId) {
  if (!sessionMemories.has(sessionId)) {
    sessionMemories.set(sessionId, new BufferMemory({
      memoryKey: 'chat_history',
      inputKey: 'question',
      outputKey: 'text',
      returnMessages: false,
      humanPrefix: 'Customer',
      aiPrefix: 'ShopZone Assistant',
    }));
  }
  return sessionMemories.get(sessionId);
}

// ── LLM: Gemini 2.0 Flash ────────────────────────────────────
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  temperature: 0.3,
  apiKey: process.env.GOOGLE_API_KEY,
  streaming: false,
});

// ── Build Chain ───────────────────────────────────────────────
async function buildChain(sessionId) {
  const vectorStore = getVectorStore();
  const retriever = vectorStore.asRetriever({
    k: 4,
    searchType: 'similarity',
  });
  const memory = getMemory(sessionId);

  const chain = ConversationalRetrievalQAChain.fromLLM(llm, retriever, {
    memory,
    qaChainOptions: {
      type: 'stuff',
      prompt: QA_PROMPT,
    },
    returnSourceDocuments: true,
    verbose: process.env.NODE_ENV === 'development',
  });

  return chain;
}

// ── Main Chat Function ────────────────────────────────────────
async function chat(sessionId, userMessage) {
  const chain = await buildChain(sessionId);

  const response = await chain.call({ question: userMessage });

  return {
    answer: response.text || response.answer || '',
    sources: (response.sourceDocuments || []).map(d => ({
      content: d.pageContent.slice(0, 100) + '…',
      metadata: d.metadata,
    })),
    sessionId,
  };
}

// ── Clear Session Memory ──────────────────────────────────────
function clearSession(sessionId) {
  sessionMemories.delete(sessionId);
}

module.exports = { chat, clearSession };
