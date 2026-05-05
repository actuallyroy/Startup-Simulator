'use client';

import { useEffect, useRef, useState } from 'react';
import { AVATAR_OPTIONS, DEFAULT_AVATAR, randomAvatar, sanitizeAvatar } from '../lib/avatarConfig';

// Renders a preview of the avatar by drawing onto a 2D canvas.
// Mirrors phaserAvatar.js geometry so the lobby preview matches in-game.
function paintAvatar(ctx, w, h, avatar) {
  const a = sanitizeAvatar(avatar);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#1a1d2d';
  ctx.fillRect(0, 0, w, h);
  // Floor stripe
  ctx.fillStyle = '#2f3845';
  ctx.fillRect(0, h - 20, w, 20);

  const scale = 5; // preview is ~5x in-game scale
  const cx = w / 2;
  const cy = h / 2 + 24;

  const drawRect = (x, y, ww, hh, fill, stroke) => {
    ctx.fillStyle = fill;
    ctx.fillRect(cx + x * scale - (ww * scale) / 2, cy + y * scale - (hh * scale) / 2, ww * scale, hh * scale);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        cx + x * scale - (ww * scale) / 2 + 0.5,
        cy + y * scale - (hh * scale) / 2 + 0.5,
        ww * scale - 1, hh * scale - 1,
      );
    }
  };

  // Legs
  drawRect(-3, 18, 5, 9, a.pants, '#000');
  drawRect(3, 18, 5, 9, a.pants, '#000');
  // Shoes
  drawRect(-3, 23, 6, 3, '#222');
  drawRect(3, 23, 6, 3, '#222');
  // Body
  drawRect(0, 6, 16, 14, a.shirt, '#000');
  // Arms
  drawRect(-9, 5, 4, 12, a.shirt, '#000');
  drawRect(9, 5, 4, 12, a.shirt, '#000');
  // Hands
  drawRect(-9, 11, 4, 3, a.skin, '#000');
  drawRect(9, 11, 4, 3, a.skin, '#000');
  // Neck
  drawRect(0, -1, 4, 3, a.skin);
  // Head
  drawRect(0, -8, 14, 12, a.skin, '#000');
  // Eyes
  drawRect(-3, -8, 1.5, 2, '#000');
  drawRect(3, -8, 1.5, 2, '#000');
  // Mouth
  drawRect(0, -3, 4, 1, '#33180e');

  // Hair
  ctx.fillStyle = a.hairColor;
  const hairRect = (x, y, ww, hh) => ctx.fillRect(cx + x * scale, cy + y * scale, ww * scale, hh * scale);
  switch (a.hair) {
    case 'short':
      hairRect(-7, -15, 14, 4);
      hairRect(-7, -12, 3, 3);
      hairRect(4, -12, 3, 3);
      break;
    case 'long':
      hairRect(-8, -15, 16, 5);
      hairRect(-8, -10, 3, 8);
      hairRect(5, -10, 3, 8);
      break;
    case 'spiky':
      hairRect(-7, -14, 14, 3);
      ctx.beginPath();
      ctx.moveTo(cx + -7 * scale, cy + -14 * scale);
      ctx.lineTo(cx + -4 * scale, cy + -19 * scale);
      ctx.lineTo(cx + -1 * scale, cy + -14 * scale);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + -2 * scale, cy + -14 * scale);
      ctx.lineTo(cx + 1 * scale, cy + -20 * scale);
      ctx.lineTo(cx + 4 * scale, cy + -14 * scale);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 3 * scale, cy + -14 * scale);
      ctx.lineTo(cx + 6 * scale, cy + -19 * scale);
      ctx.lineTo(cx + 9 * scale, cy + -14 * scale);
      ctx.fill();
      break;
    case 'bun':
      hairRect(-7, -15, 14, 4);
      ctx.beginPath();
      ctx.arc(cx, cy + -19 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'mohawk':
      hairRect(-1.5, -19, 3, 7);
      hairRect(-7, -14, 14, 2);
      break;
    case 'bald':
      break;
    default:
      hairRect(-7, -15, 14, 4);
  }

  // Accessories
  if (a.accessory === 'glasses') {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111';
    ctx.fillStyle = 'rgba(221,238,255,0.5)';
    ctx.fillRect(cx + -6 * scale, cy + -10 * scale, 4 * scale, 4 * scale);
    ctx.strokeRect(cx + -6 * scale, cy + -10 * scale, 4 * scale, 4 * scale);
    ctx.fillRect(cx + 2 * scale, cy + -10 * scale, 4 * scale, 4 * scale);
    ctx.strokeRect(cx + 2 * scale, cy + -10 * scale, 4 * scale, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(cx + -2 * scale, cy + -8 * scale);
    ctx.lineTo(cx + 2 * scale, cy + -8 * scale);
    ctx.stroke();
  } else if (a.accessory === 'beard') {
    drawRect(0, -2, 10, 3, a.hairColor, '#000');
    drawRect(-4, -3, 2, 2, a.hairColor);
    drawRect(4, -3, 2, 2, a.hairColor);
  } else if (a.accessory === 'headphones') {
    ctx.fillStyle = '#222';
    ctx.fillRect(cx + -9 * scale, cy + -10 * scale, 3 * scale, 5 * scale);
    ctx.fillRect(cx + 6 * scale, cy + -10 * scale, 3 * scale, 5 * scale);
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    ctx.arc(cx, cy + -16 * scale, 8 * scale, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (a.accessory === 'cap') {
    drawRect(0, -15, 16, 4, '#c62828', '#000');
    drawRect(-9, -13, 5, 2, '#c62828', '#000');
  } else if (a.accessory === 'monocle') {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(cx + 3 * scale, cy + -8 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 3 * scale, cy + -5 * scale);
    ctx.lineTo(cx + 6 * scale, cy);
    ctx.stroke();
  }
}

export default function AvatarCustomizer({ value, onChange }) {
  const canvasRef = useRef(null);
  const [avatar, setAvatar] = useState(() => sanitizeAvatar(value || DEFAULT_AVATAR));

  useEffect(() => {
    if (value) setAvatar(sanitizeAvatar(value));
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintAvatar(canvas.getContext('2d'), canvas.width, canvas.height, avatar);
  }, [avatar]);

  const update = (patch) => {
    const next = sanitizeAvatar({ ...avatar, ...patch });
    setAvatar(next);
    onChange?.(next);
  };

  const Swatch = ({ color, active, onClick }) => (
    <button
      type="button"
      className={`avatar-swatch ${active ? 'active' : ''}`}
      style={{ background: color }}
      onClick={onClick}
      aria-label={color}
    />
  );

  return (
    <div className="avatar-customizer">
      <div className="avatar-preview-wrap">
        <canvas ref={canvasRef} width={180} height={220} className="avatar-preview" />
        <button type="button" className="avatar-randomize"
          onClick={() => update(randomAvatar())}>🎲 Randomize</button>
      </div>
      <div className="avatar-controls">
        <div className="avatar-row">
          <label>Skin</label>
          <div className="swatch-row">
            {AVATAR_OPTIONS.skinColors.map((c) => (
              <Swatch key={c} color={c} active={avatar.skin === c} onClick={() => update({ skin: c })} />
            ))}
          </div>
        </div>
        <div className="avatar-row">
          <label>Hair</label>
          <div className="swatch-row">
            {AVATAR_OPTIONS.hairStyles.map((h) => (
              <button key={h} type="button"
                className={`avatar-pill ${avatar.hair === h ? 'active' : ''}`}
                onClick={() => update({ hair: h })}>{h}</button>
            ))}
          </div>
          <div className="swatch-row">
            {AVATAR_OPTIONS.hairColors.map((c) => (
              <Swatch key={c} color={c} active={avatar.hairColor === c} onClick={() => update({ hairColor: c })} />
            ))}
          </div>
        </div>
        <div className="avatar-row">
          <label>Shirt</label>
          <div className="swatch-row">
            {AVATAR_OPTIONS.shirtColors.map((c) => (
              <Swatch key={c} color={c} active={avatar.shirt === c} onClick={() => update({ shirt: c })} />
            ))}
          </div>
        </div>
        <div className="avatar-row">
          <label>Pants</label>
          <div className="swatch-row">
            {AVATAR_OPTIONS.pantsColors.map((c) => (
              <Swatch key={c} color={c} active={avatar.pants === c} onClick={() => update({ pants: c })} />
            ))}
          </div>
        </div>
        <div className="avatar-row">
          <label>Accessory</label>
          <div className="swatch-row">
            {AVATAR_OPTIONS.accessories.map((acc) => (
              <button key={acc} type="button"
                className={`avatar-pill ${avatar.accessory === acc ? 'active' : ''}`}
                onClick={() => update({ accessory: acc })}>{acc}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
