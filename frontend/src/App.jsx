import React, { useState, useEffect, useRef } from 'react';
import ScanlineOverlay from './components/ScanlineOverlay';
import ArcReactor from './components/ArcReactor';
import './index.css';

const API_BASE = 'http://localhost:5000'; // Assuming backend is on 5000

function App() {
  const [aiState, setAiState] = useState('standby'); // standby, listening, processing, speaking, error
  const [currentMessage, setCurrentMessage] = useState({ text: 'J.A.R.V.I.S. ONLINE. AWAITING INPUT.', sender: 'jarvis' });
  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Initialize Session
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sessions`, { method: 'POST' });
        const data = await res.json();
        if (data.sessionId) {
          setSessionId(data.sessionId);
          sessionIdRef.current = data.sessionId;
        }
      } catch (err) {
        console.error('Session init failed:', err);
        setAiState('error');
        setCurrentMessage({ text: 'SYSTEM ERROR: BACKEND OFFLINE.', sender: 'jarvis' });
      }
    };
    initSession();
    // Speech Recognition
  }, []);

  useEffect(() => {
    const setupSpeechRecognition = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("Speech Recognition API not supported in this browser.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Uses Indian English to support English and Hinglish (Latin script)

      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        setCurrentMessage({ text: transcript.toUpperCase(), sender: 'user' });
        await processCommand(transcript);
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.error("Speech recognition error:", event.error);
          setAiState('error');
        } else {
          setAiState('standby');
        }
      };

      recognition.onend = () => {
        if (aiState === 'listening') setAiState('standby');
      };

      recognitionRef.current = recognition;
    };

    setupSpeechRecognition();
  }, []); // Run once on mount

  const speakText = (text) => {
    if (!synthRef.current) return;
    
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    
    // Auto-detect Hindi script to switch TTS voice engine dynamically
    const hasHindi = /[\u0900-\u097F]/.test(text);
    
    let preferredVoice;
    if (hasHindi) {
      preferredVoice = voices.find(voice => voice.lang.startsWith('hi'));
    } else {
      preferredVoice = voices.find(voice => 
        voice.name.includes('Google UK English Male') || 
        voice.name.includes('Great Britain')
      );
    }
    
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setAiState('speaking');
    utterance.onend = () => {
      setAiState('standby');
      // Auto-restart microphone for continuous conversation
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) { /* already started */ }
      }
    };
    
    synthRef.current.speak(utterance);
  };

  const processCommand = async (commandText) => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      setCurrentMessage({ text: 'SYSTEM ERROR: NO SESSION ID. BACKEND CONNECTION FAILED.', sender: 'jarvis' });
      setAiState('error');
      return;
    }
    setAiState('processing');

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, command: commandText })
      });
      const data = await res.json();
      
      const responseText = data.text || "I encountered an error processing that.";
      setCurrentMessage({ text: responseText, sender: 'jarvis' });
      
      // Clean URLs from spoken text so Jarvis doesn't read out full links
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const spokenText = responseText.replace(urlRegex, '').trim();
      speakText(spokenText || "Opening that for you now, Sir.");
      
      // Auto-open valid links for smart research
      const urls = responseText.match(urlRegex);
      let newTab = null;
      
      if (urls && urls.length > 0) {
        newTab = window.open(urls[0], '_blank');
      }

      if (newTab === null && urls && urls.length > 0) {
        const blockMsg = "Sir, your browser is blocking my ability to open new tabs. Please allow popups in your address bar.";
        setCurrentMessage({ text: blockMsg, sender: 'jarvis' });
        speakText(blockMsg);
      }

    } catch (err) {
      console.error(err);
      setAiState('error');
      setCurrentMessage({ text: 'COMMUNICATION LINK SEVERED.', sender: 'jarvis' });
    }
  };

  const handleManualInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
      const command = e.target.value;
      setCurrentMessage({ text: command.toUpperCase(), sender: 'user' });
      processCommand(command);
      e.target.value = '';
    }
  };

  // Allow clicking anywhere to trigger voice recognition if not speaking/processing
  const handleBodyClick = () => {
    if (recognitionRef.current && (aiState === 'standby' || aiState === 'error')) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition already started");
      }
    }
  };

  return (
    <>
      <ScanlineOverlay />
      
      <div className="app-container" onClick={handleBodyClick}>
        <div className="hud-top-bar glow-text">
          J.A.R.V.I.S. [ {aiState.toUpperCase()} ]
        </div>

        <ArcReactor state={aiState} />

        <div className={`hologram-text glow-text ${currentMessage.sender}`}>
          {currentMessage.text}
        </div>

        {/* Visible input for debugging/fallback */}
        <input 
          type="text" 
          className="command-input glow-text" 
          placeholder="[ TYPE COMMAND HERE ]"
          onKeyDown={handleManualInput} 
          autoFocus 
        />
        
        <div style={{ position: 'absolute', bottom: '2rem', opacity: 0.3, fontSize: '0.8rem' }}>
          CLICK ANYWHERE TO SPEAK OR TYPE COMMAND
        </div>
      </div>
    </>
  );
}

export default App;
