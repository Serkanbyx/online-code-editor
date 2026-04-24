export const cursorColors = Object.freeze([
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#be123c',
  '#4f46e5',
  '#65a30d',
  '#c026d3',
  '#0d9488',
  '#ca8a04',
  '#7c3aed',
  '#0284c7',
  '#db2777',
  '#059669',
]);

function hashUserId(userId) {
  const input = String(userId || 'anonymous');
  let hash = 2_166_136_261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

export function getCursorColorIndex(userId) {
  return hashUserId(userId) % cursorColors.length;
}

export function pickCursorColor(userId) {
  return cursorColors[getCursorColorIndex(userId)];
}
