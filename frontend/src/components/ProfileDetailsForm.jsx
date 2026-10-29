import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { API } from "../config/api";

const NAME_PATTERN = /^[\p{L}\p{M}\s'\u2019-]+$/u;
const fields = [
  { key: "firstName", label: "First name", autoComplete: "given-name", required: true },
  { key: "middleName", label: "Middle name (optional)", autoComplete: "additional-name" },
  { key: "lastName", label: "Last name", autoComplete: "family-name", required: true },
  { key: "mobileNumber", label: "Mobile number", autoComplete: "tel", required: true },
];

export function ProfileDetailsForm({ user, onSaved, onCancel, submitLabel = "Save details" }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(({ key }) => [key, user?.[key] || ""])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    const details = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    for (const { key, label, required } of fields.slice(0, 3)) {
      if ((required && !details[key]) || (details[key] && (!NAME_PATTERN.test(details[key]) || !/\p{L}/u.test(details[key])))) {
        setError(`${label.replace(" (optional)", "")} must contain letters, spaces, apostrophes or hyphens.`);
        return;
      }
    }
    if ([details.firstName, details.middleName, details.lastName].filter(Boolean).join(" ").length > 255) {
      setError("Your full name must be no longer than 255 characters.");
      return;
    }
    if (!/^09[0-9]{9}$/.test(details.mobileNumber)) {
      setError("Enter a valid mobile number: exactly 11 digits starting with 09.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(details),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || "Unable to save your details.");
      onSaved(result.user);
    } catch (err) {
      setError(err.message || "Unable to connect. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(({ key, label, required, autoComplete }) => <div key={key} className="space-y-2">
        <label htmlFor={`profile-${key}`} className="block text-sm font-semibold text-[#001840]">{label}{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}</label>
        <input id={`profile-${key}`} name={key} value={values[key]} onChange={(event) => {
          const value = key === "mobileNumber" ? event.target.value.replace(/[^0-9]/g, "").slice(0, 11) : event.target.value.slice(0, 100);
          setValues((previous) => ({ ...previous, [key]: value }));
        }} onPaste={(event) => {
          if (key !== "mobileNumber") event.preventDefault();
        }} type={key === "mobileNumber" ? "tel" : "text"} inputMode={key === "mobileNumber" ? "numeric" : undefined} autoComplete={autoComplete} required={required} maxLength={key === "mobileNumber" ? 11 : 100} disabled={saving} placeholder={key === "mobileNumber" ? "09171234567" : undefined} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/30 disabled:opacity-60" />
      </div>)}
    </div>
    <div className="flex flex-wrap gap-3">
      <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102A71] px-5 py-3 text-sm font-semibold text-white hover:bg-[#001840] disabled:opacity-60">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{saving ? "Saving..." : submitLabel}</button>
      {onCancel && <button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-gray-200 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60">Cancel</button>}
    </div>
  </form>;
}
