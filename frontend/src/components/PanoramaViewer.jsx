import { useEffect, useRef, useState } from "react";

/**
 * PanoramaViewer — interactive 360° equirectangular panorama viewer.
 * Uses @photo-sphere-viewer/core loaded dynamically to avoid SSR issues.
 */
export function PanoramaViewer({ src, height = "420px", labels = [], onPick }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const pickRef = useRef(onPick);
  const [ready, setReady] = useState(0);
  useEffect(() => { pickRef.current = onPick; }, [onPick]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !src) return;

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
          panorama: src,
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
  }, [src]);

  useEffect(() => {
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
      Object.assign(button.style, { position: 'absolute', pointerEvents: 'auto', transform: 'translate(-50%, -100%)', maxWidth: '220px', padding: '7px 12px', borderRadius: '10px', border: '1px solid #F5C400', background: 'rgba(0,24,64,.9)', color: '#FFDC5F', fontSize: '13px', fontWeight: '600', whiteSpace: 'normal', boxShadow: '0 2px 8px #0005', cursor: 'pointer' });
      const name = document.createElement('span');
      name.textContent = label.text;
      button.appendChild(name);
      if (label.description) {
        const details = document.createElement('span');
        details.textContent = label.description;
        Object.assign(details.style, { display: 'none', color: 'white', fontWeight: '400', fontSize: '12px', marginTop: '5px' });
        button.appendChild(details);
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', event => {
          event.stopPropagation();
          const open = details.style.display === 'none';
          details.style.display = open ? 'block' : 'none';
          button.setAttribute('aria-expanded', String(open));
        });
      } else button.addEventListener('click', event => event.stopPropagation());
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
  }, [labels, ready, src]);

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
