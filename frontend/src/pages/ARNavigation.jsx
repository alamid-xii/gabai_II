import { BuildingNarration } from "../components/BuildingNarration";
import { useState, useEffect, useRef } from "react";
import { Search, MapPin, X, Building2, ChevronRight, Info, RefreshCw } from "lucide-react";
import { PanoramaViewer } from "../components/PanoramaViewer";
import { API, BACKEND_URL } from "../config/api";

const aerialPhoto = "/emc_aerial.jpg";

export function ARNavigation() {
  const [search, setSearch] = useState("");
  const [narrationMuted, setNarrationMuted] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const detailsRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/buildings`)
      .then(r => r.ok ? r.json() : Promise.reject("Failed"))
      .then(data => setBuildings(Array.isArray(data) ? data : []))
      .catch(() => setBuildings([]))
      .finally(() => setLoading(false));
  }, []);

  // Scroll to details when a building is selected
  useEffect(() => {
    if (selectedBuilding && detailsRef.current) {
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [selectedBuilding]);

  const filtered = buildings.filter(b =>
    (b.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // Parse coordinates from building
  function getCoords(building) {
    if (!building.coordinates) return null;
    try {
      const c = typeof building.coordinates === "string"
        ? JSON.parse(building.coordinates)
        : building.coordinates;
      return c;
    } catch { return null; }
  }

  // Parse offices JSON
  function parseOffices(offices) {
    if (!offices) return [];
    if (Array.isArray(offices)) return offices;
    try { return JSON.parse(offices); } catch { return [offices]; }
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] lg:h-full lg:min-h-0 bg-[#FFFDF0] flex flex-col lg:overflow-hidden pb-20 lg:pb-0">
      <div className="flex-1 lg:min-h-0 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 lg:py-4 flex flex-col">
        <div className="flex-1 lg:min-h-0 flex gap-4 lg:gap-5 flex-col lg:flex-row items-stretch">

          {/* ── Left Panel ── */}
          <aside className="lg:w-72 xl:w-80 shrink-0 flex flex-col gap-3 lg:h-full lg:min-h-0">
            {/* Header */}
            <div className="shrink-0">
              <h1 className="text-xl lg:text-2xl font-bold text-[#001840] tracking-tight">Campus Virtual Tour</h1>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F5C400]" />
                Click pins to explore the buildings.
              </p>
            </div>

            {/* Search */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search buildings…"
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#001840] focus:outline-none focus:border-[#102A71] focus:ring-2 focus:ring-[#102A71]/10"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Building List */}
            <div className="bg-[#102A71] rounded-2xl overflow-hidden flex flex-col lg:flex-1 lg:min-h-0 shadow-md">
              <div className="px-4 py-2.5 border-b border-[#001840]/30 shrink-0">
                <h3 className="text-[#FFDC5F] font-semibold text-xs uppercase tracking-wider">Buildings & Facilities</h3>
                <p className="text-[#FFFDF0]/50 text-xs">
                  {loading ? "Loading..." : `${filtered.length} found`}
                </p>
              </div>
              <div className="overflow-y-auto max-h-44 sm:max-h-56 lg:max-h-none lg:flex-1 lg:min-h-0 overscroll-contain">
                {loading ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-[#FFFDF0]/50 text-sm">
                    <RefreshCw size={14} className="animate-spin" /> Loading...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[#FFFDF0]/50 text-sm">
                    {buildings.length === 0
                      ? "No buildings added yet. Admin can add buildings in the dashboard."
                      : "No buildings match your search."}
                  </div>
                ) : (
                  filtered.map((building) => {
                    const isSelected = selectedBuilding?.id === building.id;
                    return (
                      <button
                        key={building.id}
                        onClick={() => setSelectedBuilding(isSelected ? null : building)}
                        className={`w-full text-left px-4 py-3 border-b border-[#001840]/20 flex items-center gap-3 transition-colors ${
                          isSelected ? "bg-[#F5C400]/20" : "hover:bg-[#001840]/20"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-[#F5C400]" : "bg-[#001840]/40"}`}>
                          <Building2 className={`w-4 h-4 ${isSelected ? "text-[#001840]" : "text-[#FFDC5F]"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-[#F5C400]" : "text-[#FFFDF0]"}`}>
                            {building.name}
                          </p>
                          {building.category && (
                            <p className="text-xs text-[#FFFDF0]/50 truncate">{building.category}</p>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 ml-auto transition-transform ${isSelected ? "text-[#F5C400] rotate-90" : "text-[#FFFDF0]/30"}`} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          {/* ── Right Panel ── */}
          <div className="flex-1 min-w-0 flex flex-col lg:h-full lg:min-h-0">

            {selectedBuilding ? (
              /* ── Building Details (replaces aerial view when a building is selected) ── */
              <div ref={detailsRef} className="bg-[#102A71] text-white rounded-2xl lg:overflow-y-auto shadow-xl flex-1 lg:min-h-0 flex flex-col scroll-mt-20">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-4 sm:p-6 pb-4 shrink-0 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-[#F5C400] w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                      <Building2 className="w-6 h-6 text-[#001840]" />
                    </div>
                    <div>
                      {selectedBuilding.category && (
                        <span className="bg-[#FFDC5F] text-[#001840] text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {selectedBuilding.category}
                        </span>
                      )}
                      <h3 className="font-bold text-lg sm:text-xl leading-snug mt-1 break-words">{selectedBuilding.name}</h3>
                      {selectedBuilding.shortName && (
                        <p className="text-[#FFDC5F]/60 text-xs mt-0.5">Also known as: {selectedBuilding.shortName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <BuildingNarration key={selectedBuilding.id} building={selectedBuilding} muted={narrationMuted} onMutedChange={setNarrationMuted} />
                  {/* Back to map button */}
                  <button
                    onClick={() => setSelectedBuilding(null)}
                    className="shrink-0 bg-[#001840]/40 hover:bg-[#001840]/70 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold text-[#FFFDF0]"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Map
                  </button>
                  </div>
                </div>

                {/* Description */}
                {selectedBuilding.description && (
                  <p className="text-[#FFFDF0]/80 text-sm leading-relaxed px-4 sm:px-6 pb-5">{selectedBuilding.description}</p>
                )}

                {/* Offices + Hours */}
                {(parseOffices(selectedBuilding.offices).length > 0 || selectedBuilding.hours) && (
                  <div className="grid sm:grid-cols-2 gap-5 px-4 sm:px-6 pb-5 border-t border-[#001840]/30 pt-5">
                    {parseOffices(selectedBuilding.offices).length > 0 && (
                      <div>
                        <h4 className="text-[#FFDC5F] text-xs font-bold uppercase tracking-wider mb-3">Offices / Areas</h4>
                        <ul className="space-y-2">
                          {parseOffices(selectedBuilding.offices).map((office, i) => (
                            <li key={i} className="flex items-center gap-2 text-[#FFFDF0] text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#F5C400] shrink-0" />
                              {office}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedBuilding.hours && (
                      <div>
                        <h4 className="text-[#FFDC5F] text-xs font-bold uppercase tracking-wider mb-3">Operating Hours</h4>
                        <p className="text-[#FFFDF0] text-sm leading-relaxed">{selectedBuilding.hours}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 360° Panorama */}
                {selectedBuilding.imageUrl ? (
                  <div className="px-4 sm:px-6 pb-6 border-t border-[#001840]/30 pt-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-[#F5C400] rounded-full animate-pulse" />
                      <h4 className="text-[#FFDC5F] text-xs font-bold uppercase tracking-wider">
                        360° Virtual Tour
                      </h4>
                      <span className="text-[#FFFDF0]/50 text-xs">— Click and drag to look around · Scroll to zoom</span>
                    </div>
                    <div className="rounded-xl overflow-hidden ring-2 ring-[#F5C400]/30">
                      <PanoramaViewer key={selectedBuilding.imageUrl}
                        src={`${BACKEND_URL}${selectedBuilding.imageUrl}`}
                        labels={selectedBuilding.panoramaLabels}
                        height="clamp(260px, 55vw, 420px)"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="px-4 sm:px-6 pb-6 border-t border-[#001840]/30 pt-5">
                    <div className="bg-[#001840]/30 rounded-xl p-4 text-center">
                      <p className="text-[#FFFDF0]/50 text-sm">No 360° photo available for this building yet.</p>
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
                    <span className="text-sm text-[#001840] font-semibold">Campus Aerial View</span>
                  </div>
                  <span className="text-xs text-gray-400">Click any pin to explore</span>
                </div>

                {/* Map container with pins - fits screen height and maintains 100% pin accuracy */}
                <div className="lg:flex-1 lg:min-h-0 p-2 sm:p-3 flex items-center justify-center bg-gray-50/60 overflow-hidden">
                  <div
                    className="relative shadow-md rounded-xl overflow-hidden border border-gray-200 aspect-[1922/2048] w-full lg:w-auto lg:h-full max-w-full lg:max-h-full"
                  >
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
                      const isSelected = selectedBuilding?.id === building.id;
                      return (
                        <button
                          key={building.id}
                          onClick={() => setSelectedBuilding(isSelected ? null : building)}
                          title={building.name}
                          style={{
                            position: "absolute",
                            left: `${coords.x}%`,
                            top: `${coords.y}%`,
                            transform: "translate(-50%, -100%)",
                            zIndex: 10,
                          }}
                          className="group flex flex-col items-center"
                        >
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 bg-[#001840] border-[#F5C400] flex items-center justify-center shadow-lg transition-all duration-150 hover:scale-110 hover:bg-[#102A71]">
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F5C400]" />
                          </div>
                          <div className="w-0.5 h-2.5 bg-[#001840]" />
                          <div
                            className="absolute bottom-full mb-1 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-lg pointer-events-none bg-[#001840] text-[#FFDC5F] opacity-0 group-hover:opacity-100 transition-all"
                            style={{ bottom: "calc(100% + 4px)" }}
                          >
                            {building.name}
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
    </div>
  );
}
