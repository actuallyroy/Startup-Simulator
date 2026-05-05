// Procedural pixel-art avatar customization options.
// Used by the lobby customizer, the server (stored on each player),
// and the Phaser scene that renders the world.

export const AVATAR_OPTIONS = {
  skinColors: [
    '#fdbcb4', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#604332',
  ],
  hairStyles: ['short', 'long', 'spiky', 'bun', 'mohawk', 'bald'],
  hairColors: [
    '#1c1c1c', '#3b2820', '#7a4d2e', '#bf8a4d', '#e8c573', '#ad3c3c',
    '#3e7d44', '#5b3da7', '#cf4a8b',
  ],
  shirtColors: [
    '#4fc3f7', '#ce93d8', '#ffb74d', '#81c784', '#ef5350',
    '#90a4ae', '#fff176', '#ff8a65', '#7986cb',
  ],
  pantsColors: ['#2c3e50', '#3e2723', '#37474f', '#4a148c', '#1b5e20'],
  accessories: ['none', 'glasses', 'beard', 'headphones', 'cap', 'monocle'],
};

export const DEFAULT_AVATAR = {
  skin: '#f1c27d',
  hair: 'short',
  hairColor: '#3b2820',
  shirt: '#4fc3f7',
  pants: '#2c3e50',
  accessory: 'none',
};

export function randomAvatar() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return {
    skin: pick(AVATAR_OPTIONS.skinColors),
    hair: pick(AVATAR_OPTIONS.hairStyles),
    hairColor: pick(AVATAR_OPTIONS.hairColors),
    shirt: pick(AVATAR_OPTIONS.shirtColors),
    pants: pick(AVATAR_OPTIONS.pantsColors),
    accessory: pick(AVATAR_OPTIONS.accessories),
  };
}

export function sanitizeAvatar(input) {
  const a = { ...DEFAULT_AVATAR, ...(input || {}) };
  if (!AVATAR_OPTIONS.skinColors.includes(a.skin)) a.skin = DEFAULT_AVATAR.skin;
  if (!AVATAR_OPTIONS.hairStyles.includes(a.hair)) a.hair = DEFAULT_AVATAR.hair;
  if (!AVATAR_OPTIONS.hairColors.includes(a.hairColor)) a.hairColor = DEFAULT_AVATAR.hairColor;
  if (!AVATAR_OPTIONS.shirtColors.includes(a.shirt)) a.shirt = DEFAULT_AVATAR.shirt;
  if (!AVATAR_OPTIONS.pantsColors.includes(a.pants)) a.pants = DEFAULT_AVATAR.pants;
  if (!AVATAR_OPTIONS.accessories.includes(a.accessory)) a.accessory = DEFAULT_AVATAR.accessory;
  return a;
}

const hexToInt = (hex) => parseInt(hex.replace('#', ''), 16);

// Draws an avatar into a Phaser container at (0,0). Caller positions container.
// `Phaser` is passed in to avoid a static import (Phaser must be browser-only).
export function drawAvatar(scene, avatar, scale = 1) {
  const a = sanitizeAvatar(avatar);
  const skin = hexToInt(a.skin);
  const hair = hexToInt(a.hairColor);
  const shirt = hexToInt(a.shirt);
  const pants = hexToInt(a.pants);
  const outline = 0x000000;

  const c = scene.add.container(0, 0);
  const parts = [];

  // Legs
  parts.push(scene.add.rectangle(-3, 18, 5, 9, pants).setStrokeStyle(1, outline));
  parts.push(scene.add.rectangle(3, 18, 5, 9, pants).setStrokeStyle(1, outline));
  // Shoes
  parts.push(scene.add.rectangle(-3, 23, 6, 3, 0x222222));
  parts.push(scene.add.rectangle(3, 23, 6, 3, 0x222222));

  // Body (shirt)
  parts.push(scene.add.rectangle(0, 6, 16, 14, shirt).setStrokeStyle(1, outline));
  // Arms
  parts.push(scene.add.rectangle(-9, 5, 4, 12, shirt).setStrokeStyle(1, outline));
  parts.push(scene.add.rectangle(9, 5, 4, 12, shirt).setStrokeStyle(1, outline));
  // Hands
  parts.push(scene.add.rectangle(-9, 11, 4, 3, skin).setStrokeStyle(1, outline));
  parts.push(scene.add.rectangle(9, 11, 4, 3, skin).setStrokeStyle(1, outline));

  // Neck
  parts.push(scene.add.rectangle(0, -1, 4, 3, skin));

  // Head
  parts.push(scene.add.rectangle(0, -8, 14, 12, skin).setStrokeStyle(1, outline));

  // Eyes
  parts.push(scene.add.rectangle(-3, -8, 1.5, 2, 0x000000));
  parts.push(scene.add.rectangle(3, -8, 1.5, 2, 0x000000));

  // Mouth
  parts.push(scene.add.rectangle(0, -3, 4, 1, 0x33180e));

  // Hair (drawn after head so it overlaps)
  const hairGfx = scene.add.graphics();
  hairGfx.fillStyle(hair);
  switch (a.hair) {
    case 'short':
      hairGfx.fillRect(-7, -15, 14, 4);
      hairGfx.fillRect(-7, -12, 3, 3);
      hairGfx.fillRect(4, -12, 3, 3);
      break;
    case 'long':
      hairGfx.fillRect(-8, -15, 16, 5);
      hairGfx.fillRect(-8, -10, 3, 8);
      hairGfx.fillRect(5, -10, 3, 8);
      break;
    case 'spiky':
      hairGfx.fillRect(-7, -14, 14, 3);
      hairGfx.fillTriangle(-7, -14, -4, -19, -1, -14);
      hairGfx.fillTriangle(-2, -14, 1, -20, 4, -14);
      hairGfx.fillTriangle(3, -14, 6, -19, 9, -14);
      break;
    case 'bun':
      hairGfx.fillRect(-7, -15, 14, 4);
      hairGfx.fillCircle(0, -19, 4);
      break;
    case 'mohawk':
      hairGfx.fillRect(-1.5, -19, 3, 7);
      hairGfx.fillRect(-7, -14, 14, 2);
      break;
    case 'bald':
      // nothing
      break;
    default:
      hairGfx.fillRect(-7, -15, 14, 4);
  }
  parts.push(hairGfx);

  // Accessories
  if (a.accessory === 'glasses') {
    const g = scene.add.graphics();
    g.lineStyle(1, 0x111111).fillStyle(0xddeeff, 0.5);
    g.strokeRect(-6, -10, 4, 4).fillRect(-6, -10, 4, 4);
    g.strokeRect(2, -10, 4, 4).fillRect(2, -10, 4, 4);
    g.lineStyle(1, 0x111111).lineBetween(-2, -8, 2, -8);
    parts.push(g);
  } else if (a.accessory === 'monocle') {
    const g = scene.add.graphics();
    g.lineStyle(1, 0xffd54f).strokeCircle(3, -8, 3);
    g.lineStyle(1, 0xffd54f).lineBetween(3, -5, 6, 0);
    parts.push(g);
  } else if (a.accessory === 'beard') {
    parts.push(scene.add.rectangle(0, -2, 10, 3, hair).setStrokeStyle(1, outline));
    parts.push(scene.add.rectangle(-4, -3, 2, 2, hair));
    parts.push(scene.add.rectangle(4, -3, 2, 2, hair));
  } else if (a.accessory === 'headphones') {
    const h = scene.add.graphics();
    h.fillStyle(0x222222);
    h.fillRect(-9, -10, 3, 5);
    h.fillRect(6, -10, 3, 5);
    h.lineStyle(2, 0x222222).strokeCircle(0, -16, 8);
    parts.push(h);
  } else if (a.accessory === 'cap') {
    parts.push(scene.add.rectangle(0, -15, 16, 4, 0xc62828).setStrokeStyle(1, outline));
    parts.push(scene.add.rectangle(-9, -13, 5, 2, 0xc62828).setStrokeStyle(1, outline));
  }

  c.add(parts);
  c.setScale(scale);
  return c;
}
