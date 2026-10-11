import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  RefreshCw, 
  MessageSquare,
  Sprout,
  Droplets,
  ShieldAlert,
  Search,
  ExternalLink
} from 'lucide-react';

const INITIAL_SUGGESTIONS = [
  "📍 What is the crop count in PARCEL_0128?",
  "🌱 How many banana plants can be planted in PARCEL_0126?",
  "🌾 Paddy cultivation acreage across Cheranmahadevi",
  "🍌 Best fertilizer schedule for Grand Naine Banana",
  "⚠️ If flood hazard occurs, what will be the loss rate in PARCEL_0128?",
  "⏱️ Compare Baseline vs Latest Sentinel-2 observation trends",
  "💧 Thamirabarani canal water irrigation management",
  "📄 How do I export the regional cadastral PDF report?"
];

export default function ChatbotPage({ statistics }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Hello! I am your **AgriMap Geospatial AI Assistant** 🌾.\n\nI am grounded in live ground-truth cadastral, agronomic, and multi-temporal Sentinel-2 data across **Ambasamudram & Cheranmahadevi Taluks (${statistics?.study_area_summary?.total_parcels || 2374} parcels • ${(statistics?.study_area_summary?.total_parcels_area_hectares || 4074.4).toFixed(1)} ha)**.\n\n**I can assist you with:**\n- 📍 **Cadastral Crop Lookups:** Search any parcel ID (e.g., *PARCEL_0128*) for crop type, NDVI vigor, and tree count\n- 🌱 **Planting Capacity:** Calculate exact agronomic plant counts based on spacing rules\n- ⚠️ **Hazard & Disaster Loss:** Estimate flood and drought damage compensation values\n- 💧 **Irrigation & Agronomy:** Provide customized advice for Samba paddy and banana plantations\n\nHow can I assist your agricultural assessment today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [geminiActive, setGeminiActive] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatusMsg, setKeyStatusMsg] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check Gemini status
  useEffect(() => {
    async function checkGemini() {
      try {
        const stored = localStorage.getItem('gemini_api_key');
        if (stored) setApiKeyInput(stored);
        const res = await fetch('/api/chat/status');
        if (res.ok) {
          const data = await res.json();
          setGeminiActive(data.gemini_active || !!stored);
        }
      } catch (err) {
        console.error('Error checking Gemini status:', err);
      }
    }
    checkGemini();
  }, []);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: text.trim()
    };
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const storedKey = localStorage.getItem('gemini_api_key') || undefined;
      const history = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: history,
          api_key: storedKey,
          model: 'gemini-2.5-flash'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botReply = {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.reply || data.response || 'Analysis complete.',
          source: data.source || (data.gemini_active ? 'gemini' : 'local')
        };
        setMessages((prev) => [...prev, botReply]);
        if (data.source === 'gemini' || data.gemini_active) {
          setGeminiActive(true);
        }
      } else {
        const botReply = {
          id: Date.now() + 1,
          sender: 'bot',
          text: "⚠️ Backend service returned a response error. Grounded fallback: Ambasamudram (435 parcels, 760 ha) dominant banana canopy; Cheranmahadevi (415 parcels, 726 ha) dominant paddy wetland."
        };
        setMessages((prev) => [...prev, botReply]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: "⚠️ Unable to connect to the AgriMap AI API. Please verify the FastAPI backend server is running on port 8000."
      };
      setMessages((prev) => [...prev, botReply]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    const key = apiKeyInput.trim();
    if (!key) {
      localStorage.removeItem('gemini_api_key');
      setGeminiActive(false);
      setKeyStatusMsg({ type: 'info', text: 'API key cleared. Operating in local GIS engine mode.' });
      return;
    }

    setSavingKey(true);
    setKeyStatusMsg(null);
    try {
      localStorage.setItem('gemini_api_key', key);
      const res = await fetch('/api/chat/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key, persist: true })
      });
      const data = await res.json();
      if (data.success) {
        setGeminiActive(true);
        setKeyStatusMsg({ type: 'success', text: '✨ Google Gemini 2.5 Flash connected successfully!' });
        setTimeout(() => setShowKeyModal(false), 1200);
      } else {
        setKeyStatusMsg({ type: 'error', text: data.message || 'Failed to verify key.' });
      }
    } catch (err) {
      localStorage.setItem('gemini_api_key', key);
      setGeminiActive(true);
      setKeyStatusMsg({ type: 'success', text: 'Key saved locally in browser!' });
      setTimeout(() => setShowKeyModal(false), 1200);
    } finally {
      setSavingKey(false);
    }
  };

  // Helper to render markdown-like bold and bullet text
  const renderMessageContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="chat-h3">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('- ')) {
        const itemText = line.replace('- ', '');
        return (
          <li key={idx} className="chat-li">
            {itemText.split('**').map((chunk, i) => (
              i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk
            ))}
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="chat-line-break" />;
      }
      return (
        <p key={idx} className="chat-p">
          {line.split('**').map((chunk, i) => (
            i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk
          ))}
        </p>
      );
    });
  };

  return (
    <div className="chatbot-page-wrapper">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h2 className="page-main-title">AI Agricultural Geospatial Assistant</h2>
          <p className="page-subtitle">
            Natural language queries grounded in live cadastral parcel boundaries, satellite multi-spectral data, and agronomic knowledge
          </p>
        </div>
        <div className="page-header-badges">
          <button
            className={`gemini-status-btn ${geminiActive ? 'active' : ''}`}
            onClick={() => setShowKeyModal(true)}
            title="Configure Google Gemini API Key"
          >
            <Sparkles size={14} />
            <span>{geminiActive ? 'Gemini 2.5 Flash Connected' : 'Connect Gemini API Key'}</span>
            <Key size={13} style={{ marginLeft: 4 }} />
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="chat-layout-grid">
        {/* Left Suggestions & Topics Sidebar */}
        <div className="chat-sidebar-card">
          <div className="chat-sidebar-title">
            <Sparkles size={16} className="text-emerald" />
            <span>Suggested Questions</span>
          </div>
          <div className="sidebar-prompts-list">
            {INITIAL_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                className="prompt-chip-btn"
                onClick={() => handleSendMessage(s.replace(/^[^\w]+/, ''))}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="sidebar-dataset-scope">
            <div className="scope-title">Dataset Scope</div>
            <div className="scope-stat">
              <span>Study AOI:</span>
              <strong>Ambasamudram & Cheranmahadevi</strong>
            </div>
            <div className="scope-stat">
              <span>Classified Parcels:</span>
              <strong>{statistics?.study_area_summary?.total_parcels || 2374} Polygons</strong>
            </div>
            <div className="scope-stat">
              <span>Total Extent:</span>
              <strong>{(statistics?.study_area_summary?.total_parcels_area_hectares || 4074.4).toLocaleString()} Hectares</strong>
            </div>
            <div className="scope-stat">
              <span>Monitored Crops:</span>
              <strong>Paddy, Banana, Other Crops</strong>
            </div>
          </div>
        </div>

        {/* Right Chat Stream & Input Area */}
        <div className="chat-viewport-card">
          {/* Messages Stream */}
          <div className="chat-messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
                <div className="message-avatar">
                  {msg.sender === 'user' ? '👤' : <Bot size={18} />}
                </div>
                <div className="message-bubble">
                  <div className="message-header-meta">
                    <span className="sender-label">
                      {msg.sender === 'user' ? 'You' : 'AgriMap AI'}
                    </span>
                    {msg.source && (
                      <span className="source-tag">
                        {msg.source === 'gemini' ? 'Google Gemini 2.5 Flash' : 'Domain GeoAI Engine'}
                      </span>
                    )}
                  </div>
                  <div className="message-body">
                    {renderMessageContent(msg.text)}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message-row bot">
                <div className="message-avatar"><Bot size={18} /></div>
                <div className="message-bubble loading-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Query Pills */}
          <div className="quick-query-pills-bar">
            <span className="quick-label">Quick:</span>
            <button onClick={() => handleSendMessage("What is the crop count in PARCEL_0128?")}>PARCEL_0128</button>
            <button onClick={() => handleSendMessage("Banana cultivation in Ambasamudram")}>Banana Acreage</button>
            <button onClick={() => handleSendMessage("Samba paddy fertilization recommendations")}>Paddy Fertilizer</button>
            <button onClick={() => handleSendMessage("Compare Baseline vs Peak observation dates")}>Temporal Shift</button>
          </div>

          {/* Chat Input Bar */}
          <form className="chat-input-bar" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about agricultural parcels, NDVI, canal water, fertilizers, crop counts..."
              className="chat-text-input"
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!input.trim() || loading}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Google Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="modal-backdrop-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal-card-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-with-icon">
                <Sparkles size={20} className="text-emerald" />
                <h3>Configure Google Gemini AI API</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowKeyModal(false)}>✕</button>
            </div>

            <p className="modal-desc-text">
              Enter your Google Gemini API key to enable open-domain reasoning with real-time 
              <strong> Google Gemini 2.5 Flash</strong>. If no key is provided, the platform operates 
              with the built-in local agricultural intelligence engine.
            </p>

            <form onSubmit={handleSaveApiKey} className="key-config-form">
              <div className="form-input-group">
                <label>Gemini API Key (AIzaSy...):</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="pro-text-input"
                />
              </div>

              {keyStatusMsg && (
                <div className={`status-msg-banner ${keyStatusMsg.type}`}>
                  {keyStatusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{keyStatusMsg.text}</span>
                </div>
              )}

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowKeyModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingKey}
                >
                  {savingKey ? 'Verifying...' : 'Save & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
