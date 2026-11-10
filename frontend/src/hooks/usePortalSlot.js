import { useCallback, useSyncExternalStore } from 'react';

// Observe DOM-owned header slots without synchronizing them through component state.
export function usePortalSlot(id, create = false, className = '') {
  const subscribe = useCallback(notify => {
    let created = null;
    if (create && !document.getElementById(id)) {
      const title = document.querySelector('header h1');
      const header = title?.closest('header') || document.querySelector('header');
      if (header) {
        created = document.createElement('div');
        created.id = id;
        created.className = className;
        header.appendChild(created);
      }
    }
    const observer = new MutationObserver(notify);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); created?.remove(); };
  }, [id, create, className]);
  const getSnapshot = useCallback(() => document.getElementById(id), [id]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
