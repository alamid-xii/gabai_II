import { useEffect, useState } from 'react';
import { API } from '../config/api';

export function useAdmissionSettings(enrollmentId) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const url = enrollmentId ? `${API}/enrollments/${enrollmentId}/admission-policy` : `${API}/admission-settings`;
    fetch(url, { signal: controller.signal, cache: 'no-store', headers: enrollmentId ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {} }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Could not load admission rules.');
      if (!controller.signal.aborted) { setSettings(data); setError(''); }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [enrollmentId, retry]);
  return { settings, error, retry: () => setRetry(value => value + 1) };
}
export function admissionChecklist(policy, level, type = 'new') {
  return (policy?.requirements[level]?.[type] || []).map(rule => ({ ...rule, label: policy.documents.find(doc => doc.key === rule.key)?.label || rule.key }));
}
