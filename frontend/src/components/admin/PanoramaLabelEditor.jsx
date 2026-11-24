import { useState } from 'react';
import { MapPin, Move, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { PanoramaViewer } from '../PanoramaViewer';

const SIZE_OPTIONS = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Medium' },
  { id: 'lg', label: 'Large' },
];

export function PanoramaLabelEditor({ src, labels = [], onChange }) {
  const [text, setText] = useState('');
  const [description, setDescription] = useState('');
  const [size, setSize] = useState('md');
  const [selectedId, setSelectedId] = useState(null);
  const [placingMode, setPlacingMode] = useState(null); // null | 'new' | 'move'
  const [notice, setNotice] = useState('');

  function selectExistingLabel(label) {
    setSelectedId(label.id);
    setText(label.text || '');
    setDescription(label.description || '');
    setSize(label.size || 'md');
    setPlacingMode(null);
    setNotice('');
  }

  function startNewLabel() {
    setSelectedId(null);
    setText('');
    setDescription('');
    setSize('md');
    setPlacingMode(null);
    setNotice('');
  }

  function handleNameChange(val) {
    setText(val);
    if (selectedId && val.trim()) {
      onChange(
        labels.map((l) =>
          l.id === selectedId ? { ...l, text: val.trim() } : l
        )
      );
    }
  }

  function handleDescriptionChange(val) {
    setDescription(val);
    if (selectedId) {
      onChange(
        labels.map((l) =>
          l.id === selectedId ? { ...l, description: val.trim() } : l
        )
      );
    }
  }

  function handleSizeChange(newSize) {
    setSize(newSize);
    if (selectedId) {
      onChange(
        labels.map((l) =>
          l.id === selectedId ? { ...l, size: newSize } : l
        )
      );
      setNotice('Label size updated. Click "Update Building" below to save.');
    }
  }

  function handlePanoramaPick(position) {
    if (!placingMode) return;
    if (placingMode === 'new') {
      if (!text.trim()) return;
      const newItem = {
        id: crypto.randomUUID(),
        text: text.trim(),
        description: description.trim(),
        size: size || 'md',
        ...position,
      };
      onChange([...labels, newItem]);
      setSelectedId(null);
      setText('');
      setDescription('');
      setSize('md');
      setPlacingMode(null);
      setNotice('Label placed! You can add another label or click any placed label below to edit, resize, or move it.');
    } else if (placingMode === 'move' && selectedId) {
      onChange(
        labels.map((l) =>
          l.id === selectedId
            ? {
                ...l,
                text: text.trim() || l.text,
                description: description.trim(),
                size: size || l.size || 'md',
                ...position,
              }
            : l
        )
      );
      setPlacingMode(null);
      setNotice('Label moved to new spot! Click "Update Building" below to save.');
    }
  }

  function handleDelete(id) {
    onChange(labels.filter((item) => item.id !== id));
    if (selectedId === id) {
      startNewLabel();
    }
    setNotice('Label removed. Click "Update Building" below to save.');
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3.5 shadow-2xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-bold text-[#001840]">360° Panorama Labels</h4>
          <p className="text-xs text-gray-500">
            Add or edit labels on the 360° image. Click any existing label in the viewer or list below to edit, resize, move, or delete it.
          </p>
        </div>
        {selectedId && (
          <button
            type="button"
            onClick={startNewLabel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#001840] text-white text-xs font-semibold hover:bg-[#102A71] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another Label
          </button>
        )}
      </div>

      {/* Form Box */}
      <div
        className={`rounded-xl border p-3.5 space-y-3 transition-colors ${
          selectedId
            ? 'bg-amber-50/50 border-amber-200'
            : 'bg-gray-50/70 border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#001840]">
            {selectedId ? 'Editing Selected Label' : 'New Label Details'}
          </span>
          {selectedId && (
            <button
              type="button"
              onClick={startNewLabel}
              className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Done editing
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Label Text
            </label>
            <input
              value={text}
              maxLength={80}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Atty. Artemio S. Rodriguez Building, Registrar..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
            />
          </div>

          {/* Easy Size Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Label Size
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-gray-300">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSizeChange(opt.id)}
                  className={`py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    size === opt.id
                      ? 'bg-[#001840] text-[#FFDC5F]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Popup Description (optional — shown when a visitor clicks the label)
          </label>
          <input
            value={description}
            maxLength={500}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Optional short note or office details..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!selectedId ? (
            <button
              type="button"
              disabled={!text.trim() || labels.length >= 40}
              onClick={() => {
                setPlacingMode(placingMode === 'new' ? null : 'new');
                setNotice('');
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                placingMode === 'new'
                  ? 'bg-amber-500 text-[#001840]'
                  : 'bg-[#001840] text-white hover:bg-[#102A71]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {placingMode === 'new'
                ? 'Cancel — Click on 360° Viewer Below to Place'
                : 'Step 2: Click Here, Then Click Spot on 360° Image'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setPlacingMode(placingMode === 'move' ? null : 'move');
                  setNotice('');
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  placingMode === 'move'
                    ? 'bg-amber-500 text-[#001840]'
                    : 'bg-[#001840] text-white hover:bg-[#102A71]'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                {placingMode === 'move' ? 'Cancel Move' : 'Move Position on 360° Image'}
              </button>

              <button
                type="button"
                onClick={() => handleDelete(selectedId)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Label
              </button>
            </>
          )}
        </div>
      </div>

      {/* Placement Mode Banner */}
      {placingMode && (
        <div
          role="status"
          className="rounded-lg bg-amber-100 border border-amber-300 px-3.5 py-2.5 text-xs font-semibold text-amber-950 flex items-center justify-between gap-2"
        >
          <span>
            🎯 Drag the 360° view to look around, then <strong>click the exact spot</strong> where you want to{' '}
            {placingMode === 'move' ? 'move this label' : 'place this label'}.
          </span>
          <button
            type="button"
            onClick={() => setPlacingMode(null)}
            className="underline text-amber-900 shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {notice && !placingMode && (
        <p role="status" className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 shrink-0" /> {notice}
        </p>
      )}

      {/* 360° Viewer */}
      <PanoramaViewer
        src={src}
        labels={labels}
        onPick={handlePanoramaPick}
        onSelectLabel={selectExistingLabel}
        selectedLabelId={selectedId}
        placingActive={Boolean(placingMode)}
        height="340px"
      />

      {/* Saved Labels List */}
      {labels.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Placed Labels ({labels.length}/40) — Click a label to edit, resize, or move
            </p>
          </div>
          <div className="grid gap-1.5 max-h-44 overflow-y-auto pr-1">
            {labels.map((label) => {
              const isSelected = selectedId === label.id;
              return (
                <div
                  key={label.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                    isSelected
                      ? 'bg-amber-50 border-amber-400 text-[#001840]'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectExistingLabel(label)}
                    className="flex-1 text-left font-semibold truncate flex items-center gap-2 cursor-pointer"
                  >
                    <span className="truncate">{label.text}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-medium uppercase text-gray-500 shrink-0">
                      {label.size || 'md'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => selectExistingLabel(label)}
                      className="px-2 py-1 rounded hover:bg-white text-[#102A71] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      title="Edit or resize label"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        selectExistingLabel(label);
                        setPlacingMode('move');
                      }}
                      className="px-2 py-1 rounded hover:bg-white text-amber-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      title="Move label position on 360° image"
                    >
                      <Move className="w-3 h-3" /> Move
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${label.text} label`}
                      onClick={() => handleDelete(label.id)}
                      className="px-2 py-1 rounded hover:bg-red-50 text-red-600 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      title="Delete label"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
