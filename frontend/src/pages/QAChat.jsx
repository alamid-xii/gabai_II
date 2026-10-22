import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ThumbsUp, ThumbsDown, Loader2, Copy, Trash2, Check, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const quickFAQs = [
  "What are the admission requirements for Grade 7?",
  "What SHS strands are available at EMC?",
  "How do I apply for the Special Science Class?",
  "What is the STEM strand?",
  "What is the difference between JHS and SHS?",
  "How do I enroll online at EMC?",
  "Are there scholarships for SHS students?",
  "What documents do I need to enroll?",
];

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const initialMessages = [
  {
    id: 1,
    from: "bot",
    text: "Hello! I'm GabAI, your EMC Admission Assistant. I can help in English or Filipino!\n\nI can answer questions about:\n• JHS (Grades 7–10) and SHS (Grades 11–12) admission\n• Special Science Class (SSC)\n• SHS strands — STEM, ABM, HUMSS, TVL\n• Enrollment requirements and process\n• Tuition, scholarships, and campus information\n\nWhat would you like to know?",
    time: getTime(),
    isComplete: true
  },
];

export function QAChat() {
  const { user } = useAuth();
  const chatKey = user ? `chatHistory_${user.id}` : 'chatHistory_guest';

  const [messages, setMessages] = useState(() => {
    const key = user ? `chatHistory_${user.id}` : 'chatHistory_guest';
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialMessages;
  });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [copiedId, setCopiedId] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save chat history to localStorage (scoped to current user)
  useEffect(() => {
    localStorage.setItem(chatKey, JSON.stringify(messages));
  }, [messages, chatKey]);

  // Reset chat when user changes (e.g. logout or switch account)
  useEffect(() => {
    const saved = localStorage.getItem(chatKey);
    setMessages(saved ? JSON.parse(saved) : initialMessages);
    setSuggestedQuestions([]);
    setError(null);
  }, [chatKey]);

  // Typewriter effect
  async function typewriterEffect(fullText, messageId) {
    const words = fullText.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: currentText, isTyping: true }
          : msg
      ));
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, isTyping: false, isComplete: true }
        : msg
    ));
  }

  // Build conversation history for context
  function getConversationHistory() {
    return messages
      .filter(m => m.from && m.text)
      .map(m => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
  }

  async function sendMessage(text) {
    if (!text.trim() || typing) return;
    
    setError(null);
    const userMsg = { id: Date.now(), from: "user", text, time: getTime(), isComplete: true };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setSuggestedQuestions([]);

    try {
      const response = await fetch("http://localhost:3000/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text, 
          sessionId,
          conversationHistory: getConversationHistory()
        }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.response || "Failed to get response");
      }
      
      const botMsgId = Date.now() + 1;
      const botMsg = {
        id: botMsgId,
        from: "bot",
        text: "",
        time: getTime(),
        confidence: data.confidence,
        chatLogId: data.chatLogId,
        isTyping: true,
        isComplete: false
      };
      
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
      
      await typewriterEffect(data.response, botMsgId);
      
      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      }
      
    } catch (error) {
      console.error("Chat error:", error);
      setError(error.message);
      
      const errorMsgId = Date.now() + 1;
      const errorMsg = {
        id: errorMsgId,
        from: "bot",
        text: "",
        time: getTime(),
        isError: true,
        isTyping: true,
        isComplete: false
      };
      
      setMessages((prev) => [...prev, errorMsg]);
      setTyping(false);
      
      await typewriterEffect(
        "I apologize, but I'm having trouble connecting right now. This could be due to:\n\n• Network connectivity issues\n• Server maintenance\n• High traffic\n\nPlease try again in a moment, or contact the Registrar's Office at (043) 123-4567 for immediate assistance.",
        errorMsgId
      );
    } finally {
      inputRef.current?.focus();
    }
  }

  async function handleFeedback(messageId, helpful) {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.chatLogId) return;

    try {
      await fetch("http://localhost:3000/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatLogId: message.chatLogId, helpful }),
        credentials: "include"
      });
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, feedbackGiven: true, feedbackType: helpful ? 'helpful' : 'not-helpful' } : m
      ));
    } catch (error) {
      console.error("Feedback error:", error);
    }
  }

  function copyMessage(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function clearChat() {
    if (confirm("Are you sure you want to clear the chat history?")) {
      setMessages(initialMessages);
      setSuggestedQuestions([]);
      setError(null);
      localStorage.removeItem(chatKey);
    }
  }

  function handleKeyPress(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="h-full min-h-0 bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex flex-col">
      

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Connection error: {error}</span>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col overflow-hidden">
        <div className="max-w-6xl mx-auto w-full flex flex-col h-full min-h-0">
          
          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 min-h-0 overflow-y-auto space-y-6 mb-6 pr-2"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.from === "user" ? "flex-row-reverse" : ""} animate-fadeIn`}
              >
                <div className="shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                      msg.from === "bot"
                        ? "bg-linear-to-br from-[#001840] to-[#102A71] text-[#F5C400]"
                        : "bg-linear-to-br from-[#F5C400] to-[#FFDC5F] text-[#001840]"
                    }`}
                  >
                    {msg.from === "bot" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                </div>

                <div className={`flex-1 max-w-[85%] sm:max-w-[75%] ${msg.from === "user" ? "flex justify-end" : ""}`}>
                  <div
                    className={`inline-block px-5 py-4 rounded-2xl shadow-md ${
                      msg.from === "bot"
                        ? msg.isError 
                          ? "bg-red-50 border border-red-200 text-red-900"
                          : "bg-white border border-gray-200 text-gray-800"
                        : "bg-linear-to-br from-[#001840] to-[#102A71] text-white"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                      {msg.isTyping && <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse"></span>}
                    </p>
                    
                    {msg.isComplete && (
                      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-200/30">
                        <span className="text-xs opacity-60">{msg.time}</span>
                        {msg.from === "bot" && !msg.isError && (
                          <button
                            onClick={() => copyMessage(msg.text, msg.id)}
                            className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
                          >
                            {copiedId === msg.id ? (
                              <><Check className="w-3 h-3" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {msg.from === "bot" && msg.chatLogId && !msg.isError && msg.isComplete && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {!msg.feedbackGiven ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleFeedback(msg.id, true)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all hover:shadow-md font-medium"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              Helpful
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, false)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-all hover:shadow-md font-medium"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              Not Helpful
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-green-600 font-medium">Thank you for your feedback!</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-3 animate-fadeIn">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#001840] to-[#102A71] text-[#F5C400] flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-white border border-gray-200 px-5 py-4 rounded-2xl shadow-md">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-[#001840] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2.5 h-2.5 bg-[#001840] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2.5 h-2.5 bg-[#001840] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && !typing && (
            <div className="mb-4 animate-fadeIn">
              <p className="text-xs font-semibold text-gray-600 mb-2">You might also want to know:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-2 bg-white hover:bg-[#FFFDF0] border border-gray-200 hover:border-[#F5C400] rounded-lg text-gray-700 transition-all shadow-sm hover:shadow-md"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick FAQs */}
          {messages.length === 1 && (
            <div className="mb-3 animate-fadeIn">
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F5C400]" />
                Quick Questions:
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
                {quickFAQs.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={typing}
                    className="min-w-[220px] sm:min-w-0 text-left px-3 py-2 bg-white hover:bg-[#FFFDF0] border border-gray-200 hover:border-[#F5C400] rounded-lg text-xs text-gray-700 transition-all group shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-between">
                      <span className="line-clamp-1">{q}</span>
                      <Send className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#F5C400]" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="bg-white border-2 border-gray-300 rounded-2xl p-3 shadow-xl">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about admission..."
                className="flex-1 px-4 py-3 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-sm resize-none"
                disabled={typing}
                rows={1}
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || typing}
                className="bg-linear-to-r from-[#001840] to-[#102A71] hover:from-[#102A71] hover:to-[#001840] disabled:from-gray-300 disabled:to-gray-300 text-white p-3 rounded-xl transition-all disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                {typing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
