import Session from "../models/Session.js";
import Memory from "../models/Memory.js";
import { generateSummary } from "../utils/ai.js";

// Fetch all logged sessions for the telemetry history dashboard
export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({}).sort({ startTime: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch session history: " + error.message });
  }
};

// Start a new conversation session on app initialization
export const createSession = async (req, res) => {
  try {
    const newSession = new Session({
      startTime: new Date(),
      messages: [],
      telemetry: {
        messageCount: 0,
        searchCount: 0,
        fallbackCount: 0,
      },
    });

    await newSession.save();
    res.status(201).json({ msg: "New session logs initialized.", sessionId: newSession._id });
  } catch (error) {
    res.status(500).json({ error: "Failed to initialize session: " + error.message });
  }
};

// Append a message to the active session list and increment telemetry statistics
export const addMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, content, model, fallbackTriggered, isSearch } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: "Message role and content are required." });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Active session logs not found." });
    }

    // Append new message bubble
    session.messages.push({
      role,
      content,
      model: model || "Gemini",
      timestamp: new Date(),
    });

    // Update telemetry counts
    session.telemetry.messageCount += 1;
    if (fallbackTriggered) {
      session.telemetry.fallbackCount += 1;
    }
    if (isSearch) {
      session.telemetry.searchCount += 1;
    }

    await session.save();
    res.json({ msg: "Message logged.", session });
  } catch (error) {
    res.status(500).json({ error: "Failed to log message: " + error.message });
  }
};

// Terminate session, compile chat history, and generate 2-3 sentence AI recap summary
export const closeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session logs not found." });
    }

    // Set end time if not already closed
    session.endTime = new Date();

    // Check if there are messages to summarize
    if (session.messages && session.messages.length >= 2) {
      const convoLog = session.messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

      // Generate recap via AI helper
      const summary = await generateSummary(convoLog);
      session.summary = summary;
    } else {
      session.summary = "Brief session, no conversation recorded.";
    }

    await session.save();
    res.json({ msg: "Session closed and summarized.", session });
  } catch (error) {
    res.status(500).json({ error: "Failed to close and summarize session: " + error.message });
  }
};

// Background system status check when double clap wakes Jarvis (Blueprint Section 19)
export const clapStatusCheck = async (req, res) => {
  try {
    const now = new Date();
    const hour = now.getHours();

    // 1. Check if it is very late at night (past 1 AM)
    if (hour >= 1 && hour < 6) {
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      return res.json({
        important: true,
        message: `Sir — it is past 1. Still here.`,
      });
    }

    // 2. Check if there has been a large time gap since the last session (6+ hours)
    const lastSession = await Session.findOne({ endTime: { $exists: true } }).sort({ endTime: -1 });
    if (lastSession && lastSession.endTime) {
      const msDiff = now.getTime() - lastSession.endTime.getTime();
      const hoursDiff = msDiff / (1000 * 60 * 60);

      if (hoursDiff >= 6.0) {
        return res.json({
          important: true,
          message: "Boss — been a while. Ready.",
        });
      }
    }

    // 3. Fallback: Check if there are high importance memories or pending alerts in general
    // (In local development we keep it clean. If no alerts, return important: false)
    res.json({
      important: false,
      message: "Ready.", // Standard default standby response
    });
  } catch (error) {
    // Graceful check fallback in case of database glitches
    res.json({
      important: false,
      message: "Online.",
    });
  }
};
