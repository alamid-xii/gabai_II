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

export function subscribeConfirmation(listener) {
  openConfirmListener = listener;
  return () => { if (openConfirmListener === listener) openConfirmListener = null; };
}
