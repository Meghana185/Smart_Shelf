import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import client from '../api/client';
import {
  X,
  Send,
  ChefHat,
  Lightbulb,
  Utensils,
  Trash2,
  Bot
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatbotModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  initialPrompt?: string;
  customerIngredients?: string[];
}

const DEFAULT_SUGGESTIONS = [
  '🍳 What can I cook with my purchased items?',
  '⏱️ Give me a 15-minute quick dinner recipe',
  '🥗 Healthy meal ideas using fresh ingredients',
  '💡 How to store fresh food longer to prevent expiry?'
];

export const AIChatbotModal: React.FC<AIChatbotModalProps> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  onOpen: externalOnOpen,
  initialPrompt,
  customerIngredients = []
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I'm Chef Smarty 👨‍🍳, your personal culinary AI assistant! Ask me any question about recipes, cooking techniques, ingredient substitutions, or how to use up your purchased items!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => {
    if (isOpen) {
      if (externalOnClose) {
        externalOnClose();
      } else {
        setInternalIsOpen(false);
      }
    } else {
      if (externalOnOpen) {
        externalOnOpen();
      } else {
        setInternalIsOpen(true);
      }
    }
  };

  useEffect(() => {
    if (initialPrompt && isOpen) {
      setInputMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await client.post('/chatbot/chat/', {
        messages: conversationHistory
      });

      const replyText = res.data?.reply || "I'm here to help with your cooking questions! What would you like to make?";

      const aiMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Chatbot API error:', err);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Chef Smarty 👨‍🍳: I'm currently adjusting my recipes! Feel free to ask me anything about your ingredients or meal ideas.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat history reset! I'm Chef Smarty 👨‍🍳. What delicious dish would you like to create today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 p-3.5 sm:p-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full shadow-2xl flex items-center gap-2 group transition-all duration-300 transform hover:scale-105 border border-emerald-400/40"
          title="Open AI Culinary Chatbot"
        >
          <div className="relative">
            <ChefHat className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
            </span>
          </div>
          <span className="font-extrabold text-xs sm:text-sm pr-1">Ask Chef Smarty AI</span>
        </button>
      )}

      {/* Interactive Chatbot Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-2xl h-[100dvh] sm:h-[680px] max-h-[100dvh] sm:max-h-[92vh] bg-white border-0 sm:border border-slate-200 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 p-0.5 flex items-center justify-center shadow-md">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-emerald-700" />
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Chef Smarty AI</h3>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearHistory}
                  className="p-2 text-emerald-100 hover:text-white hover:bg-emerald-800/60 rounded-xl transition"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleChat}
                  className="p-2 text-emerald-100 hover:text-white hover:bg-emerald-800/60 rounded-xl transition"
                  title="Close Chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Purchased Ingredients Context Strip */}
            {customerIngredients.length > 0 && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
                <Utensils className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-slate-700 shrink-0 font-bold">Your Kitchen:</span>
                <div className="flex gap-1.5 overflow-x-auto">
                  {customerIngredients.map((item, idx) => (
                    <span
                      key={idx}
                      onClick={() => setInputMessage(`Suggest a recipe using ${item}`)}
                      className="cursor-pointer bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0 font-mono text-[11px] font-bold transition"
                    >
                      + {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-emerald-700" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl p-4 text-xs space-y-1.5 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none font-normal'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap leading-relaxed text-xs font-semibold">{msg.content}</div>
                    ) : (
                      <div className="prose prose-xs max-w-none text-slate-800 space-y-2 leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className="overflow-x-auto my-3 border border-slate-200 rounded-xl shadow-xs">
                                <table className="w-full text-left text-xs border-collapse" {...props} />
                              </div>
                            ),
                            thead: ({ node, ...props }) => (
                              <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200" {...props} />
                            ),
                            th: ({ node, ...props }) => (
                              <th className="px-3.5 py-2 border-r border-slate-200 last:border-r-0 font-extrabold text-slate-900" {...props} />
                            ),
                            td: ({ node, ...props }) => (
                              <td className="px-3.5 py-2 text-slate-800 border-r border-slate-100 last:border-r-0 font-medium bg-white" {...props} />
                            ),
                            tr: ({ node, ...props }) => (
                              <tr className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0" {...props} />
                            ),
                            blockquote: ({ node, ...props }) => (
                              <blockquote className="my-2.5 p-3 bg-emerald-50/80 border-l-4 border-emerald-500 rounded-r-xl text-xs text-emerald-900 font-semibold shadow-xs" {...props} />
                            ),
                            h1: ({ node, ...props }) => (
                              <h1 className="text-base font-black text-slate-900 mt-4 mb-2 border-b border-slate-200 pb-1" {...props} />
                            ),
                            h2: ({ node, ...props }) => (
                              <h2 className="text-sm font-black text-slate-900 mt-3 mb-1.5 border-b border-slate-100 pb-1" {...props} />
                            ),
                            h3: ({ node, ...props }) => (
                              <h3 className="text-xs font-black text-emerald-800 mt-3 mb-1 uppercase tracking-wider" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul className="list-disc list-inside space-y-1 my-2 text-xs font-medium text-slate-800" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol className="list-decimal list-inside space-y-1 my-2 text-xs font-medium text-slate-800" {...props} />
                            ),
                            p: ({ node, ...props }) => (
                              <p className="text-xs text-slate-800 leading-relaxed font-medium my-1" {...props} />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong className="font-extrabold text-slate-900" {...props} />
                            ),
                            hr: ({ node, ...props }) => (
                              <hr className="my-3 border-slate-200" {...props} />
                            ),
                            code: ({ node, ...props }) => (
                              <code className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-emerald-800 font-bold" {...props} />
                            )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    <div
                      className={`text-[10px] text-right mt-1 ${
                        msg.role === 'user' ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="bg-white border border-slate-200 p-3.5 rounded-2xl rounded-bl-none flex items-center gap-2 shadow-sm">
                    <span className="text-xs text-slate-500 font-bold">Chef Smarty is thinking...</span>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestion Box Chips */}
            <div className="p-3 bg-white border-t border-slate-200 overflow-x-auto space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider px-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Suggestion Box:</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {DEFAULT_SUGGESTIONS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMessage(chip)}
                    disabled={loading}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-bold border border-slate-200 hover:border-emerald-300 transition shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex gap-2 items-center"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Chef Smarty for recipes, tips, or ingredients..."
                disabled={loading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium transition"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 transition shadow-md shadow-emerald-950/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
