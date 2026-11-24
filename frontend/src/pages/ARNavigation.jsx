import { BuildingNarration } from "../components/BuildingNarration";
import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router";
import {
  Search, MapPin, X, Building2, ChevronRight, RefreshCw,
  Lock, LogIn, UserPlus, Clock, Compass
} from "lucide-react";
import { PanoramaViewer } from "../components/PanoramaViewer";
import { useAuth } from "../contexts/authState";
import { API } from "../config/api";

const aerialPhoto = "/emc_campus_map.webp";

export function ARNavigation() {
  const { isLoggedIn } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [narrationMuted, setNarrationMuted] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [authPromptBuilding, setAuthPromptBuilding] = useState(null);
  const detailsRef = useRef(null);

  const handleSelectBuilding = (building) => {
    if (!isLoggedIn) {
      setAuthPromptBuilding(building);
      return;
    }
    const isSelected = selectedBuilding?.id === building?.id;
    setSelectedBuilding(isSelected ? null : building);
  };

  useEffect(() => {
    fetch(`${API}/buildings`)
      .then(r => r.ok ? r.json() : Promise.reject("Failed"))
      .then(data => setBuildings(Array.isArray(data) ? data : []))
      .catch(() => setBuildings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedBuilding && detailsRef.current) {
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [selectedBuilding]);

  const categories = useMemo(() => {
    const unique = [...new Set(buildings.map(b => b.category).filter(Boolean))];
    return ["All", ...unique];
  }, [buildings]);

  const filtered = useMemo(() => {
    return buildings.filter(b => {
      const matchesSearch = (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.shortName || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "All" || b.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [buildings, search, categoryFilter]);

  function getCoords(building) {
    if (!building.coordinates) return null;
    try {
      const c = typeof building.coordinates === "string"
        ? JSON.parse(building.coordinates)
        : building.coordinates;
      return c;
    } catch { return null; }
  }

  function parseOffices(offices) {
    if (!offices) return [];
    if (Array.isArray(offices)) return offices;
    try { return JSON.parse(offices); } catch { return [offices]; }
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] lg:h-full lg:min-h-0 bg-[#FFFDF0] flex flex-col lg:overflow-hidden pb-20 lg:pb-0">
      <div className="flex-1 lg:min-h-0 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 lg:py-4 flex flex-col">
        <div className="flex-1 lg:min-h-0 flex gap-4 lg:gap-5 flex-col lg:flex-row items-stretch">

          {/* ── Left Sidebar: Search + Directory ── */}
          <aside className="lg:w-80 xl:w-84 shrink-0 flex flex-col gap-3 lg:h-full lg:min-h-0">
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 shrink-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h1 className="text-lg lg:text-xl font-bold text-[#001840] tracking-tight">Campus Virtual Tour</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#102A71]">
                  <Compass className="w-3 h-3 text-[#F5C400]" />
                  {loading ? "…" : buildings.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Select a building from the directory or click a map pin to explore 360° views.
              </p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search buildings or facilities…"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-sm text-[#001840] placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-[#102A71] focus:ring-2 focus:ring-[#102A71]/10 transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 min-h-0 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              {categories.length > 2 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`min-h-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                        categoryFilter === cat
                          ? "bg-[#001840] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Building Directory List */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden flex flex-col lg:flex-1 lg:min-h-0">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between shrink-0">
                <h2 className="text-[#001840] font-bold text-xs uppercase tracking-wider">Buildings &amp; Facilities</h2>
                <span className="text-[11px] font-medium text-gray-500">
                  {loading ? "Loading..." : `${filtered.length} shown`}
                </span>
              </div>

              <div className="overflow-y-auto max-h-52 sm:max-h-60 lg:max-h-none lg:flex-1 lg:min-h-0 divide-y divide-gray-100 overscroll-contain">
                {loading ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                    <RefreshCw size={14} className="animate-spin" /> Loading locations...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
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
                        type="button"
                        onClick={() => handleSelectBuilding(building)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                          isSelected
                            ? "bg-[#EEF2FF] border-l-4 border-l-[#102A71]"
                            : "hover:bg-gray-50 border-l-4 border-l-transparent"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-[#F5C400] text-[#001840]" : "bg-[#EEF2FF] text-[#102A71]"
                        }`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${isSelected ? "text-[#001840]" : "text-gray-800"}`}>
                            {building.name}
                          </p>
                          {building.category && (
                            <p className="text-[11px] text-gray-500 truncate">{building.category}</p>
                          )}
                        </div>
                        {!isLoggedIn ? (
                          <Lock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                            isSelected ? "text-[#102A71] rotate-90" : "text-gray-300"
                          }`} />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          {/* ── Right Panel: Details or Interactive Campus Map ── */}
          <div className="flex-1 min-w-0 flex flex-col lg:h-full lg:min-h-0">
            {selectedBuilding ? (
              <div ref={detailsRef} className="bg-white text-[#001840] border border-gray-200/90 rounded-2xl lg:overflow-y-auto shadow-sm flex-1 lg:min-h-0 flex flex-col scroll-mt-20">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-4 border-b border-gray-100 shrink-0 flex-wrap">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="bg-[#F5C400] w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                      <Building2 className="w-6 h-6 text-[#001840]" />
                    </div>
                    <div className="min-w-0">
                      {selectedBuilding.category && (
                        <span className="inline-block bg-[#FFF4C2] text-[#001840] border border-[#F5C400]/50 text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                          {selectedBuilding.category}
                        </span>
                      )}
                      <h2 className="font-bold text-lg sm:text-xl leading-snug mt-1 break-words text-[#001840]">
                        {selectedBuilding.name}
                      </h2>
                      {selectedBuilding.shortName && selectedBuilding.shortName !== selectedBuilding.name && (
                        <p className="text-gray-500 text-xs mt-0.5">Also known as: {selectedBuilding.shortName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <BuildingNarration key={selectedBuilding.id} building={selectedBuilding} muted={narrationMuted} onMutedChange={setNarrationMuted} />
                    <button
                      type="button"
                      onClick={() => setSelectedBuilding(null)}
                      className="min-h-0 shrink-0 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold text-[#001840]"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#102A71]" /> Back to Map
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  {/* Description */}
                  {selectedBuilding.description && (
                    <p className="text-gray-600 text-sm leading-relaxed">{selectedBuilding.description}</p>
                  )}

                  {/* Offices + Hours Cards */}
                  {(parseOffices(selectedBuilding.offices).length > 0 || selectedBuilding.hours) && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {parseOffices(selectedBuilding.offices).length > 0 && (
                        <div className="rounded-xl bg-gray-50/80 border border-gray-100 p-4">
                          <h4 className="text-[#102A71] text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#F5C400]" />
                            Offices / Areas
                          </h4>
                          <ul className="space-y-2">
                            {parseOffices(selectedBuilding.offices).map((office, i) => (
                              <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C400] shrink-0" />
                                {office}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedBuilding.hours && (
                        <div className="rounded-xl bg-gray-50/80 border border-gray-100 p-4">
                          <h4 className="text-[#102A71] text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#F5C400]" />
                            Operating Hours
                          </h4>
                          <p className="text-gray-700 text-sm leading-relaxed">{selectedBuilding.hours}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 360° Panorama */}
                  {selectedBuilding.imageUrl ? (
                    <div className="pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#F5C400] rounded-full animate-pulse" />
                          <h4 className="text-[#102A71] text-xs font-bold uppercase tracking-wider">
                            360° Virtual Tour
                          </h4>
                        </div>
                        <span className="text-gray-400 text-xs">Click and drag to look around · Scroll to zoom</span>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-xs">
                        <PanoramaViewer
                          key={selectedBuilding.imageUrl}
                          src={selectedBuilding.imageUrl}
                          labels={selectedBuilding.panoramaLabels}
                          height="clamp(260px, 55vw, 420px)"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
                      <p className="text-gray-400 text-sm">No 360° photo available for this building yet.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Interactive Campus Map ── */
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden flex flex-col lg:flex-1 lg:min-h-0">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#F5C400] rounded-full animate-pulse" />
                    <span className="text-sm text-[#001840] font-bold">Campus Interactive Map</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
                    Click any pin to explore
                  </span>
                </div>

                <div className="lg:flex-1 lg:min-h-0 p-3 sm:p-4 flex items-center justify-center bg-slate-50/70 overflow-hidden">
                  <div className="relative shadow-sm rounded-2xl overflow-hidden border border-gray-200 bg-white aspect-[1024/1012] w-full lg:w-auto lg:h-full max-w-full lg:max-h-full">
                    <img
                      src={aerialPhoto}
                      alt="Eastern Mindoro College Campus Map"
                      className="w-full h-full object-contain block select-none pointer-events-none"
                      draggable={false}
                    />

                    {/* Building pins overlay */}
                    {filtered.map((building) => {
                      const coords = getCoords(building);
                      if (!coords) return null;
                      return (
                        <button
                          key={building.id}
                          type="button"
                          onClick={() => handleSelectBuilding(building)}
                          title={building.name}
                          style={{
                            position: "absolute",
                            left: `${coords.x}%`,
                            top: `${coords.y}%`,
                            transform: "translate(-50%, -100%)",
                            zIndex: 10,
                          }}
                          className="group flex flex-col items-center cursor-pointer min-h-0"
                        >
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 bg-[#001840] border-[#F5C400] flex items-center justify-center shadow-md ring-2 ring-white/80 transition-all duration-150 group-hover:scale-110 group-hover:bg-[#102A71]">
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F5C400]" />
                          </div>
                          <div className="w-0.5 h-2.5 bg-[#001840]" />
                          <div
                            className="absolute bottom-full mb-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-lg pointer-events-none bg-[#001840] text-[#FFDC5F] opacity-0 group-hover:opacity-100 transition-all"
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

      {/* Login / Create Account Required Modal */}
      {authPromptBuilding && !isLoggedIn && (
        <div
          className="fixed inset-0 z-50 bg-[#001840]/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setAuthPromptBuilding(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-7 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAuthPromptBuilding(null)}
              className="absolute right-4 top-4 min-h-0 p-1.5 rounded-lg text-gray-400 hover:text-[#001840] hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border border-[#102A71]/15 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-[#102A71]" />
            </div>

            <div className="text-center mb-6">
              {authPromptBuilding.category && (
                <span className="inline-block bg-[#FFF4C2] text-[#001840] text-xs font-bold px-3 py-1 rounded-full mb-2">
                  {authPromptBuilding.category}
                </span>
              )}
              <h3 className="text-xl sm:text-2xl font-bold text-[#001840]">
                Sign In to Explore {authPromptBuilding.name}
              </h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Create a free account or sign in to view building details, office hours, audio narration, and the 360° virtual campus tour.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to="/signup"
                state={{ from: "/ar-navigation" }}
                className="w-full h-11 rounded-xl bg-[#001840] hover:bg-[#102A71] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4 text-[#F5C400]" />
                Create Account
              </Link>
              <Link
                to="/login"
                state={{ from: "/ar-navigation" }}
                className="w-full h-11 rounded-xl border border-gray-300 text-[#001840] hover:bg-gray-50 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <LogIn className="w-4 h-4 text-[#102A71]" />
                Sign In to Existing Account
              </Link>
              <button
                type="button"
                onClick={() => setAuthPromptBuilding(null)}
                className="w-full py-2 text-xs font-medium text-gray-500 hover:text-[#001840] transition-colors"
              >
                Back to Campus Interactive Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
