"use client"

import React from "react"
import type { NextPage } from "next"

import { useState, useRef, useEffect } from "react"
import {
  Settings,
  Send,
  Mic,
  Phone,
  PhoneOff,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Bot,
  Paperclip,
  Smile,
  ArrowLeft,
  X,
  Moon,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { getStoredTheme, setStoredTheme } from "@/lib/theme"
import { getOrCreateUserId } from "@/lib/utils"
import Vapi from "@vapi-ai/web"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: string // <-- store as ISO string
  type: "text" | "voice" | "image"
  audioUrl?: string
  imageUrl?: string
}

const mockMessages = [
  "Hmm... let me think about that one.",
  "Lemme search in the database for that.",
  "Aven is backed by top VCs.",
  "The team is working hard to make your agent even better.",
  "AI is working on your query...",
  "Your answer is being crafted by Aven.",
  "Hang tight, we're fetching the best response for you.",
]

// Utility to convert URLs in text to clickable links
function linkify(text: string) {
  if (typeof text !== "string") text = ""; // Ensure text is always a string
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-blue-400 hover:text-blue-600 break-all"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

// --- 1. Add engaging interim messages array at the top ---
const interimMessages = [
  "Let me look into it...",
  "One moment, checking that for you...",
  "Thinking...",
  "Let me find the best answer...",
  "Give me a second to check...",
];

// --- Add validation constants at the top ---
const VAPI_API_KEY = "95bef362-49e4-4fc2-9615-ef928e098e08";
const VAPI_ASSISTANT_ID = "de7ab346-4f1e-4740-97a8-0afca89121cd";

// --- Add validation function ---
const validateVapiConfig = () => {
  const errors = [];
  
  if (!VAPI_API_KEY || VAPI_API_KEY.length < 10) {
    errors.push("Invalid Vapi API key");
  }
  
  if (!VAPI_ASSISTANT_ID || VAPI_ASSISTANT_ID.length < 10) {
    errors.push("Invalid Vapi assistant ID");
  }
  
  return errors;
};

// --- Add unique ID generator function ---
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const ChatPage: NextPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  // Always start with a greeting message
  const [messages, setMessages] = useState<Message[]>(
    [
      {
        id: "greeting",
        content: "Hello! I'm your Aven AI assistant. How can I help you today?",
        sender: "ai",
        timestamp: new Date().toISOString(),
        type: "text",
      },
    ]
  )
  const [inputValue, setInputValue] = useState("")
  const [isOnCall, setIsOnCall] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const userId = typeof window !== "undefined" ? getOrCreateUserId() : ""
  const [mockIndex, setMockIndex] = useState(0)
  const [showMock, setShowMock] = useState(false)
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [vapi, setVapi] = useState<Vapi | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([])
  // --- Add muted state ---
  const [isMuted, setIsMuted] = useState(false);
  // --- Add error state for Vapi errors ---
  const [vapiError, setVapiError] = useState<string | null>(null);
  // Add vapiMessages state for storing Vapi voice user messages
  const [vapiMessages, setVapiMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("aven_vapi_history");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  useEffect(() => {
    // Load theme from localStorage on mount
    setIsDarkMode(getStoredTheme())
  }, [])

  const themeClasses = isDarkMode
    ? "bg-gradient-to-b from-[#0B0B0B] to-[#141414] text-white"
    : "bg-gradient-to-b from-white to-gray-50 text-gray-900"

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, showMock])

  // Persist last 10 messages (user & AI) in localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const last10 = messages.slice(-10);
      localStorage.setItem("aven_chat_history", JSON.stringify(last10));
    }
  }, [messages]);
  // Persist vapiMessages in localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("aven_vapi_history", JSON.stringify(vapiMessages));
    }
  }, [vapiMessages]);

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isOnCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isOnCall])

  // Mock message interval
  useEffect(() => {
    if (showMock) {
      mockIntervalRef.current = setInterval(() => {
        setMockIndex((prev) => (prev + 1) % mockMessages.length)
      }, 1800)
    } else if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
      setMockIndex(0)
    }
    return () => {
      if (mockIntervalRef.current) clearInterval(mockIntervalRef.current)
    }
  }, [showMock])

  // Vapi integration and transcript as chat messages
  useEffect(() => {
    // Validate configuration first
    const configErrors = validateVapiConfig();
    if (configErrors.length > 0) {
      console.error("[Vapi] Configuration errors:", configErrors);
      setVapiError(`Vapi configuration error: ${configErrors.join(", ")}`);
      return;
    }

    console.log("[Vapi] Initializing with assistant ID:", VAPI_ASSISTANT_ID);
    
    let vapiInstance: Vapi | null = null;
    
    try {
      vapiInstance = new Vapi(VAPI_API_KEY);
      console.log("[Vapi] Instance created");

      vapiInstance.on("call-start", () => {
        console.log("[Vapi] Call started");
        setIsConnected(true);
        // Greet user on call start only if connected
        const greeting = "Hello! I'm your Aven AI assistant. How can I help you today?";
        if (vapiInstance && isConnected) {
          vapiInstance.say(greeting);
          setMessages((prev) => [
            ...prev,
            {
              id: generateUniqueId(),
              content: greeting,
              sender: "ai",
              timestamp: new Date().toISOString(),
              type: "text",
            },
          ]);
        }
      });
      vapiInstance.on("call-end", () => {
        console.log("[Vapi] Call ended");
        setIsConnected(false);
        setIsSpeaking(false);
        setIsOnCall(false); // End call in UI as well
      });

      vapiInstance.on("speech-start", () => {
        console.log("[Vapi] Speech started");
        setIsSpeaking(true);
      });
      vapiInstance.on("speech-end", () => {
        console.log("[Vapi] Speech ended");
        setIsSpeaking(false);
      });

      vapiInstance.on("error", (err: any) => {
        console.error("[Vapi] Error event:", err);
        setIsConnected(false);

        // Log all error details for debugging
        if (err && err.error) {
          console.error("[Vapi] Detailed error:", err.error);
        }

        if (err.type === 'start-method-error') {
          setVapiError("Failed to start call. Please check your assistant configuration.");
        } else if (err.errorMsg === 'Meeting has ended') {
          if (err.error?.endedReason?.includes('deep-seek-llm-failed')) {
            setVapiError("AI model temporarily unavailable. Please try again in a moment.");
          } else if (err.error?.endedReason?.includes('error-vapifault')) {
            setVapiError("Connection error. Please check your internet and try again.");
          } else {
            setVapiError("Call ended unexpectedly. Please try again.");
          }
        } else {
          setVapiError("An error occurred with the voice assistant. Please try again.");
        }
      });

      vapiInstance.on("message", async (message) => {
        console.log("[Vapi] Message event:", message);
        if (message.type === "transcript" && message.role === "user") {
          const userMessage = message.transcript;
          if (vapiInstance) {
            await handleVapiUserMessage(userMessage, vapiInstance);
          }
        }
      });
    } catch (error) {
      console.error("[Vapi] Failed to initialize:", error);
      setIsConnected(false);
      setVapiError("Failed to initialize voice assistant.");
    }
    
    setVapi(vapiInstance);
    
    return () => {
      if (vapiInstance) {
        vapiInstance.stop();
      }
    };
  }, []);

  // Refined handleVapiUserMessage: only store in vapiMessages, do not update messages or call backend
  const handleVapiUserMessage = async (userMessage: string, vapiInstance: Vapi) => {
    // Store transcript as Vapi message only (not in chat UI)
    const vapiMsg: Message = {
      id: generateUniqueId(),
      content: userMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
      type: "text",
    };
    setVapiMessages((prev) => [...prev, vapiMsg]);
    setTranscript((prev) => [...prev, { role: "user", text: userMessage }]);

    // Show/say interim message (not in UI, just say)
    const interim = interimMessages[Math.floor(Math.random() * interimMessages.length)];
    if (isConnected) vapiInstance.say(interim);

    // No backend call, no UI update for Vapi user messages
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    setStoredTheme(newTheme)
  }

  // Refined sendMessage: combine chat and vapi messages for backend
  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    let newUserMessage: Message = {
      id: generateUniqueId(),
      content: inputValue,
      sender: "user",
      timestamp: new Date().toISOString(),
      type: "text",
    };
    setMessages((prev) => [...prev, newUserMessage]);

    const userPrompt = inputValue.trim();
    if (!userPrompt) return;

    setInputValue("");

    // If on call, do NOT call the API, just show the message
    if (isOnCall) {
      return;
    }

    setShowMock(true); // Show mock message

    // Combine last 10 chat messages and all vapiMessages for backend
    const last10 = [...messages, newUserMessage].slice(-10);
    const chatHistory = [
      ...vapiMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content,
      })),
      ...last10.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userPrompt,
          chatHistory,
          userId,
        }),
      });

      if (!res.ok) {
        // Log HTTP error status and response
        const errorText = await res.text();
        console.error("API HTTP error:", res.status, errorText);
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      if (!data || !data.response) {
        // Log missing response field
        console.error("API returned invalid data:", data);
        throw new Error("Invalid AI response");
      }

      setShowMock(false); // Hide mock message
      setMessages((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          content: data.response || "No response.",
          sender: "ai",
          timestamp: new Date().toISOString(),
          type: "text",
        },
      ]);
    } catch (err) {
      setShowMock(false); // Hide mock message
      // Log error details
      console.error("Error contacting AI:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          content: "Error contacting AI.",
          sender: "ai",
          timestamp: new Date().toISOString(),
          type: "text",
        },
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isOnCall) { // Disable Enter key when on call
      e.preventDefault()
      sendMessage()
    }
  }

  // --- 2. Update toggleCall to increase listening time (endOfTurnSilenceThreshold) ---
  const toggleCall = () => {
    if (!isOnCall) {
      // Clear any previous errors
      setVapiError(null);
      
      setIsOnCall(true);
      setCallDuration(0);
      
      // Validate before starting
      const configErrors = validateVapiConfig();
      if (configErrors.length > 0) {
        setVapiError(`Cannot start call: ${configErrors.join(", ")}`);
        setIsOnCall(false);
        return;
      }
      
      console.log("[Vapi] Starting call with assistant:", VAPI_ASSISTANT_ID);
      if (vapi) vapi.start(VAPI_ASSISTANT_ID);
    } else {
      setIsOnCall(false);
      if (vapi) vapi.stop();
    }
  };

  // --- 3. Remove unused startCall/endCall (now handled in toggleCall) ---
  // --- 4. In Vapi useEffect, greet user on call-start ---

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl)
    audio.play()
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses}`}>
      <div className="h-screen flex">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "w-64" : "w-16"} transition-all duration-300 ${
            isDarkMode ? "bg-black border-white/10" : "bg-white border-gray-200"
          } border-r flex flex-col`}
        >
          {/* Sidebar Header */}
          <div
            className={`p-4 border-b ${isDarkMode ? "border-white/10" : "border-gray-200"} flex items-center justify-between`}
          >
            {sidebarOpen && (
              <div className="flex items-center space-x-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-white" : "bg-black"}`}
                >
                  <span className={`font-bold text-sm ${isDarkMode ? "text-black" : "text-white"}`}>A</span>
                </div>
                <span className="text-xl font-bold font-['Canela','Georgia','serif']">Aven</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 ${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </Button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 p-4">
            <div className="space-y-2">
              <Link href="/settings">
                <Button
                  variant="ghost"
                  className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"} p-3 ${
                    isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
                  }`}
                >
                  <Settings size={20} />
                  {sidebarOpen && <span className="ml-3">Settings</span>}
                </Button>
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <div className={`p-4 border-t ${isDarkMode ? "border-white/10" : "border-gray-200"} space-y-2`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"} p-3 ${
                isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
              }`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {sidebarOpen && <span className="ml-3">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>}
            </Button>
            <Link href="/">
              <Button
                variant="ghost"
                className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"} p-3 ${
                  isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
                }`}
              >
                <ArrowLeft size={20} />
                {sidebarOpen && <span className="ml-3">Back to Home</span>}
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div
            className={`${
              isDarkMode ? "bg-black border-white/10" : "bg-white border-gray-200"
            } border-b p-4 flex items-center justify-between`}
          >
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-blue-600 text-white">
                  <Bot size={20} />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Aven AI Assistant</h2>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Always here to help</p>
              </div>
            </div>

            {/* Call Status or Call Button */}
            <div className="flex items-center space-x-2">
              {isOnCall ? (
                <div className="flex items-center space-x-3 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    On call - {formatDuration(callDuration)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCall}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <PhoneOff size={16} />
                  </Button>
                  {/* Vapi connection status UI */}
                  <span className={`ml-2 text-xs px-2 py-1 rounded ${isConnected ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                    {isConnected ? "Vapi Connected" : "Vapi Disconnected"}
                  </span>
                  {isSpeaking && (
                    <span className="ml-2 text-xs px-2 py-1 rounded bg-blue-600 text-white animate-pulse">
                      Speaking...
                    </span>
                  )}
                </div>
              ) : (
                <Button
                  onClick={toggleCall}
                  className={`${
                    isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                  } rounded-full px-4 py-2`}
                >
                  <Phone size={16} className="mr-2" />
                  <span className="hidden sm:inline">Call AI</span>
                </Button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {!isOnCall && (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`flex items-start space-x-3 max-w-xs sm:max-w-md lg:max-w-2xl ${
                        message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                      }`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback
                          className={message.sender === "user" ? "bg-gray-600 text-white" : "bg-blue-600 text-white"}
                        >
                          {message.sender === "user" ? <User size={16} /> : <Bot size={16} />}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.sender === "user"
                            ? "bg-blue-600 text-white rounded-br-md"
                            : isDarkMode
                              ? "bg-white/10 border border-white/20 text-white rounded-bl-md"
                              : "bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">
                          {message.sender === "ai" ? linkify(message.content ?? "") : message.content}
                        </p>
                        <p
                          className={`text-xs mt-2 ${
                            message.sender === "user" ? "text-blue-100" : isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {message.timestamp.slice(11, 16)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {showMock && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3 max-w-xs sm:max-w-md lg:max-w-2xl">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-blue-600 text-white">
                          <Bot size={16} />
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`px-4 py-3 rounded-2xl shadow animate-pulse ${
                          isDarkMode
                            ? "bg-blue-900/80 border border-blue-700 text-white"
                            : "bg-blue-50 border border-blue-200 text-blue-900"
                        }`}
                      >
                        <p className="text-sm leading-relaxed font-medium">{mockMessages[mockIndex]}</p>
                        <p className={`text-xs mt-2 ${isDarkMode ? "text-blue-200" : "text-blue-600"}`}>Aven is thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input Area */}
          <div className={`${isDarkMode ? "bg-black border-white/10" : "bg-white border-gray-200"} border-t p-4`}>
            <div className="max-w-4xl mx-auto">
              <Card className={`${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} shadow-sm ${isOnCall ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-end space-x-3">
                    {/* Text Input */}
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isOnCall ? "Voice call active - text messaging disabled" : "Type your message..."}
                        className={`min-h-[44px] max-h-32 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm ${
                          isDarkMode ? "bg-transparent text-white placeholder:text-gray-400" : "bg-transparent"
                        }`}
                        rows={1}
                        disabled={isOnCall}
                      />
                    </div>

                    {/* Voice/Send Button */}
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={sendMessage}
                        disabled={!inputValue.trim() || isOnCall}
                        className={`${
                          isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                        } rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Send size={18} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div
                className={`mt-3 flex items-center justify-center space-x-4 text-xs ${
                  isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                {isOnCall ? (
                  <span className="text-blue-600">Voice call active - use voice to communicate</span>
                ) : (
                  <>
                    <span>Press Enter to send</span>
                    <span>•</span>
                    <span>Shift + Enter for new line</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Call Window */}
        {isOnCall && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className={`w-full max-w-md ${isDarkMode ? "bg-black border-white/20" : "bg-white"}`}>
              <CardContent className="p-6 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot size={40} className="text-white" />
                  </div>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Aven AI Assistant</h3>
                  <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Voice call active</p>
                </div>

                <div className="mb-6">
                  <div className={`text-2xl font-mono mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{formatDuration(callDuration)}</div>
                  <div className="flex justify-center space-x-1">
                    <div className="w-2 h-8 bg-blue-500 rounded animate-pulse"></div>
                    <div className="w-2 h-6 bg-blue-400 rounded animate-pulse delay-100"></div>
                    <div className="w-2 h-10 bg-blue-500 rounded animate-pulse delay-200"></div>
                    <div className="w-2 h-4 bg-blue-300 rounded animate-pulse delay-300"></div>
                    <div className="w-2 h-8 bg-blue-500 rounded animate-pulse delay-400"></div>
                  </div>
                </div>

                {/* Error display */}
                {vapiError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm text-red-700">{vapiError}</span>
                    </div>
                    <button 
                      onClick={() => setVapiError(null)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Loading indicator until Vapi is connected */}
                {!isConnected && !vapiError && (
                  <div className="mb-4 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-sm text-blue-500">Connecting to voice agent...</span>
                  </div>
                )}

                <div className="flex justify-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-12 h-12 rounded-full ${isDarkMode ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200"}`}
                    onClick={() => {
                      if (vapi) {
                        vapi.setMuted(!isMuted);
                        setIsMuted((prev) => !prev);
                      }
                    }}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <Mic size={20} className="opacity-50" /> : <Mic size={20} />}
                  </Button>
                  <Button
                    onClick={toggleCall}
                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  >
                    <PhoneOff size={20} />
                  </Button>
                </div>
                {/* Vapi connection status UI in call window */}
                <div className="mt-4">
                  <span className={`text-xs px-2 py-1 rounded ${isConnected ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                    {isConnected ? "Vapi Connected" : "Vapi Disconnected"}
                  </span>
                  {isSpeaking && (
                    <span className="ml-2 text-xs px-2 py-1 rounded bg-blue-600 text-white animate-pulse">
                      Speaking...
                    </span>
                  )}
                  {isMuted && (
                    <span className="ml-2 text-xs px-2 py-1 rounded bg-yellow-500 text-white">Muted</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatPage
