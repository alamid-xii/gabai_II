import { useState } from "react";
import { Link, useLocation } from "react-router";
import { MessageCircle, X, Sparkles, ArrowRight } from "lucide-react";

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Hide on the Q&A page itself
  if (location.pathname === "/qa") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Popup Card */}
      {open && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 overflow-hidden animate-fade-in">
          {/* Card Header */}
          <div className="bg-linear-to-r from-[#001840] to-[#102A71] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-[#F5C400] w-8 h-8 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#001840]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">GabAI Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#FFDC5F] rounded-full animate-pulse" />
                  <span className="text-[#FFDC5F] text-xs">Online · Ready to help</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Card Body */}
          <div className="p-5">
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 bg-[#102A71] rounded-full flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#FFDC5F]" />
              </div>
              <div className="bg-[#FFDC5F]/30 border border-[#FFDC5F]/40 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-[#001840] leading-relaxed">
                Hi! I'm GabAI — your EMC Admission Assistant. Ask me anything about JHS, SHS strands, enrollment, or requirements!
              </div>
            </div>

            {/* Quick prompts */}
            <div className="space-y-2 mb-4">
              {[
                "What SHS strands are available?",
                "How do I apply for Grade 7 SSC?",
                "What are the admission requirements?",
              ].map((q) => (
                <Link
                  key={q}
                  to={`/qa`}
                  state={{ question: q }}
                  className="flex items-center justify-between w-full text-left text-sm text-[#102A71] bg-[#FFFDF0] hover:bg-[#FFDC5F]/30 border border-[#FFDC5F]/40 hover:border-[#FFDC5F] px-3 py-2 rounded-xl transition-colors duration-150 group"
                >
                  <span>{q}</span>
                  <ArrowRight className="w-3 h-3 text-[#F5C400] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>

            <Link
              to="/qa"
              className="flex items-center justify-center gap-2 bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] font-semibold text-sm px-4 py-3 rounded-xl transition-colors duration-150 w-full"
            >
              Open Full Chat
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative bg-[#102A71] hover:bg-[#001840] text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label="Open chat assistant"
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}

        {/* Yellow pulse badge */}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F5C400] rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </div>
  );
}
