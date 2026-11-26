import { PanoramaLabelEditor } from "../../components/admin/PanoramaLabelEditor";
import { BuildingVoiceoverEditor } from "../../components/admin/BuildingVoiceoverEditor";
import { BuildingNarration } from "../../components/BuildingNarration";
import {
  PanoramaViewer,
  isEmbedTourUrl,
  parseTourEmbedInput,
  resolvePanoramaSrc,
} from "../../components/PanoramaViewer";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { usePortalSlot } from "../../hooks/usePortalSlot";
import {
  MapPin,
  Search,
  X,
  Plus,
  Edit,
  Trash2,
  Building2,
  ChevronRight,
  Code,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { confirmAction } from "../../utils/confirmAction";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

import { API } from "../../config/api";
import { AerialPinPicker } from "./AdminUsers";

const aerialPhoto = "/emc_campus_map.webp";

export function AdminBuildings({ buildings = [], onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [search, setSearch] = useState("");
  const [narrationMuted, setNarrationMuted] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tourSourceMode, setTourSourceMode] = useState("upload"); // "upload" | "embed"
  const [embedInput, setEmbedInput] = useState("");
  const detailsRef = useRef(null);
  const headerContainer = usePortalSlot(
    "admin-header-slot",
    true,
    "flex items-center justify-end gap-2 flex-wrap ml-auto"
  );

  const selectedBuilding =
    buildings.find((b) => b.id === selectedBuildingId) || null;
  const [formData, setFormData] = useState({
    name: "", shortName: "", category: "Academic",
    description: "", offices: "", hours: "", voiceoverScript: "", panoramaLabels: [],
    pinX: "50", pinY: "50", imageUrl: "", color: "#102A71"
  });

  useEffect(() => {
    if (editingBuilding) {
      const coords = JSON.parse(editingBuilding.coordinates || '{"x":50,"y":50}');
      const existingUrl = editingBuilding.imageUrl || "";
      const isEmbed = isEmbedTourUrl(existingUrl);
      setFormData({
        name: editingBuilding.name || "",
        shortName: editingBuilding.shortName || "",
        category: editingBuilding.category || "Academic",
        description: editingBuilding.description || "",
        voiceoverScript: editingBuilding.voiceoverScript || "",
        panoramaLabels: parseLabels(editingBuilding.panoramaLabels),
        offices: Array.isArray(editingBuilding.offices)
          ? editingBuilding.offices.join(", ")
          : JSON.parse(editingBuilding.offices || '[]').join(", "),
        hours: editingBuilding.hours || "",
        pinX: String(coords.x ?? coords.pinX ?? 50),
        pinY: String(coords.y ?? coords.pinY ?? 50),
        imageUrl: existingUrl,
        color: editingBuilding.color || "#102A71"
      });
      setTourSourceMode(isEmbed ? "embed" : "upload");
      setEmbedInput(isEmbed ? existingUrl : "");
      setPreviewUrl(!isEmbed && existingUrl ? resolvePanoramaSrc(existingUrl) : null);
      setSelectedFile(null);
    } else {
      setFormData({
        name: "", shortName: "", category: "Academic",
        description: "", offices: "", hours: "", voiceoverScript: "", panoramaLabels: [],
        pinX: "50", pinY: "50", imageUrl: "", color: "#102A71"
      });
      setTourSourceMode("upload");
      setEmbedInput("");
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [editingBuilding]);

  const onScriptLoaded = useCallback(script => setFormData(previous => ({ ...previous, voiceoverScript: script })), []);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (formData.panoramaLabels.length && !(await confirmAction({ title: "Replace Panorama", message: "Replacing the panorama clears its labels. Continue?", confirmText: "Continue", variant: "warning" }))) { e.target.value = ""; return; }
      setFormData(previous => ({ ...previous, panoramaLabels: [] }));
      setSelectedFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function buildFormData() {
    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("shortName", formData.name);
    formDataToSend.append("category", formData.category);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("voiceoverScript", formData.voiceoverScript);
    formDataToSend.append("panoramaLabels", JSON.stringify(formData.panoramaLabels));
    formDataToSend.append("offices", JSON.stringify(formData.offices.split(',').map(o => o.trim()).filter(o => o)));
    formDataToSend.append("hours", formData.hours);
    formDataToSend.append("coordinates", JSON.stringify({
      x: parseFloat(formData.pinX),
      y: parseFloat(formData.pinY)
    }));
    formDataToSend.append("color", formData.color);

    if (tourSourceMode === "embed") {
      const normalizedEmbed = parseTourEmbedInput(embedInput);
      formDataToSend.append("imageUrl", normalizedEmbed);
    } else if (selectedFile) {
      formDataToSend.append("photo360", selectedFile);
    } else if (formData.imageUrl) {
      formDataToSend.append("imageUrl", formData.imageUrl);
    }
    return formDataToSend;
  }

  async function ensureBuildingSaved() {
    if (editingBuilding?.id) return editingBuilding;
    if (!formData.name.trim()) throw new Error("Enter the building name first before generating audio.");
    if (!formData.description.trim()) throw new Error("Enter the building description first before generating audio.");
    const token = localStorage.getItem("token");
    const response = await fetch(`${API}/admin/buildings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: buildFormData(),
    });
    const saved = await response.json();
    if (!response.ok) throw new Error(saved.error || "Could not save building before generating audio.");
    toast.success("Building saved! Generating audio...");
    return saved;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const formDataToSend = buildFormData();

    try {
      const url = editingBuilding
        ? `${API}/admin/buildings/${editingBuilding.id}`
        : `${API}/admin/buildings`;

      const response = await fetch(url, {
        method: editingBuilding ? "PUT" : "POST",
        headers: {
          "Authorization": `Bearer ${token}`
          // Don't set Content-Type, let browser set it with boundary for FormData
        },
        body: formDataToSend
      });

      const saved = await response.json();
      if (response.ok) {
        const wasEditing = Boolean(editingBuilding);
        setShowForm(false);
        setEditingBuilding(null);
        toast.success(wasEditing ? "Building updated successfully." : "Building created successfully.");
        setSelectedFile(null);
        setPreviewUrl(null);
        if (onRefresh) onRefresh();
      } else { toast.error(saved.error || "Could not save building"); }
    } catch (error) {
      toast.error("Could not save building. Please try again.");
      console.error("Error saving building:", error);
    }
  }

  async function handleDelete(id) {
    if (!(await confirmAction("Are you sure you want to delete this building?"))) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API}/admin/buildings/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        if (selectedBuildingId === id) setSelectedBuildingId(null);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error("Error deleting building:", error);
    }
  }

  const filtered = buildings.filter((b) =>
    (b.name || b.shortName || "").toLowerCase().includes(search.toLowerCase())
  );

  function getCoords(building) {
    if (!building?.coordinates) return null;
    try {
      const c =
        typeof building.coordinates === "string"
          ? JSON.parse(building.coordinates)
          : building.coordinates;
      return c;
    } catch {
      return null;
    }
  }

  function parseOffices(offices) {
    if (!offices) return [];
    if (Array.isArray(offices)) return offices;
    try {
      return JSON.parse(offices);
    } catch {
      return [offices];
    }
  }

  const addBuildingBtn = (
    <button
      type="button"
      onClick={() => {
        setShowForm(true);
        setEditingBuilding(null);
      }}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#001840] text-white text-sm font-semibold hover:bg-[#102A71] transition-colors shadow-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      Add Building
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header Slot Action or Fallback */}
      {headerContainer ? (
        createPortal(addBuildingBtn, headerContainer)
      ) : (
        <div className="flex justify-end">{addBuildingBtn}</div>
      )}

      {/* Building Form Modal */}
      {(showForm || editingBuilding) && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setShowForm(false);
            setEditingBuilding(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#FFFDF0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#001840]/10 flex items-center justify-center text-[#001840]">
                  <Building2 className="w-5 h-5 text-[#001840]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#001840]">
                    {editingBuilding ? "Edit Building" : "Add New Building"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingBuilding ? "Update building details, 360° photo, and map coordinates" : "Add a new campus structure, 360° photo, and map coordinates"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingBuilding(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Aerial Pin Picker Modal */}
              {showMapPicker && (
                <AerialPinPicker
                  position={formData.pinX ? { x: parseFloat(formData.pinX), y: parseFloat(formData.pinY) } : null}
                  onPositionChange={(pos) => {
                    setFormData({ ...formData, pinX: pos.x.toString(), pinY: pos.y.toString() });
                  }}
                  onClose={() => setShowMapPicker(false)}
                />
              )}

              <form id="buildingForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value, shortName: e.target.value })}
                    placeholder="Administration Building"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the building..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent text-sm"
                    required
                  />
                </div>

                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <label htmlFor="voiceover-script" className="block text-sm font-semibold text-[#001840]">Custom voiceover script (optional)</label>
                  <textarea id="voiceover-script" value={formData.voiceoverScript} maxLength={2500} rows={4}
                    onChange={event => setFormData({ ...formData, voiceoverScript: event.target.value })}
                    placeholder="Welcome to the Main Library. Here, students can explore..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <p className="text-xs text-gray-500">{formData.voiceoverScript.length}/2,500 characters. Write the exact narration students will hear; keep personal information out of the script.</p>
                  <BuildingVoiceoverEditor key={`${editingBuilding?.id || 'new'}-${editingBuilding?.updatedAt || ''}`}
                    buildingId={editingBuilding?.id} script={formData.voiceoverScript} onScriptLoaded={onScriptLoaded} onRefresh={onRefresh}
                    onEnsureBuildingSaved={ensureBuildingSaved}
                    onBuildingCreated={(created) => {
                      setEditingBuilding(created);
                      setShowForm(false);
                      setSelectedFile(null);
                      if (onRefresh) onRefresh();
                    }} />
                </section>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent text-sm"
                    >
                      <option>Administration</option>
                      <option>Academic</option>
                      <option>Services</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color (Hex)</label>
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offices/Rooms (comma-separated)
                  </label>
                  <Input
                    value={formData.offices}
                    onChange={(e) => setFormData({ ...formData, offices: e.target.value })}
                    placeholder="Registrar's Office, Cashier, Guidance Office"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operating Hours</label>
                  <Input
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="Mon-Fri: 8:00 AM - 5:00 PM"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Building Location on Campus Map
                  </label>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      className="w-full px-4 py-3 bg-[#001840] hover:bg-[#102A71] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                    >
                      <MapPin className="w-4 h-4 text-[#F5C400]" />
                      {formData.pinX ? 'Reposition Pin on Aerial Photo' : 'Click to Pin Location on Aerial Photo'}
                    </button>
                    <div className="bg-[#FFFDF0] border border-[#F5C400]/30 rounded-xl p-3">
                      {formData.pinX && formData.pinY ? (
                        <p className="text-xs text-gray-600">
                          ✅ Pin placed at <span className="font-mono font-semibold text-[#001840]">x: {formData.pinX}%, y: {formData.pinY}%</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">No pin placed yet — click the button above to set location on the aerial photo</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      360° Virtual Tour Source
                    </label>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setTourSourceMode("upload")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                          tourSourceMode === "upload"
                            ? "bg-[#001840] text-[#FFDC5F] shadow-2xs"
                            : "text-gray-600 hover:text-[#001840]"
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Upload 360° Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setTourSourceMode("embed")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                          tourSourceMode === "embed"
                            ? "bg-[#001840] text-[#FFDC5F] shadow-2xs"
                            : "text-gray-600 hover:text-[#001840]"
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        Paste Embed Code / Link
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {tourSourceMode === "embed" ? (
                      <div className="space-y-2.5">
                        <textarea
                          value={embedInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEmbedInput(val);
                            const parsed = parseTourEmbedInput(val);
                            setFormData((prev) => ({ ...prev, imageUrl: parsed }));
                          }}
                          rows={4}
                          placeholder={`Paste Travvir embed code or direct embed URL, e.g.:\n<div class="travvir-embed-tour" data-property="9LLVqe" data-scene="1"></div>\n<script src="https://travvir.com/travvir-embed.js"></script>`}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                        />
                        {parseTourEmbedInput(embedInput) && (
                          <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">
                            <span className="truncate">
                              ✅ Embed Tour Resolved:{" "}
                              <strong className="font-mono">
                                {parseTourEmbedInput(embedInput)}
                              </strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEmbedInput("");
                                setFormData((prev) => ({ ...prev, imageUrl: "" }));
                              }}
                              className="text-red-600 hover:underline font-semibold shrink-0"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          Paste a Travvir embed snippet (`&lt;div class=&quot;travvir-embed-tour&quot; data-property=&quot;...&quot;&gt;`), an `&lt;iframe&gt;`, or a direct 360° tour URL. You can immediately add floating labels and audio narration below!
                        </p>
                      </div>
                    ) : previewUrl ? (
                      /* Preview when image is selected — upload section is closed */
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-inner group">
                        <img
                          src={previewUrl}
                          alt="360 Preview"
                          className="w-full h-48 object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3.5">
                          <div className="text-white text-xs drop-shadow">
                            <p className="font-semibold text-sm">{selectedFile ? selectedFile.name : (formData.name ? `${formData.name} Photo` : '360° Panoramic Photo')}</p>
                            <p className="text-white/80 text-[11px] mt-0.5">
                              {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to save` : 'Current attached 360° image'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl(null);
                              setFormData(prev => ({ ...prev, imageUrl: "" }));
                            }}
                            className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm transition-all shadow-md active:scale-95"
                            title="Remove photo to choose a different one"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* File Upload Dropzone — only shown when NO image is selected */
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer">
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#F5C400] transition-colors text-center bg-gray-50/50 hover:bg-[#FFFDF0]/50">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <div className="flex flex-col items-center gap-2">
                              <Plus className="w-8 h-8 text-gray-400" />
                              <p className="text-sm font-medium text-gray-700">
                                Click to upload 360° photo
                              </p>
                              <p className="text-xs text-gray-500">
                                Only 1 photo allowed per location (JPG, PNG up to 50MB)
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>
                    )}

                    {tourSourceMode === "upload" && (
                      <p className="text-xs text-gray-500">
                        Upload an equirectangular 360° panoramic photo for interactive viewing
                      </p>
                    )}

                    {(tourSourceMode === "embed" && parseTourEmbedInput(embedInput)) ||
                    (tourSourceMode === "upload" && editingBuilding?.imageUrl && !selectedFile) ? (
                      <PanoramaLabelEditor
                        key={`${editingBuilding?.id || "new"}-${
                          tourSourceMode === "embed"
                            ? parseTourEmbedInput(embedInput)
                            : editingBuilding?.imageUrl
                        }`}
                        src={
                          tourSourceMode === "embed"
                            ? parseTourEmbedInput(embedInput)
                            : resolvePanoramaSrc(editingBuilding.imageUrl)
                        }
                        labels={formData.panoramaLabels}
                        onChange={(labels) =>
                          setFormData((previous) => ({ ...previous, panoramaLabels: labels }))
                        }
                      />
                    ) : (
                      <p className="text-xs text-gray-500 rounded-lg border p-3 bg-gray-50">
                        {tourSourceMode === "embed"
                          ? "Paste a valid Travvir embed code or 360° tour link above to preview the tour and place labels on it."
                          : "Save the building with its 360° photo first to place labels on the image. Replacing the photo clears old labels."}
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingBuilding(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="buildingForm"
                className="bg-[#001840] hover:bg-[#102A71]"
              >
                {editingBuilding ? "Update Building" : "Create Building"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Live Virtual Tour Layout (Mirrors Public Campus Virtual Tour + Admin Controls) ── */}
      <div className="flex gap-4 lg:gap-5 flex-col lg:flex-row items-stretch lg:h-[calc(100svh-7.5rem)]">
        {/* ── Left Panel: Search & Buildings List ── */}
        <aside className="lg:w-72 xl:w-80 shrink-0 flex flex-col gap-3 lg:h-full lg:min-h-0">
          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search buildings…"
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm text-[#001840] focus:outline-none focus:border-[#102A71] focus:ring-2 focus:ring-[#102A71]/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Building List */}
          <div className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden flex flex-col lg:flex-1 lg:min-h-0 shadow-2xs">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-[#001840] font-bold text-xs uppercase tracking-wider">
                  Buildings &amp; Facilities
                </h3>
                <p className="text-gray-500 text-xs">{filtered.length} found</p>
              </div>
              {selectedBuilding && (
                <button
                  type="button"
                  onClick={() => setSelectedBuildingId(null)}
                  className="text-xs font-semibold text-[#102A71] hover:underline cursor-pointer"
                >
                  Show Map
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-56 lg:max-h-none lg:flex-1 lg:min-h-0 divide-y divide-gray-100 overscroll-contain">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                  {buildings.length === 0
                    ? "No buildings added yet. Click '+ Add Building' in the top header."
                    : "No buildings match your search."}
                </div>
              ) : (
                filtered.map((building) => {
                  const isSelected = selectedBuilding?.id === building.id;
                  return (
                    <div
                      key={building.id}
                      onClick={() =>
                        setSelectedBuildingId(isSelected ? null : building.id)
                      }
                      className={`w-full text-left px-3.5 py-3 flex items-center gap-3 transition-colors cursor-pointer border-l-4 ${
                        isSelected
                          ? "bg-[#EEF2FF] border-l-[#102A71]"
                          : "hover:bg-gray-50 border-l-transparent"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#F5C400] text-[#001840]" : "bg-[#EEF2FF] text-[#102A71]"
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isSelected ? "text-[#001840]" : "text-gray-800"
                          }`}
                        >
                          {building.name || building.shortName}
                        </p>
                        {building.category && (
                          <p className="text-xs text-gray-500 truncate">
                            {building.category}
                          </p>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBuilding(building);
                            setShowForm(false);
                          }}
                          title="Edit building"
                          className="w-7 h-7 min-h-0 p-0 inline-flex items-center justify-center rounded-md text-[#102A71] hover:text-[#001840] hover:bg-[#F5C400] transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 block" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(building.id)}
                          title="Delete building"
                          className="w-7 h-7 min-h-0 p-0 inline-flex items-center justify-center rounded-md text-red-500 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 block" />
                        </button>
                        <ChevronRight
                          onClick={() =>
                            setSelectedBuildingId(isSelected ? null : building.id)
                          }
                          className={`w-4 h-4 ml-0.5 transition-transform ${
                            isSelected
                              ? "text-[#102A71] rotate-90"
                              : "text-gray-300"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* ── Right Panel: Building Details Preview OR Campus Aerial Map ── */}
        <div className="flex-1 min-w-0 flex flex-col lg:h-full lg:min-h-0">
          {selectedBuilding ? (
            /* ── Building Details (Same as public Virtual Tour + Admin Edit/Delete buttons) ── */
            <div
              ref={detailsRef}
              className="bg-white text-[#001840] border border-gray-200/90 rounded-2xl lg:overflow-y-auto shadow-sm flex-1 lg:min-h-0 flex flex-col"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 sm:p-6 pb-4 border-b border-gray-100 shrink-0">
                <div className="flex items-start gap-3 min-w-0 sm:flex-1">
                  <div className="bg-[#F5C400] w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                    <Building2 className="w-6 h-6 text-[#001840]" />
                  </div>
                  <div>
                    {selectedBuilding.category && (
                      <span className="bg-[#FFF4C2] text-[#001840] border border-[#F5C400]/50 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {selectedBuilding.category}
                      </span>
                    )}
                    <h3 className="font-bold text-lg sm:text-xl leading-snug mt-1 break-words text-[#001840]">
                      {selectedBuilding.name || selectedBuilding.shortName}
                    </h3>
                    {selectedBuilding.shortName &&
                      selectedBuilding.shortName !== selectedBuilding.name && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          Also known as: {selectedBuilding.shortName}
                        </p>
                      )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <BuildingNarration
                    key={`${selectedBuilding.id}-${selectedBuilding.voiceoverAudioUrl || ""}`}
                    building={selectedBuilding}
                    muted={narrationMuted}
                    onMutedChange={setNarrationMuted}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBuilding(selectedBuilding);
                      setShowForm(false);
                    }}
                    className="bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Building
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedBuilding.id)}
                    className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBuildingId(null)}
                    className="bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold text-[#001840] cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#102A71]" /> Map
                  </button>
                </div>
              </div>

              {/* Description */}
              {selectedBuilding.description && (
                <p className="text-gray-600 text-sm leading-relaxed px-4 sm:px-6 py-4">
                  {selectedBuilding.description}
                </p>
              )}

              {/* Offices + Hours */}
              {(parseOffices(selectedBuilding.offices).length > 0 ||
                selectedBuilding.hours) && (
                <div className="grid sm:grid-cols-2 gap-5 px-4 sm:px-6 pb-5 border-t border-gray-100 pt-5">
                  {parseOffices(selectedBuilding.offices).length > 0 && (
                    <div>
                      <h4 className="text-[#102A71] text-xs font-bold uppercase tracking-wider mb-3">
                        Offices / Areas
                      </h4>
                      <ul className="space-y-2">
                        {parseOffices(selectedBuilding.offices).map((office, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-gray-700 text-sm"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#F5C400] shrink-0" />
                            {office}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedBuilding.hours && (
                    <div>
                      <h4 className="text-[#102A71] text-xs font-bold uppercase tracking-wider mb-3">
                        Operating Hours
                      </h4>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {selectedBuilding.hours}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 360° Panorama */}
              {selectedBuilding.imageUrl ? (
                <div className="px-4 sm:px-6 pb-6 border-t border-gray-100 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-2 h-2 bg-[#F5C400] rounded-full animate-pulse" />
                      <h4 className="text-[#102A71] text-xs font-bold uppercase tracking-wider">
                        360° Virtual Tour (User View Preview)
                      </h4>
                      <span className="text-gray-400 text-xs">
                        — Click and drag to look around · Scroll to zoom
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBuilding(selectedBuilding);
                        setShowForm(false);
                      }}
                      className="text-xs font-semibold text-[#102A71] hover:underline cursor-pointer"
                    >
                      Edit 360° Labels / Photo →
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden ring-1 ring-gray-200">
                    <PanoramaViewer
                      key={`${selectedBuilding.id}-${selectedBuilding.imageUrl}-${JSON.stringify(selectedBuilding.panoramaLabels || [])}`}
                      src={selectedBuilding.imageUrl}
                      labels={selectedBuilding.panoramaLabels}
                      height="clamp(260px, 55vw, 420px)"
                    />
                  </div>
                </div>
              ) : (
                <div className="px-4 sm:px-6 pb-6 border-t border-gray-100 pt-5">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center space-y-2">
                    <p className="text-gray-500 text-sm">
                      No 360° photo available for this building yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBuilding(selectedBuilding);
                        setShowForm(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5C400] text-[#001840] text-xs font-bold hover:bg-[#FFDC5F] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Upload 360° Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Aerial Photo with pins (shown when no building is selected) ── */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col lg:flex-1 lg:min-h-0">
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#F5C400] rounded-full animate-pulse" />
                  <span className="text-sm text-[#001840] font-semibold">
                    Campus Aerial View (Live User Preview)
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  Click any pin or building on the left to preview &amp; edit
                </span>
              </div>

              <div className="lg:flex-1 lg:min-h-0 p-2 sm:p-3 flex items-center justify-center bg-gray-50/60 overflow-hidden">
                <div className="relative shadow-md rounded-xl overflow-hidden border border-gray-200 bg-white aspect-[1024/1012] w-full lg:w-auto lg:h-full max-w-full lg:max-h-full">
                  <img
                    src={aerialPhoto}
                    alt="Eastern Mindoro College Aerial View"
                    className="w-full h-full object-contain block select-none pointer-events-none"
                    draggable={false}
                  />

                  {/* Building pins overlay */}
                  {buildings.map((building) => {
                    const coords = getCoords(building);
                    if (!coords) return null;
                    return (
                      <button
                        key={building.id}
                        type="button"
                        onClick={() => setSelectedBuildingId(building.id)}
                        title={building.name || building.shortName}
                        style={{
                          position: "absolute",
                          left: `${coords.x}%`,
                          top: `${coords.y}%`,
                          transform: "translate(-50%, -100%)",
                          zIndex: 10,
                        }}
                        className="group flex flex-col items-center cursor-pointer"
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 bg-[#001840] border-[#F5C400] flex items-center justify-center shadow-lg transition-all duration-150 hover:scale-110 hover:bg-[#102A71]">
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F5C400]" />
                        </div>
                        <div className="w-0.5 h-2.5 bg-[#001840]" />
                        <div
                          className="absolute bottom-full mb-1 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-lg pointer-events-none bg-[#001840] text-[#FFDC5F] opacity-0 group-hover:opacity-100 transition-all"
                          style={{ bottom: "calc(100% + 4px)" }}
                        >
                          {building.name || building.shortName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function parseLabels(value) {
  try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
