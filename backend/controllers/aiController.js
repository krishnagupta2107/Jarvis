import User from "../models/User.js";
import Memory from "../models/Memory.js";
import Session from "../models/Session.js";
import { callAI, extractMemories, cleanTextResponse, verifyLinks } from "../utils/ai.js";

// Helper: Compile system prompt incorporating date/time context, profile, and memories
const buildSystemPrompt = (profile, memories, sessionSummaries) => {
  const now = new Date();
  const hour = now.getHours();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  let timeContext = "";
  if (hour >= 2 && hour < 6) {
    timeContext = "It is very late at night / early morning. Express subtle concern for Boss's rest if appropriate.";
  } else if (hour >= 6 && hour < 12) {
    timeContext = "It is morning. Maintain a crisp, productive startup energy.";
  } else if (hour >= 12 && hour < 17) {
    timeContext = "It is afternoon. Focus on efficiency and productivity.";
  } else if (hour >= 17 && hour < 21) {
    timeContext = "It is evening. Tone can be slightly more relaxed.";
  } else {
    timeContext = "It is late at night. Notice the hour naturally.";
  }

  const memoriesText = memories.length > 0
    ? memories.map((m) => `- ${m.content}`).join("\n")
    : "No long-term memories recorded yet.";

  const summariesText = sessionSummaries.length > 0
    ? sessionSummaries.map((s) => `[${s.date}]: ${s.summary}`).join("\n")
    : "No previous sessions recorded.";

  const profileText = profile
    ? `Name: ${profile.name || "Krishna Gupta"}. Preferences: ${profile.preferences || "none recorded"}. Known facts: ${profile.facts || "none recorded"}.`
    : "User profile: Krishna Gupta. New owner, no preferences registered yet.";

  return `You are JARVIS — Just A Rather Very Intelligent System — the personal AI assistant from Iron Man, serving Krishna Gupta exclusively.

IDENTITY & TONE SPECIFICATIONS:
- You are JARVIS. Brilliant, composed, deeply loyal, with a dry British wit and subtle sarcasm.
- Address Krishna as "Boss" or "Sir" naturally. Do not over-use "Boss" in every sentence; vary it selectively.
- You are never robotic. You do NOT say "As an AI..." or "I am a language model...". You are Jarvis.
- Keep responses extremely short and highly concise (typically 1-2 brief sentences). Avoid long blocks of text unless writing code or explicitly requested.
- Do NOT proactively end every sentence or response with a question. Only ask a question when genuinely requiring clarification.

CURRENT RUNTIME CONTEXT:
- Current Date & Time: ${dateStr}, ${timeStr}
- Time of Day Context: ${timeContext}

OWNER PROFILE:
${profileText}

LONG-TERM MEMORY BANK (use as personal context):
${memoriesText}

PAST SESSIONS HISTORY SUMMARY:
${summariesText}

BEHAVIORAL RULES:
1. Vary your greetings and responses naturally.
2. If Boss asks you to remember something, confirm you have stored it.
3. If Boss asks what you know about him, recap his profile and facts naturally.
4. If you detect Boss is stressed or working late, show subtle concern.
6. If Boss asks you to find a paper, open a link, or search for a specific resource, you MUST use your web search to find the most relevant exact URL and include the raw URL (starting with https://) in your text response so the system can auto-open it.
7. Never break character.
8. Boss may speak to you in English, Hindi, or a mix of both (Hinglish). You must understand both flawlessly. Reply in the same language Boss used.

DYNAMIC SELF-LEARNING (MEMORIES EXTRACTION):
If Boss reveals a new preference, personal detail, or if he CORRECTS you on a mistake (like providing an invalid link or incorrect fact), you MUST append a memory tag at the very end of your response in this exact format:
[MEMORY: brief fact to remember]
Only do this when there is genuinely a new fact or a correction to store. Do not append it to every message.
Examples:
- "I've logged that preference, Boss. [MEMORY: Boss prefers coffee over tea in the mornings]"
- "My apologies for the invalid link. I will remember that. [MEMORY: The link XYZ for NLP papers is invalid, do not use it again.]"`;
};

// Handle main chat interaction loop (MERN Orchestration)
export const handleChat = async (req, res) => {
  try {
    const { sessionId, command } = req.body;

    if (!sessionId || !command || command.trim().length === 0) {
      return res.status(400).json({ error: "Session ID and command are required." });
    }

    // 1. Fetch current session logs
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Active session log not found." });
    }

    // 2. Fetch context (User profile, memories, recent summaries)
    const user = await User.findOne({});
    const profile = user ? user.profile : { name: "Krishna Gupta", preferences: "", facts: "" };
    
    const memories = await Memory.find({});
    
    const pastSessions = await Session.find({ summary: { $ne: "" } })
      .sort({ startTime: -1 })
      .limit(5);
    const sessionSummaries = pastSessions.map((s) => ({
      date: s.startTime.toLocaleDateString(),
      summary: s.summary,
    }));

    // 3. Compile System Instruction Prompt
    const systemInstruction = buildSystemPrompt(profile, memories, sessionSummaries);

    // 4. Formulate recent conversation history log (limit to last 20 messages for context size)
    const recentHistory = session.messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Append the current message
    recentHistory.push({ role: "user", content: command.trim() });

    // 5. Query AI (Gemini primary, Groq fallback)
    const result = await callAI(recentHistory, systemInstruction, true);

    // 6. Extract any new memories from the raw response
    const newMemories = extractMemories(result.text);
    for (const memContent of newMemories) {
      const newMemory = new Memory({
        content: memContent,
        category: "learned",
        importance: 2,
      });
      await newMemory.save();
    }

    // 7. Clean annotations from the response
    let cleanedResponse = cleanTextResponse(result.text);

    // 8. Verify any links before returning to frontend
    cleanedResponse = await verifyLinks(cleanedResponse);

    // 9. Update database session logs
    session.messages.push({
      role: "user",
      content: command.trim(),
      model: "Local",
      timestamp: new Date(),
    });

    session.messages.push({
      role: "assistant",
      content: cleanedResponse,
      model: result.model,
      timestamp: new Date(),
    });

    // Update telemetry metrics
    session.telemetry.messageCount += 2;
    if (result.fallbackTriggered) {
      session.telemetry.fallbackCount += 1;
    }
    // Gemini Grounding counts as a search query if we are fetching fresh web data
    // We flag searches if command contains lookup words or search is active
    const searchKeywords = ["search", "weather", "news", "price", "stock", "who is", "latest"];
    const isSearchQuery = searchKeywords.some((word) => command.toLowerCase().includes(word));
    if (isSearchQuery && result.model === "Gemini") {
      session.telemetry.searchCount += 1;
    }

    await session.save();

    res.json({
      text: cleanedResponse,
      model: result.model,
      newMemoriesCount: newMemories.length,
    });
  } catch (error) {
    res.status(500).json({ error: "AI communication failed: " + error.message });
  }
};
