import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Sparkles, Send, Bot, User as UserIcon, Calendar, Loader2, RefreshCw, Milestone, MessageCircleCode 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export const AssistantTab: React.FC = () => {
  const { synchronizedFetch, dbUser } = useAuth();
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello ${dbUser?.fullName || 'there'}! I am **MediSense AI**, your personalized wellness and health coach. 

I can help clarify complex diagnostic medical terms, outline active workouts, or answer inquiries regarding nutrition, rest, and vitals. How can I assist your lifestyle goals today?`
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Wellness Plan state
  const [wellnessPlan, setWellnessPlan] = useState<string | null>(null);
  const [compilingPlan, setCompilingPlan] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const activeText = customPrompt || inputVal;
    if (!activeText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: activeText
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputVal('');
    setLoadingChat(true);

    try {
      // Map history to server expectations: { role: 'user'|'assistant', text: string }
      const historyPayload = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await synchronizedFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: activeText,
          history: historyPayload
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: data.text
        }]);
      } else {
        const err = await res.json();
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `**Connection Issue**: ${err.error || 'The server returned an error.'}`
        }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'An unexpected connection failure occurred while communicating with Gemini.'
      }]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleCompilePlan = async () => {
    try {
      setCompilingPlan(true);
      setWellnessPlan(null);
      const res = await synchronizedFetch('/api/ai/wellness-plan', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setWellnessPlan(data.wellnessPlanMarkdown);
      } else {
        const err = await res.json();
        setWellnessPlan(`**Error compiling schedule**: ${err.error || 'Server rejected request'}`);
      }
    } catch (e) {
      console.error('Plan compiler crashed:', e);
      setWellnessPlan('A connection breakdown disrupted plan generation.');
    } finally {
      setCompilingPlan(false);
    }
  };

  const promptChips = [
    "Explain what high MCV and LDL denotes simply",
    "Give me standard hydration rules for active training",
    "How does high diastolic pressure affect resting pulse?",
    "Suggest a simple 10-minute cardiovascular warmup"
  ];

  return (
    <div id="assistant-tab-container" className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      
      {/* Interactive Chat Pane */}
      <div className="lg:col-span-3 flex flex-col h-[600px] border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/40 rounded-3xl overflow-hidden shadow-xs">
        
        {/* Chat top header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-850 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-emerald-950/20 text-indigo-505 dark:text-emerald-400 border border-indigo-100 dark:border-emerald-900/30 rounded-2xl">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">Interactive Health Assistant</h3>
            <span className="text-[10px] font-mono text-slate-400">Powered by Gemini AI - Virtual coaching and term translation</span>
          </div>
        </div>

        {/* Scrollable conversation logs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => {
            const isAss = m.role === 'assistant';
            return (
              <div
                id={`chat-bubble-${m.id}`}
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${isAss ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div className={`p-2 rounded-xl border shrink-0 h-9 w-9 flex items-center justify-center ${
                  isAss 
                    ? 'bg-indigo-50 text-indigo-650 dark:bg-emerald-950/20 dark:text-emerald-400 border-indigo-100 dark:border-emerald-900/30' 
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white border-transparent'
                }`}>
                  {isAss ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                </div>

                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  isAss 
                    ? 'bg-slate-50 dark:bg-slate-955/65 border border-slate-100 dark:border-slate-850/50 text-slate-800 dark:text-slate-300' 
                    : 'bg-slate-900 dark:bg-emerald-600 text-white border-transparent dark:text-white'
                }`}>
                  <div className="markdown-body font-sans space-y-2 prose prose-sm dark:prose-invert">
                    <Markdown>{m.text}</Markdown>
                  </div>
                </div>
              </div>
            );
          })}
          
          {loadingChat && (
            <div className="flex gap-3 max-w-[85%] mr-auto items-center">
              <div className="p-2 bg-indigo-50 dark:bg-emerald-955/20 text-indigo-650 dark:text-emerald-400 border border-indigo-100 rounded-xl">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <span className="text-xs text-slate-400 font-mono">MediSense AI is researching references...</span>
            </div>
          )}
          <div ref={bottomRef}></div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-slate-50/40 border-t border-slate-50 dark:border-slate-850/50 flex gap-2 overflow-x-auto pr-2 shrink-0">
          {promptChips.map((chip, idx) => (
            <button
              id={`chip-${idx}`}
              key={idx}
              onClick={(e) => handleSendMessage(e, chip)}
              disabled={loadingChat}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 rounded-full text-[10px] font-sans whitespace-nowrap cursor-pointer hover:border-slate-350 shrink-0 select-none shadow-xs disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Form fields input area */}
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-50/85 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-850 flex gap-2 shrink-0">
          <input
            id="chat-input-field"
            type="text"
            required
            placeholder="Type health question (e.g., standard BMI levels)..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={loadingChat}
            className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-900 dark:text-white"
          />
          <button
            id="chat-submit-btn"
            type="submit"
            disabled={loadingChat || !inputVal.trim()}
            className="p-3 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-850 dark:hover:bg-emerald-500 text-white rounded-xl cursor-pointer disabled:opacity-45"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* Wellness Plan compiles area */}
      <div className="lg:col-span-2 flex flex-col h-[600px] border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/40 rounded-3xl overflow-hidden shadow-xs">
        
        {/* Planner Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-850/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Wellness Plan Compiler</h3>
          </div>
          
          <button
            id="btn-re-compile-plan"
            onClick={handleCompilePlan}
            disabled={compilingPlan}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-300 cursor-pointer"
            title="Compile schedule"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${compilingPlan ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Render markdown Wellness guide output */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
          {compilingPlan ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-505 dark:text-emerald-400" />
              <span className="text-xs font-mono text-slate-400">Assembling workout charts...</span>
              <span className="text-[10px] text-slate-400/80 font-mono text-center max-w-[200px]">Reading active goals, weight levels and water entries</span>
            </div>
          ) : wellnessPlan ? (
            <div className="markdown-body font-sans text-xs text-slate-650 dark:text-slate-300 leading-relaxed whitespace-pre-wrap prose prose-sm dark:prose-invert">
              <Markdown>{wellnessPlan}</Markdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-500 border border-amber-100/30 rounded-2xl mb-4">
                <Milestone className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-white">Personalized Weekly Outline</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                Generates physical exercises, hydration rules, and sleep plans mapped specifically against your recorded goals.
              </p>
              
              <button
                id="btn-trigger-wellness-plan"
                onClick={handleCompilePlan}
                className="mt-6 px-5 py-2.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-805 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Compile Wellness Guide
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
export default AssistantTab;
