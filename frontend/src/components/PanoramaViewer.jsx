import { useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "../config/api";

const SIZE_STYLES = {
  sm: { padding: "3px 8px", fontSize: "11px", borderRadius: "6px" },
  md: { padding: "4px 10px", fontSize: "12.5px", borderRadius: "8px" },
  lg: { padding: "6px 13px", fontSize: "14px", borderRadius: "10px" },
};

/**
 * Parse a pasted Travvir embed snippet (`<div class="travvir-embed-tour" data-property="9LLVqe" ...>`),
 * an `<iframe src="...">`, or a direct embed/photo URL into a normalized source string.
 */
export function parseTourEmbedInput(raw) {
  if (!raw || typeof raw !== "string") return "";
  const text = raw.trim();
  if (!text) return "";

  // 1. Check for Travvir HTML snippet with data-property="..."
  const propMatch = text.match(/data-property\s*=\s*["']([^"']+)["']/i);
  if (propMatch) {
    const propertyId = propMatch[1].trim();
    const sceneMatch = text.match(/data-scene(?:-index)?\s*=\s*["']([^"']+)["']/i);
    const scene = sceneMatch ? sceneMatch[1].trim().replace(/^\?s?=?/, "") : "1";
    const url = new URL(`https://travvir.com/embed/${encodeURIComponent(propertyId)}`);
    if (scene) url.searchParams.set("s", scene);
    url.searchParams.set("embedded", "1");
    return url.toString();
  }

  // 2. Check for <iframe src="...">
  const iframeMatch = text.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i);
  if (iframeMatch) {
    return normalizeEmbedUrl(iframeMatch[1].trim());
  }

  // 3. Direct URL
  return normalizeEmbedUrl(text);
}

function normalizeEmbedUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.hostname.includes("travvir.com")) {
      // e.g. https://travvir.com/embed/9LLVqe or https://travvir.com/tour/9LLVqe
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (id && id !== "embed") {
        const scene = u.searchParams.get("s") || u.searchParams.get("scene") || "1";
        return `https://travvir.com/embed/${encodeURIComponent(id)}?s=${encodeURIComponent(scene)}&embedded=1`;
      }
    }
    return u.toString();
  } catch {
    return urlStr;
  }
}

export function isEmbedTourUrl(src) {
  if (!src || typeof src !== "string") return false;
  const s = src.trim();
  if (/data-property\s*=|<iframe/i.test(s)) return true;
  if (/^https?:\/\//i.test(s)) {
    // Direct image extensions use the equirectangular photo sphere viewer
    if (/\.(jpe?g|png|webp|avif)(\?.*)?$/i.test(s)) return false;
    return true;
  }
  return false;
}

export function resolvePanoramaSrc(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return "";
  const trimmed = imageUrl.trim();
  if (isEmbedTourUrl(trimmed)) return parseTourEmbedInput(trimmed);
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  return `${BACKEND_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

/**
 * PanoramaViewer — interactive 360° equirectangular panorama viewer OR embedded 360° tour (e.g., Travvir),
 * with support for floating labels & placement in both modes.
 */
export function PanoramaViewer({
  src,
  height = "420px",
  labels = [],
  onPick,
  onSelectLabel,
  selectedLabelId,
  placingActive = false,
}) {
  const resolvedSrc = resolvePanoramaSrc(src);
  const isEmbed = isEmbedTourUrl(src) || isEmbedTourUrl(resolvedSrc);

  const containerRef = useRef(null);
  const embedBoxRef = useRef(null);
  const viewerRef = useRef(null);
  const pickRef = useRef(onPick);
  const selectLabelRef = useRef(onSelectLabel);
  const [ready, setReady] = useState(0);
  const [openDescId, setOpenDescId] = useState(null);
  useEffect(() => { pickRef.current = onPick; }, [onPick]);
  useEffect(() => { selectLabelRef.current = onSelectLabel; }, [onSelectLabel]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isEmbed) return;
    if (!containerRef.current || !resolvedSrc) return;

    let cancelled = false;

    async function init() {
      try {
        // Destroy previous instance
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        const { Viewer } = await import("@photo-sphere-viewer/core");

        // Import CSS dynamically
        await import("@photo-sphere-viewer/core/index.css");

        if (cancelled || !containerRef.current) return;

        viewerRef.current = new Viewer({
          container: containerRef.current,
          panorama: resolvedSrc,
          defaultZoomLvl: 50,
          touchmoveTwoFingers: false,
          mousewheelCtrlKey: false,
          navbar: ["zoom", "fullscreen"],
          loadingImg: null,
          loadingTxt: "Loading 360° view...",
        });

        viewerRef.current.addEventListener('click', ({ data }) => {
          if (!data.rightclick && !data.target?.closest('[data-panorama-label]')) pickRef.current?.({ yaw: data.yaw, pitch: data.pitch });
        });
        viewerRef.current.addEventListener('panorama-error', () => {
          if (!cancelled) { setError('Unable to load this panorama image.'); setLoading(false); }
        });
        viewerRef.current.addEventListener("ready", () => {
          if (!cancelled) { setLoading(false); setReady(value => value + 1); }
        });

        viewerRef.current.addEventListener("panorama-loaded", () => {
          if (!cancelled) setLoading(false);
        });

      } catch (err) {
        console.error("PanoramaViewer error:", err);
        if (!cancelled) {
          setError("Failed to load 360° viewer.");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [resolvedSrc, isEmbed]);

  useEffect(() => {
    if (isEmbed) return;
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    const layer = document.createElement('div');
    Object.assign(layer.style, { position: 'absolute', inset: '0 0 40px 0', overflow: 'hidden', pointerEvents: 'none', zIndex: '5' });
    viewer.container.appendChild(layer);
    let parsed = labels;
    try { if (typeof labels === 'string') parsed = JSON.parse(labels); } catch { parsed = []; }
    const markers = (Array.isArray(parsed) ? parsed : []).filter(label => Number.isFinite(label.yaw) && Number.isFinite(label.pitch)).map(label => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.panoramaLabel = label.id;
      button.title = label.description || label.text;
      button.setAttribute('aria-label', label.description ? `${label.text}: ${label.description}` : label.text);
      const sizePreset = SIZE_STYLES[label.size] || SIZE_STYLES.md;
      const isSelected = selectedLabelId && label.id === selectedLabelId;
      Object.assign(button.style, {
        position: 'absolute',
        pointerEvents: 'auto',
        transform: 'translate(-50%, -100%)',
        width: 'max-content',
        maxWidth: 'none',
        minHeight: '0',
        height: 'auto',
        padding: sizePreset.padding,
        borderRadius: sizePreset.borderRadius,
        border: isSelected ? '2px solid #FFFFFF' : '1px solid #F5C400',
        background: isSelected ? 'rgba(16,42,113,.96)' : 'rgba(0,24,64,.9)',
        color: '#FFDC5F',
        fontSize: sizePreset.fontSize,
        lineHeight: '1.2',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        boxShadow: isSelected ? '0 0 0 2px #F5C400, 0 4px 12px #0008' : '0 2px 8px #0005',
        cursor: 'pointer',
      });
      const name = document.createElement('span');
      name.textContent = label.text;
      Object.assign(name.style, { display: 'block', lineHeight: '1.2', whiteSpace: 'nowrap' });
      button.appendChild(name);
      if (label.description) {
        const details = document.createElement('span');
        details.textContent = label.description;
        Object.assign(details.style, { display: 'none', color: 'white', fontWeight: '400', fontSize: '11.5px', lineHeight: '1.3', marginTop: '4px', whiteSpace: 'normal', maxWidth: '240px', textAlign: 'left' });
        button.appendChild(details);
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', event => {
          event.stopPropagation();
          if (selectLabelRef.current) {
            selectLabelRef.current(label);
            return;
          }
          const open = details.style.display === 'none';
          details.style.display = open ? 'block' : 'none';
          button.setAttribute('aria-expanded', String(open));
        });
      } else {
        button.addEventListener('click', event => {
          event.stopPropagation();
          if (selectLabelRef.current) selectLabelRef.current(label);
        });
      }
      button.addEventListener('pointerdown', event => event.stopPropagation());
      layer.appendChild(button);
      return { label, button };
    });
    const update = () => {
      for (const { label, button } of markers) {
        const visible = viewer.dataHelper.isPointVisible(label);
        button.style.display = visible ? 'block' : 'none';
        if (visible) {
          const point = viewer.dataHelper.sphericalCoordsToViewerCoords(label);
          button.style.left = `${point.x}px`;
          button.style.top = `${point.y}px`;
        }
      }
    };
    viewer.addEventListener('render', update);
    update();
    return () => { viewer.removeEventListener('render', update); layer.remove(); };
  }, [labels, ready, resolvedSrc, selectedLabelId, isEmbed]);

  if (isEmbed) {
    let parsedLabels = labels;
    try {
      if (typeof labels === "string") parsedLabels = JSON.parse(labels);
    } catch {
      parsedLabels = [];
    }
    const embedLabels = (Array.isArray(parsedLabels) ? parsedLabels : []).map((l) => {
      if (Number.isFinite(l.x) && Number.isFinite(l.y)) return l;
      // Fallback for spherical coords if converted
      const x = Number.isFinite(l.yaw) ? Math.min(92, Math.max(8, 50 + (l.yaw / Math.PI) * 40)) : 50;
      const y = Number.isFinite(l.pitch) ? Math.min(88, Math.max(12, 50 - (l.pitch / (Math.PI / 2)) * 35)) : 50;
      return { ...l, x, y };
    });

    const handleEmbedOverlayClick = (e) => {
      if (!placingActive || !embedBoxRef.current) return;
      const rect = embedBoxRef.current.getBoundingClientRect();
      const x = Math.min(96, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(94, Math.max(6, ((e.clientY - rect.top) / rect.height) * 100));
      const yaw = ((x - 50) / 50) * Math.PI;
      const pitch = ((50 - y) / 50) * (Math.PI / 3);
      pickRef.current?.({
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        yaw: Number(yaw.toFixed(4)),
        pitch: Number(pitch.toFixed(4)),
      });
    };

    return (
      <div
        ref={embedBoxRef}
        style={{ position: "relative", height, borderRadius: "12px", overflow: "hidden", background: "#001840" }}
      >
        <iframe
          key={resolvedSrc}
          src={resolvedSrc}
          title="360° Virtual Tour Embed"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />

        {/* Click capture layer when Admin is placing or moving a label */}
        {placingActive && (
          <div
            onClick={handleEmbedOverlayClick}
            title="Click to place label here"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 15,
              cursor: "crosshair",
              background: "rgba(245, 196, 0, 0.08)",
            }}
          />
        )}

        {/* Floating Labels Layer over Embed Tour */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {embedLabels.map((label) => {
            const sizePreset = SIZE_STYLES[label.size] || SIZE_STYLES.md;
            const isSelected = selectedLabelId && label.id === selectedLabelId;
            const isDescOpen = openDescId === label.id;

            return (
              <button
                key={label.id}
                type="button"
                data-panorama-label={label.id}
                title={label.description || label.text}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectLabelRef.current) {
                    selectLabelRef.current(label);
                    return;
                  }
                  if (label.description) {
                    setOpenDescId(isDescOpen ? null : label.id);
                  }
                }}
                style={{
                  position: "absolute",
                  left: `${label.x}%`,
                  top: `${label.y}%`,
                  transform: "translate(-50%, -100%)",
                  pointerEvents: "auto",
                  width: "max-content",
                  maxWidth: "none",
                  minHeight: 0,
                  height: "auto",
                  padding: sizePreset.padding,
                  borderRadius: sizePreset.borderRadius,
                  border: isSelected ? "2px solid #FFFFFF" : "1px solid #F5C400",
                  background: isSelected ? "rgba(16,42,113,.96)" : "rgba(0,24,64,.9)",
                  color: "#FFDC5F",
                  fontSize: sizePreset.fontSize,
                  lineHeight: 1.2,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  boxShadow: isSelected
                    ? "0 0 0 2px #F5C400, 0 4px 12px #0008"
                    : "0 2px 8px #0005",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "block", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                  {label.text}
                </span>
                {label.description && isDescOpen && (
                  <span
                    style={{
                      display: "block",
                      color: "white",
                      fontWeight: 400,
                      fontSize: "11.5px",
                      lineHeight: 1.3,
                      marginTop: "4px",
                      whiteSpace: "normal",
                      maxWidth: "240px",
                      textAlign: "left",
                    }}
                  >
                    {label.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-gray-900 rounded-xl text-white text-sm"
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height, borderRadius: "12px", overflow: "hidden" }}>
      {loading && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 10,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#0d1f5c", borderRadius: "12px",
          }}
        >
          <div style={{
            width: 48, height: 48, border: "4px solid #F5C400",
            borderTopColor: "transparent", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", marginBottom: 12,
          }} />
          <p style={{ color: "#FFDC5F", fontSize: 13 }}>Loading 360° view…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
