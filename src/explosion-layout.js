// Adapted from Human Atlas (MIT), ashemag/human-atlas, explosion-layout.ts.
export const TISSUE_ORDER = ["bones", "neck", "muscles", "teeth", "gingiva", "soft", "glands", "arteries", "veins", "nerves", "brain", "eyes", "airway", "skin"];
export const tissueGroup = (part) => part.group === "neck" ? "bones" : part.group;
export function tissueSeparation(part) {
  const tissues = TISSUE_ORDER.filter((group) => group !== "neck");
  const angle = tissues.indexOf(tissueGroup(part)) / tissues.length * Math.PI * 2;
  return [Math.sin(angle) * 0.095, 0, Math.cos(angle) * 0.095];
}
export function createExplosionLayout(parts, aspect = 1) {
  const cards = parts.map((part) => ({
    id: part.id,
    tissue: tissueGroup(part),
    width: Math.max(0.006, part.bounds[1][0] - part.bounds[0][0]) + 0.009,
    height: Math.max(0.006, part.bounds[1][1] - part.bounds[0][1]) + 0.009,
  }));
  const area = cards.reduce((sum, card) => sum + card.width * card.height, 0);
  const targetWidth = Math.max(0.03, ...cards.map((card) => card.width),
    Math.sqrt(area * Math.max(0.4, Math.min(1.8, aspect))) * 1.18);
  cards.sort((a, b) => TISSUE_ORDER.indexOf(a.tissue) - TISSUE_ORDER.indexOf(b.tissue) || b.height - a.height || a.id.localeCompare(b.id));
  const cells = new Map();
  let x = 0, y = 0, row = 0, width = 0, tissue;
  for (const card of cards) {
    if (x > 0 && (card.tissue !== tissue || x + card.width > targetWidth)) { x = 0; y += row; row = 0; }
    tissue = card.tissue;
    cells.set(card.id, { x: x + card.width / 2, y: -y - card.height / 2,
      width: card.width, height: card.height });
    x += card.width;
    width = Math.max(width, x);
    row = Math.max(row, card.height);
  }
  const height = y + row;
  for (const cell of cells.values()) { cell.x -= width / 2; cell.y += height / 2; }
  return { cells, width, height };
}
