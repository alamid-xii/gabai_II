import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { MessageCircle, X, Trash2 } from "lucide-react";
import { QAChat } from "../pages/QAChat";

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const chatRef = useRef(null);

  // Hide floating button on the standalone /qa route
  const isStandaloneChat = location.pathname === "/qa";

  // Lock background scroll when full-screen chat is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Support closing with Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (isStandaloneChat) return null;

  return (
    <>
      {/* ── Full-Screen Chatbot Modal Overlay ── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="GabAI Admissions Assistant"
          className="fixed inset-0 z-50 bg-[#FFFDF0] flex flex-col animate-fadeIn"
        >
          {/* Full-Screen Header Bar */}
          <header className="bg-linear-to-r from-[#001840] via-[#102A71] to-[#001840] text-white px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between shadow-lg shrink-0">
            <div className="flex items-center gap-3">
              <img
                src="/GabAi_Logo.png"
                alt="GabAI Logo"
                className="w-10 h-10 rounded-xl object-contain shadow-md shrink-0 bg-[#F5C400]"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base sm:text-lg tracking-wide text-white">
                    GabAI Assistant
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#FFDC5F] bg-white/10 px-2.5 py-0.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-[#FFDC5F]/80 leading-tight">
                  Eastern Mindoro College Admissions AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => chatRef.current?.clearChat()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFDC5F] hover:text-white text-xs sm:text-sm font-semibold transition-colors"
                aria-label="Clear chat history"
                title="Clear chat history"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors"
                aria-label="Close chatbot"
                title="Close chatbot (Esc)"
              >
                <X className="w-5 h-5" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </header>

          {/* Full Screen QAChat Interface */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <QAChat ref={chatRef} onClose={() => setOpen(false)} isOverlay={true} />
          </div>
        </div>
      )}

      {/* ── Floating Action Button (FAB) ── */}
      {!open && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2">
          {/* Tooltip bubble (desktop) */}
          <div className="hidden sm:flex items-center gap-2 bg-[#001840] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-[#F5C400]/30 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-[#F5C400] animate-pulse" />
            <span>Ask GabAI</span>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative bg-linear-to-br from-[#102A71] to-[#001840] hover:from-[#001840] hover:to-[#102A71] text-white w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-[#F5C400]"
            aria-label="Open GabAI Admissions Chatbot"
            title="Open GabAI Admissions Chatbot"
          >
            <MessageCircle className="w-7 h-7 text-[#FFDC5F] group-hover:scale-110 transition-transform" />

            {/* Pulsing indicator */}
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F5C400] rounded-full border-2 border-white animate-pulse" />
          </button>
        </div>
      )}
    </>
  );
}
