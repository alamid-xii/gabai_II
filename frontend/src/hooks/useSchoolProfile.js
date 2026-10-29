import { useEffect, useSyncExternalStore } from 'react';
import { API } from '../config/api';

let snapshot = { profile: null, error: '' };
let pending;
let loaded = false;
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const getSnapshot = () => snapshot;
export function refreshSchoolProfile() {
  if (pending) return pending;
  pending = fetch(`${API}/school-profile`, { cache: 'no-store' }).then(async response => {
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'School profile unavailable');
    snapshot = { profile: data.content, error: '' }; loaded = true;
  }).catch(() => { snapshot = { ...snapshot, error: 'School contact information is temporarily unavailable.' }; })
    .finally(() => { pending = null; listeners.forEach(listener => listener()); });
  return pending;
}
export function useSchoolProfile() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!loaded) refreshSchoolProfile();
    const onFocus = () => refreshSchoolProfile();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  return value;
}
