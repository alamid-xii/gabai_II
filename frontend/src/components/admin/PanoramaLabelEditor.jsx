import { useState } from 'react';
import { PanoramaViewer } from '../PanoramaViewer';

export function PanoramaLabelEditor({ src, labels, onChange }) {
  const [text, setText] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [notice, setNotice] = useState('');
  function pick(position) {
    if (!placing || !text.trim()) return;
    const item = { id: selected || crypto.randomUUID(), text: text.trim(), description: description.trim(), ...position };
    onChange(selected ? labels.map(label => label.id === selected ? item : label) : [...labels, item]);
    setPlacing(false); setSelected(item.id); setNotice('Label placed. Save the building to keep your changes.');
  }
  return <section className="rounded-xl border border-gray-200 p-4 space-y-3">
    <h4 className="text-sm font-semibold text-[#001840]">360° image labels</h4>
    <p className="text-xs text-gray-500">Enter a name, select Place label, then click its location in the panorama. Drag to look around. Save the building when finished.</p>
    <div className="grid gap-2">
      <label className="text-sm">Label name<input value={text} maxLength={80} onChange={event => setText(event.target.value)} placeholder="Gym, Computer Lab, Biology Lab…" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <label className="text-sm">Description (optional)<textarea value={description} maxLength={500} onChange={event => setDescription(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
    </div>
    <div className="flex flex-wrap gap-2 text-xs">
      <button type="button" disabled={!text.trim() || (!selected && labels.length >= 40)} onClick={() => { setPlacing(!placing); setNotice(''); }} className="rounded-lg bg-[#001840] text-white px-3 py-2 disabled:opacity-40">{placing ? 'Cancel placement' : selected ? 'Reposition label' : 'Place label'}</button>
      {selected && <>
        <button type="button" disabled={!text.trim()} onClick={() => { onChange(labels.map(label => label.id === selected ? { ...label, text: text.trim(), description: description.trim() } : label)); setNotice('Text updated. Save the building to keep your changes.'); }} className="rounded-lg border px-3 py-2">Apply text changes</button>
        <button type="button" onClick={() => { setSelected(null); setText(''); setDescription(''); setPlacing(false); }} className="rounded-lg border px-3 py-2">New label</button>
      </>}
    </div>
    {placing && <p role="status" className="text-sm font-medium text-amber-800">Click the exact spot in the image to {selected ? 'move' : 'place'} this label.</p>}
    {notice && <p role="status" className="text-xs text-gray-600">{notice}</p>}
    <PanoramaViewer src={src} labels={labels} onPick={pick} height="320px" />
    <div className="space-y-1">
      {labels.map(label => <div key={label.id} className="flex items-center gap-2 text-sm">
        <button type="button" onClick={() => { setSelected(label.id); setText(label.text); setDescription(label.description || ''); setPlacing(false); }} className={`flex-1 rounded-lg px-3 py-2 text-left ${selected === label.id ? 'bg-amber-100' : 'bg-gray-100'}`}>{label.text}</button>
        <button type="button" aria-label={`Delete ${label.text} label`} onClick={() => { onChange(labels.filter(item => item.id !== label.id)); if (selected === label.id) { setSelected(null); setText(''); setDescription(''); setPlacing(false); } }} className="px-2 py-2 text-red-700">Delete</button>
      </div>)}
    </div>
    <p className="text-xs text-gray-500">{labels.length}/40 labels. Names stay attached to their panorama positions when visitors rotate or zoom.</p>
  </section>;
}
