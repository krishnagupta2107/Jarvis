import Memory from "../models/Memory.js";
import User from "../models/User.js";
import Session from "../models/Session.js";

// Fetch all memory assets (profile, memory nodes, and recent summaries) to build the AI context
export const getMemoryContext = async (req, res) => {
  try {
    // 1. Fetch the user profile (assume single user system)
    const user = await User.findOne({});
    const profile = user
      ? user.profile
      : { name: "Krishna Gupta", preferences: "", facts: "" };

    // 2. Fetch all stored long-term memory nodes
    const memories = await Memory.find({}).sort({ createdAt: -1 });

    // 3. Fetch the last 5 session summaries to establish recent context
    const sessions = await Session.find({ summary: { $ne: "" } })
      .sort({ startTime: -1 })
      .limit(5);

    const sessionSummaries = sessions.map((s) => ({
      date: s.startTime.toLocaleDateString(),
      summary: s.summary,
    }));

    res.json({
      profile,
      memories: memories.map((m) => ({ id: m._id, content: m.content, category: m.category, importance: m.importance })),
      sessionSummaries,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to compile memory context: " + error.message });
  }
};

// Add a new explicit or dynamically learned memory node
export const addMemory = async (req, res) => {
  try {
    const { content, category, importance } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Memory content is required." });
    }

    const newMemory = new Memory({
      content: content.trim(),
      category: category || "general",
      importance: importance || 1,
    });

    await newMemory.save();
    res.status(201).json({ msg: "Memory node saved successfully.", memory: newMemory });
  } catch (error) {
    res.status(500).json({ error: "Failed to save memory node: " + error.message });
  }
};

// Delete a memory node (e.g. "forget that")
export const deleteMemory = async (req, res) => {
  try {
    const { id } = req.params;

    const memory = await Memory.findByIdAndDelete(id);
    if (!memory) {
      return res.status(404).json({ error: "Memory node not found." });
    }

    res.json({ msg: "Memory node erased successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to erase memory node: " + error.message });
  }
};

// Update the user profile details (preferences, facts, or name)
export const updateProfile = async (req, res) => {
  try {
    const { name, preferences, facts } = req.body;

    const user = await User.findOne({});
    if (!user) {
      return res.status(404).json({ error: "User account not initialized." });
    }

    if (name !== undefined) user.profile.name = name.trim();
    if (preferences !== undefined) user.profile.preferences = preferences.trim();
    if (facts !== undefined) user.profile.facts = facts.trim();

    await user.save();
    res.json({ msg: "Owner profile updated successfully.", profile: user.profile });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile: " + error.message });
  }
};
