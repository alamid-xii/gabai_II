import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, HelpCircle, X } from "lucide-react";

let openConfirmListener = null;

/**
 * Open a custom confirmation modal instead of native window.confirm().
 * @param {string | { title?: string, message: string, confirmText?: string, cancelText?: string, variant?: 'danger' | 'warning' | 'primary' }} options
 * @returns {Promise<boolean>}
 */
export function confirmAction(options) {
  const normalized =
    typeof options === "string"
      ? {
          title: /delete|remove|clear|discard|reset/i.test(options) ? "Confirm Action" : "Please Confirm",
          message: options,
          confirmText: /delete/i.test(options)
            ? "Delete"
            : /remove/i.test(options)
              ? "Remove"
              : /clear/i.test(options)
                ? "Clear"
                : /reset/i.test(options)
                  ? "Reset"
                  : /discard|reload/i.test(options)
                    ? "Discard & Reload"
                    : "Confirm",
          cancelText: "Cancel",
          variant: /delete|remove|clear|discard|reset/i.test(options) ? "danger" : "primary",
        }
      : {
          title: options?.title || "Confirm Action",
          message: options?.message || "Are you sure you want to continue?",
          confirmText: options?.confirmText || "Confirm",
          cancelText: options?.cancelText || "Cancel",
          variant: options?.variant || "danger",
        };

  if (!openConfirmListener) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    openConfirmListener({ ...normalized, resolve });
  });
}

export function ConfirmModal() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    openConfirmListener = (req) => setDialog(req);
    return () => {
      if (openConfirmListener) openConfirmListener = null;
    };
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        dialog.resolve(false);
        setDialog(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog]);

  if (!dialog) return null;

  const handleClose = (result) => {
    dialog.resolve(result);
    setDialog(null);
  };

  const isDanger = dialog.variant === "danger";
  const isWarning = dialog.variant === "warning";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose(false);
      }}
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150 relative">
        <button
          type="button"
          onClick={() => handleClose(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-xs ${
            isDanger
              ? "bg-red-50 text-red-600 border-red-100"
              : isWarning
                ? "bg-amber-50 text-amber-600 border-amber-100"
                : "bg-blue-50 text-[#102A71] border-blue-100"
          }`}
        >
          {isDanger ? (
            /delete|remove|clear/i.test(dialog.confirmText) ? (
              <Trash2 size={24} />
            ) : (
              <AlertTriangle size={24} />
            )
          ) : isWarning ? (
            <AlertTriangle size={24} />
          ) : (
            <HelpCircle size={24} />
          )}
        </div>

        <h3 id="confirm-modal-title" className="text-xl font-black text-[#001840] tracking-tight">
          {dialog.title}
        </h3>
        <p className="text-xs text-gray-500 mt-1.5 mb-6 leading-relaxed max-w-xs mx-auto">
          {dialog.message}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer"
          >
            {dialog.cancelText}
          </button>

          <button
            type="button"
            onClick={() => handleClose(true)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : isWarning
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-[#102A71] hover:bg-[#001840]"
            }`}
          >
            <span>{dialog.confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

