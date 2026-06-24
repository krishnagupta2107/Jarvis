import User from "../models/User.js";

// Check if the system has been initialized (onboarding checker)
export const checkSetup = async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    res.json({ setupComplete: userCount > 0 });
  } catch (error) {
    res.status(500).json({ error: "Database error checking setup: " + error.message });
  }
};

// Verify if a device fingerprint is already authorized, enabling seamless auto-unlock
export const verifyDevice = async (req, res) => {
  try {
    const { fingerprint } = req.body;

    if (!fingerprint) {
      return res.status(400).json({ error: "Device fingerprint is required." });
    }

    const user = await User.findOne({});
    if (!user) {
      // No owner profile exists yet; system requires onboarding setup
      return res.json({ setupComplete: false, authorized: false });
    }

    const isAuthorized = user.authorizedDevices.includes(fingerprint);
    res.json({
      setupComplete: true,
      authorized: isAuthorized,
      profile: isAuthorized ? user.profile : null,
    });
  } catch (error) {
    res.status(500).json({ error: "Device authorization check failed: " + error.message });
  }
};

// Handle first-time system initialization (register PIN and owner profile)
export const register = async (req, res) => {
  try {
    const { pin, fingerprint, name } = req.body;

    if (!pin || pin.trim().length < 4) {
      return res.status(400).json({ error: "PIN must be at least 4 characters long." });
    }

    // Block registration if a user already exists in the system
    const userExists = await User.findOne({});
    if (userExists) {
      return res.status(400).json({ error: "System already initialized. Access locked." });
    }

    const newUser = new User({
      pinHash: pin, // Pre-save hook hashes this PIN
      authorizedDevices: fingerprint ? [fingerprint] : [],
      profile: {
        name: name || "Krishna Gupta",
      },
    });

    await newUser.save();
    res.status(201).json({ msg: "System successfully initialized.", setupComplete: true });
  } catch (error) {
    res.status(500).json({ error: "System registration failed: " + error.message });
  }
};

// Verify user authentication PIN and authorize browser fingerprint
export const login = async (req, res) => {
  try {
    const { pin, fingerprint } = req.body;

    if (!pin) {
      return res.status(400).json({ error: "Security PIN is required." });
    }

    const user = await User.findOne({});
    if (!user) {
      return res.status(404).json({ error: "No owner profile found. Initialize the system first." });
    }

    // Compare entered PIN with stored PIN hash (using bcrypt instance method)
    const isMatch = await user.comparePin(pin);
    if (!isMatch) {
      return res.status(401).json({ error: "INCORRECT PIN — ACCESS DENIED." });
    }

    // Automatically authorize current device fingerprint when correct PIN is entered
    let deviceRegistered = false;
    if (fingerprint) {
      if (!user.authorizedDevices.includes(fingerprint)) {
        user.authorizedDevices.push(fingerprint);
        await user.save();
        deviceRegistered = true;
      } else {
        deviceRegistered = true;
      }
    }

    res.json({
      msg: "IDENTITY AUTHENTICATED",
      authorized: true,
      deviceAuthorized: deviceRegistered,
      profile: user.profile,
    });
  } catch (error) {
    res.status(500).json({ error: "Authentication transaction failed: " + error.message });
  }
};
