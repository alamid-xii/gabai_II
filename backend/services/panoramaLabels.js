import { DataTypes } from 'sequelize';

export function validateLabels(input) {
  let labels;
  try { labels = typeof input === 'string' ? JSON.parse(input) : input; } catch { throw invalid(); }
  if (!Array.isArray(labels) || labels.length > 40) throw invalid();
  const ids = new Set();
  return labels.map(label => {
    if (!label || typeof label.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(label.id) || ids.has(label.id)
      || typeof label.text !== 'string' || !label.text.trim() || label.text.length > 80
      || (label.description !== undefined && (typeof label.description !== 'string' || label.description.length > 500))
      || !Number.isFinite(label.yaw) || label.yaw < -Math.PI * 2 || label.yaw > Math.PI * 2
      || !Number.isFinite(label.pitch) || Math.abs(label.pitch) > Math.PI / 2) throw invalid();
    ids.add(label.id);
    return { id: label.id, text: label.text.trim(), description: (label.description || '').trim(), yaw: label.yaw, pitch: label.pitch };
  });
}
function invalid() { return Object.assign(new Error('Invalid panorama labels. Use at most 40 labels, 80-character names, 500-character descriptions, and valid panorama positions.'), { status: 400 }); }
export async function ensurePanoramaLabelColumn(sequelize) {
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable('Buildings');
  if (!columns.panoramaLabels) await qi.addColumn('Buildings', 'panoramaLabels', { type: DataTypes.JSON, allowNull: true });
}
