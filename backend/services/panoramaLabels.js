import { DataTypes } from 'sequelize';

const SIZES = new Set(['sm', 'md', 'lg']);

export function validateLabels(input) {
  let labels;
  try { labels = typeof input === 'string' ? JSON.parse(input) : input; } catch { throw invalid(); }
  if (!Array.isArray(labels) || labels.length > 40) throw invalid();
  const ids = new Set();
  return labels.map(label => {
    const hasSpherical = Number.isFinite(label?.yaw) && Number.isFinite(label?.pitch);
    const hasOverlay = Number.isFinite(label?.x) && Number.isFinite(label?.y);
    if (!label || typeof label.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(label.id) || ids.has(label.id)
      || typeof label.text !== 'string' || !label.text.trim() || label.text.length > 80
      || (label.description !== undefined && (typeof label.description !== 'string' || label.description.length > 500))
      || (label.size !== undefined && !SIZES.has(label.size))
      || (!hasSpherical && !hasOverlay)) throw invalid();
    if (hasSpherical && (label.yaw < -Math.PI * 2 || label.yaw > Math.PI * 2 || Math.abs(label.pitch) > Math.PI / 2)) throw invalid();
    if (hasOverlay && (label.x < 0 || label.x > 100 || label.y < 0 || label.y > 100)) throw invalid();
    ids.add(label.id);
    const size = SIZES.has(label.size) ? label.size : 'md';
    return {
      id: label.id,
      text: label.text.trim(),
      description: (label.description || '').trim(),
      size,
      yaw: hasSpherical ? label.yaw : 0,
      pitch: hasSpherical ? label.pitch : 0,
      ...(hasOverlay ? { x: Number(label.x.toFixed(2)), y: Number(label.y.toFixed(2)) } : {}),
    };
  });
}
function invalid() { return Object.assign(new Error('Invalid panorama labels. Use at most 40 labels, 80-character names, 500-character descriptions, and valid panorama positions.'), { status: 400 }); }
export async function ensurePanoramaLabelColumn(sequelize) {
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable('Buildings');
  if (!columns.panoramaLabels) await qi.addColumn('Buildings', 'panoramaLabels', { type: DataTypes.JSON, allowNull: true });
}
