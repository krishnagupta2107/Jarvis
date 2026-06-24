import fetch from "node-fetch"; // Node 18+ has global fetch, but we can import or use global fetch. Since package.json has ES6, standard fetch is built into Node 18+

const GEMINI_MODEL = "gemini-2.0-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Call Google Gemini API (supporting Grounding Search Tool)
const callGemini = async (messages, systemPrompt, useSearch = true) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured in .env");
  }

  // Map messages to Gemini structure
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const tools = useSearch ? [{ googleSearch: {} }] : [];

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 1024,
    },
  };

  if (tools.length > 0) {
    body.tools = tools;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || `Gemini HTTP error ${response.status}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
};

// Call Groq API (fallback helper)
const callGroq = async (messages, systemPrompt) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq API key is not configured in .env");
  }

  const payloadMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const url = "https://api.groq.com/openai/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: payloadMessages,
      temperature: 0.8,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || `Groq HTTP error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
};

// Smart Router: Tries Gemini first, falls back to Groq, logs stats
export const callAI = async (messages, systemPrompt, useSearch = true) => {
  let fallbackTriggered = false;

  try {
    const text = await callGemini(messages, systemPrompt, useSearch);
    if (text) {
      return { text, model: "Gemini", fallbackTriggered };
    }
  } catch (error) {
    console.warn(`[AI WARNING] Gemini failed, switching to Groq: ${error.message}`);
    fallbackTriggered = true;
  }

  try {
    const text = await callGroq(messages, systemPrompt);
    if (text) {
      return { text, model: "Groq", fallbackTriggered };
    }
  } catch (error) {
    console.error(`[AI ERROR] Groq fallback failed: ${error.message}`);
  }

  return {
    text: "I am experiencing difficulty connecting to my servers, Boss. Both systems are currently unresponsive.",
    model: "none",
    fallbackTriggered: true,
  };
};

// Helper: Extract memories [MEMORY: fact] from AI text outputs
export const extractMemories = (text) => {
  const memories = [];
  const regex = /\[MEMORY:\s*(.*?)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    memories.push(match[1].trim());
  }
  return memories;
};

// Helper: Remove memory annotations from spoken/display outputs
export const cleanTextResponse = (text) => {
  return text.replace(/\[MEMORY:.*?\]/g, "").trim();
};

// Helper: Summarize a conversation session
export const generateSummary = async (conversationLog) => {
  const summaryInstruction =
    "You are a summarization assistant. Summarize the conversation history between Krishna Gupta (Boss) and Jarvis (his AI assistant) in 2-3 sentences. Focus on key decisions, projects discussed, or new details learned about the Boss.";
  
  const messages = [
    {
      role: "user",
      content: `Please summarize the following logs:\n\n${conversationLog}`,
    },
  ];

  try {
    const result = await callAI(messages, summaryInstruction, false);
    return result.text;
  } catch (error) {
    console.error(`[AI ERROR] Summarization failed: ${error.message}`);
    return "Session completed. Telemetry logged.";
  }
};
