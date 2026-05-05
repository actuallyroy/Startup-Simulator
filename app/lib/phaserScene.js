// Phaser 3 scene that renders the office world.
// Imported dynamically (browser-only) by PixelWorld.

import Phaser from 'phaser';
import { drawAvatar, randomAvatar } from './avatarConfig.js';

// Camera viewport — what the canvas displays at any moment.
const VIEW_W = 640;
const VIEW_H = 320;
// Actual world size — bigger than the viewport so players can pan around.
const WORLD_W = 1280;
const WORLD_H = 480;
const FLOOR_TOP = 130;
const FLOOR_BOTTOM = WORLD_H - 16;

const DESK_POSITIONS = [
  { x: 120, y: 220 }, { x: 320, y: 220 }, { x: 520, y: 220 },
  { x: 220, y: 320 }, { x: 420, y: 320 },
];

class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'world' });
    this.players = new Map();
    this.bugs = [];
    this.coins = [];
    this.chatBubbles = new Map();
    this.lastSentMove = 0;
  }

  init(data) {
    this.callbacks = data.callbacks || {};
    this.initialState = data.initialState || null;
  }

  create() {
    this.cameras.main.setBackgroundColor('#23272f');
    // Camera can scroll across the full world; the canvas viewport stays small.
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.drawWall();
    this.drawCeiling();
    this.drawWindow();
    this.drawFloor();
    this.drawDesks();
    this.drawServerRack();
    this.drawDustMotes();
    this.setupPan();

    this.playerLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0);
    this.bubbleLayer = this.add.container(0, 0);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    if (this.initialState) this.onStateUpdate(this.initialState);

    this.game.events.on('state:update', this.onStateUpdate, this);
    this.game.events.on('action:performed', this.onActionPerformed, this);
    this.game.events.on('event:critical', this.onCriticalEvent, this);
    this.game.events.on('chat:bubble', this.onChatBubble, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('state:update', this.onStateUpdate, this);
      this.game.events.off('action:performed', this.onActionPerformed, this);
      this.game.events.off('event:critical', this.onCriticalEvent, this);
      this.game.events.off('chat:bubble', this.onChatBubble, this);
    });
  }

  drawWall() {
    const g = this.add.graphics();
    // Warm wall — vertical gradient from soft dusk to wainscot
    for (let y = 60; y < FLOOR_TOP + 8; y += 4) {
      const t = (y - 60) / (FLOOR_TOP - 60);
      const r = Math.round(0x3d + (0x4a - 0x3d) * t);
      const gc = Math.round(0x35 + (0x42 - 0x35) * t);
      const b = Math.round(0x52 + (0x68 - 0x52) * t);
      const color = (r << 16) | (gc << 8) | b;
      g.fillStyle(color).fillRect(0, y, WORLD_W, 4);
    }
    // Wainscot stripe
    g.fillStyle(0x2a2f4a).fillRect(0, FLOOR_TOP - 8, WORLD_W, 8);
    g.fillStyle(0x363c5c).fillRect(0, FLOOR_TOP - 10, WORLD_W, 2);
    // Picture frames + whiteboard scattered along the wall
    const frame = (x, y, w, h, color) => {
      g.fillStyle(0x111).fillRect(x, y, w, h);
      g.fillStyle(color).fillRect(x + 2, y + 2, w - 4, h - 4);
    };
    frame(40, 78, 28, 22, 0x4fc3f7);
    frame(120, 76, 36, 26, 0xff8a65);
    frame(260, 80, 32, 24, 0x81c784);
    frame(420, 76, 28, 22, 0xc084fc);
    frame(WORLD_W - 80, 80, 30, 24, 0x81c784);
    frame(WORLD_W - 240, 76, 36, 26, 0xfacc15);
    // Whiteboard
    g.fillStyle(0xeceff1).fillRect(WORLD_W - 380, 78, 60, 32);
    g.lineStyle(2, 0x37474f).strokeRect(WORLD_W - 380, 78, 60, 32);
    g.fillStyle(0xef5350).fillRect(WORLD_W - 374, 84, 18, 2);
    g.fillStyle(0x4fc3f7).fillRect(WORLD_W - 374, 90, 24, 2);
    g.fillStyle(0x81c784).fillRect(WORLD_W - 374, 96, 14, 2);
    // Coffee station on the right side
    g.fillStyle(0x6d4c41).fillRect(WORLD_W - 140, FLOOR_TOP, 80, 14);
    g.fillStyle(0x3e2723).fillRect(WORLD_W - 130, FLOOR_TOP - 10, 10, 12);
    g.fillStyle(0x3e2723).fillRect(WORLD_W - 110, FLOOR_TOP - 8, 8, 10);
  }

  drawCeiling() {
    const g = this.add.graphics();
    g.fillStyle(0x1a252f).fillRect(0, 0, WORLD_W, 60);
    g.fillStyle(0x111820).fillRect(0, 56, WORLD_W, 4);
    this.add.text(WORLD_W / 2, 30, 'GARAGE STARTUP', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px', color: '#7f8c8d', letterSpacing: 4,
    }).setOrigin(0.5);
    this.stageText = this.children.list[this.children.list.length - 1];
  }

  drawWindow() {
    const g = this.add.graphics();
    // Two pretty windows with sunset gradient sky
    const drawOne = (cx) => {
      // Frame
      g.fillStyle(0x1a1f3a).fillRect(cx - 78, 14, 156, 60);
      // Sky gradient (top peach → bottom periwinkle)
      const skyTop = [0xff, 0xc4, 0x95];
      const skyBot = [0x7d, 0xd3, 0xfc];
      for (let i = 0; i < 44; i += 2) {
        const t = i / 44;
        const r = Math.round(skyTop[0] + (skyBot[0] - skyTop[0]) * t);
        const gc = Math.round(skyTop[1] + (skyBot[1] - skyTop[1]) * t);
        const b = Math.round(skyTop[2] + (skyBot[2] - skyTop[2]) * t);
        g.fillStyle((r << 16) | (gc << 8) | b).fillRect(cx - 70, 22 + i, 140, 2);
      }
      // Sun with soft glow
      g.fillStyle(0xfde68a, 0.4).fillCircle(cx + 40, 36, 12);
      g.fillStyle(0xfde047).fillCircle(cx + 40, 36, 6);
      // Distant buildings silhouette
      g.fillStyle(0x4a3a72).fillRect(cx - 60, 50, 22, 16);
      g.fillStyle(0x3a2c5a).fillRect(cx - 30, 42, 18, 24);
      g.fillStyle(0x4a3a72).fillRect(cx, 48, 14, 18);
      g.fillStyle(0x3a2c5a).fillRect(cx + 18, 40, 18, 26);
      // Window cross
      g.lineStyle(2, 0x14172b);
      g.lineBetween(cx, 22, cx, 66);
      g.lineBetween(cx - 70, 44, cx + 70, 44);
      // Sill
      g.fillStyle(0x2a2f4a).fillRect(cx - 84, 70, 168, 6);
    };
    drawOne(Math.floor(WORLD_W * 0.3));
    drawOne(Math.floor(WORLD_W * 0.7));
  }

  drawFloor() {
    const g = this.add.graphics();
    const tile = 16;
    // Wood-plank-style floor with subtle warm tones
    for (let y = Math.floor(FLOOR_TOP / tile); y < Math.ceil(FLOOR_BOTTOM / tile) + 1; y++) {
      for (let x = 0; x < WORLD_W / tile; x++) {
        const variant = (x * 7 + y * 13) % 5;
        const palette = [0x2e3354, 0x343a5e, 0x2a2f4a, 0x383e66, 0x2c3152];
        g.fillStyle(palette[variant]).fillRect(x * tile, y * tile, tile, tile);
        // Plank seams
        if (x % 4 === 0) {
          g.fillStyle(0x1f2240, 0.6).fillRect(x * tile, y * tile, 1, tile);
        }
      }
    }
    // Subtle vignette darkening at edges
    const vg = this.add.graphics();
    vg.fillStyle(0x000000, 0.35).fillRect(0, FLOOR_BOTTOM - 4, WORLD_W, 6);
    // Soft light pools beneath each window — pure visual ambience
    const pools = [Math.floor(WORLD_W * 0.3), Math.floor(WORLD_W * 0.7)];
    for (const cx of pools) {
      const light = this.add.graphics();
      light.fillStyle(0xfde68a, 0.06);
      for (let r = 80; r > 0; r -= 4) {
        light.fillEllipse(cx, FLOOR_TOP + 30, r, r * 0.4);
      }
    }
  }

  drawDesks() {
    for (const d of DESK_POSITIONS) {
      // Desk body
      this.add.rectangle(d.x, d.y, 64, 26, 0x8d6e63).setStrokeStyle(2, 0x5d4037);
      // Desk top
      this.add.rectangle(d.x, d.y - 10, 64, 4, 0x6d4c41);
      // Monitor base
      this.add.rectangle(d.x, d.y - 16, 8, 4, 0x37474f);
      // Monitor screen
      this.add.rectangle(d.x, d.y - 24, 22, 14, 0x1a1a1a).setStrokeStyle(2, 0xeceff1);
      this.add.rectangle(d.x, d.y - 24, 18, 10, 0x0d6e7a);
      // Code lines on screen
      this.add.rectangle(d.x - 6, d.y - 26, 8, 1, 0x4fc3f7);
      this.add.rectangle(d.x + 4, d.y - 24, 6, 1, 0x81c784);
      this.add.rectangle(d.x - 4, d.y - 22, 10, 1, 0xffb74d);
    }
  }

  drawDustMotes() {
    // Tiny floating dots that drift up — pure ambience
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * WORLD_W;
      const y = FLOOR_TOP + Math.random() * (FLOOR_BOTTOM - FLOOR_TOP);
      const dot = this.add.circle(x, y, 0.7 + Math.random() * 0.6, 0xfde68a, 0.35);
      this.tweens.add({
        targets: dot,
        y: y - 30 - Math.random() * 30,
        x: x + (Math.random() - 0.5) * 20,
        alpha: 0,
        duration: 6000 + Math.random() * 4000,
        repeat: -1,
        yoyo: false,
        onRepeat: () => {
          dot.x = Math.random() * WORLD_W;
          dot.y = FLOOR_BOTTOM - 4;
          dot.alpha = 0.35;
        },
      });
    }
  }

  setupPan() {
    this.userPanned = false;
    this.dragStart = null;
    this.input.on('pointerdown', (p) => {
      this.dragStart = { x: p.x, y: p.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY };
    });
    this.input.on('pointermove', (p) => {
      if (!p.isDown || !this.dragStart) return;
      const dx = p.x - this.dragStart.x;
      const dy = p.y - this.dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        this.userPanned = true;
        this.cameras.main.scrollX = this.dragStart.scrollX - dx;
        this.cameras.main.scrollY = this.dragStart.scrollY - dy;
      }
    });
    this.input.on('pointerup', () => { this.dragStart = null; });
    // Double-click to recenter on me
    this.input.on('pointerdown', (p) => {
      if (p.event && p.event.detail === 2) this.userPanned = false;
    });
  }

  centerCameraOnPlayer() {
    const me = [...this.players.values()].find(p => p.isMe);
    if (!me) return;
    const cam = this.cameras.main;
    cam.scrollX = me.container.x - VIEW_W / 2;
    cam.scrollY = me.container.y - VIEW_H / 2;
  }

  drawServerRack() {
    const x = WORLD_W - 60, y = 240;
    this.add.rectangle(x, y, 36, 80, 0x37474f).setStrokeStyle(3, 0x263238);
    // Slots
    for (let i = 0; i < 4; i++) {
      this.add.rectangle(x, y - 30 + i * 20, 26, 12, 0x263238);
    }
    // Status LEDs
    this.serverLEDs = [
      this.add.circle(x + 10, y - 30, 1.5, 0x4caf50),
      this.add.circle(x + 10, y - 10, 1.5, 0xffc107),
      this.add.circle(x + 10, y + 10, 1.5, 0x4caf50),
      this.add.circle(x + 10, y + 30, 1.5, 0xff5252),
    ];
    this.tweens.add({
      targets: this.serverLEDs,
      alpha: { from: 1, to: 0.3 },
      duration: 700, yoyo: true, repeat: -1,
    });
  }

  onStateUpdate(state) {
    this.lastState = state;

    // Sync players
    const incoming = new Set();
    const playerEntries = Object.entries(state.players || {});
    playerEntries.forEach(([id, p], idx) => {
      incoming.add(id);
      let entry = this.players.get(id);
      const desk = DESK_POSITIONS[idx] || DESK_POSITIONS[0];
      const startPos = p.position || desk;
      const isMe = id === state.socketId;
      const avatar = p.avatar || randomAvatar();

      if (!entry) {
        const container = drawAvatar(this, avatar);
        container.x = startPos.x;
        container.y = startPos.y;
        this.playerLayer.add(container);

        const nameText = (p.name || '?') + (isMe ? ' ★' : '');
        const tag = this.add.text(startPos.x, startPos.y + 32, nameText, {
          fontFamily: 'Inter, system-ui, sans-serif', fontSize: '10px',
          fontStyle: '700',
          color: isMe ? '#fde68a' : '#f1f5fb',
          backgroundColor: isMe ? 'rgba(20,23,43,0.85)' : 'rgba(20,23,43,0.7)',
          padding: { left: 6, right: 6, top: 3, bottom: 3 },
          stroke: isMe ? '#fde68a' : 'transparent', strokeThickness: isMe ? 1 : 0,
        }).setOrigin(0.5);
        this.playerLayer.add(tag);

        entry = {
          container, tag, target: { ...startPos }, isMe,
          name: p.name, avatarKey: JSON.stringify(avatar),
        };
        this.players.set(id, entry);
      } else {
        // Reapply avatar if it changed
        const newKey = JSON.stringify(avatar);
        if (newKey !== entry.avatarKey) {
          entry.container.destroy();
          const container = drawAvatar(this, avatar);
          container.x = entry.target.x;
          container.y = entry.target.y;
          this.playerLayer.add(container);
          entry.container = container;
          entry.avatarKey = newKey;
        }
        if (!isMe && p.position) {
          entry.target = { ...p.position };
        }
        entry.isMe = isMe;
      }
    });

    // Remove players that left
    for (const id of [...this.players.keys()]) {
      if (!incoming.has(id)) {
        const e = this.players.get(id);
        e.container.destroy();
        e.tag.destroy();
        this.players.delete(id);
      }
    }

    // Bug count
    const errors = state.metrics?.errors || 0;
    const targetBugs = Math.min(8, Math.floor(errors / 12));
    while (this.bugs.length < targetBugs) {
      this.spawnBug();
    }
    while (this.bugs.length > targetBugs) {
      const b = this.bugs.pop();
      b?.destroy();
    }

    // Coin count
    const revenue = state.metrics?.revenue || 0;
    const targetCoins = revenue > 1500 ? 4 : revenue > 500 ? 2 : 0;
    while (this.coins.length < targetCoins) {
      this.spawnCoin();
    }
    while (this.coins.length > targetCoins) {
      const c = this.coins.pop();
      c?.destroy();
    }

    // Camera shake on critical events
    const hasCrash = (state.activeEvents || []).some(e => e.severity === 'critical' && !e.responded);
    if (hasCrash && !this.shakeActive) {
      this.shakeActive = true;
      this.cameras.main.shake(800, 0.004);
      this.time.delayedCall(900, () => { this.shakeActive = false; });
    }
  }

  spawnBug() {
    const x = 60 + Math.random() * 460;
    const y = FLOOR_TOP + 20 + Math.random() * (FLOOR_BOTTOM - FLOOR_TOP - 60);
    const bug = this.add.text(x, y, '🐛', { fontSize: '14px' }).setOrigin(0.5);
    this.tweens.add({
      targets: bug, y: y - 4, duration: 400, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.fxLayer.add(bug);
    this.bugs.push(bug);
  }

  spawnCoin() {
    const x = 80 + Math.random() * 440;
    const y = FLOOR_TOP + 10 + Math.random() * 30;
    const coin = this.add.text(x, y, '💰', { fontSize: '14px' }).setOrigin(0.5);
    coin.alpha = 0;
    this.tweens.add({ targets: coin, alpha: 1, duration: 400, ease: 'Cubic.easeOut' });
    this.tweens.add({
      targets: coin, y: y - 6, duration: 900, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.fxLayer.add(coin);
    this.coins.push(coin);
  }

  onActionPerformed({ playerId, actionEmoji }) {
    const entry = this.players.get(playerId);
    if (!entry) return;
    const popup = this.add.text(entry.container.x, entry.container.y - 30, actionEmoji || '✨', {
      fontSize: '20px',
    }).setOrigin(0.5);
    this.fxLayer.add(popup);
    this.tweens.add({
      targets: popup, y: entry.container.y - 60, alpha: 0,
      duration: 1000, ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
    // Tiny bob on the avatar
    this.tweens.add({
      targets: entry.container, y: entry.target.y - 4,
      duration: 120, yoyo: true,
    });
  }

  onCriticalEvent() {
    this.cameras.main.shake(500, 0.003);
    this.cameras.main.flash(180, 248, 113, 113);
  }

  onChatBubble({ playerId, message }) {
    const entry = this.players.get(playerId);
    if (!entry) return;
    const old = this.chatBubbles.get(playerId);
    if (old) {
      old.bg.destroy();
      old.text.destroy();
    }
    const text = this.add.text(0, 0, message, {
      fontFamily: 'Inter, sans-serif', fontSize: '11px',
      color: '#000000', padding: { left: 8, right: 8, top: 4, bottom: 4 },
      backgroundColor: '#ffffff',
    }).setOrigin(0.5, 1);
    text.x = entry.container.x;
    text.y = entry.container.y - 28;
    this.bubbleLayer.add(text);
    this.chatBubbles.set(playerId, { bg: text, text });
    this.time.delayedCall(2500, () => {
      const cur = this.chatBubbles.get(playerId);
      if (cur && cur.text === text) {
        text.destroy();
        this.chatBubbles.delete(playerId);
      }
    });
  }

  update(time) {
    // Local input
    const me = [...this.players.values()].find(p => p.isMe);
    if (me) {
      const speed = 1.6;
      let dx = 0, dy = 0;
      if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= speed;
      if (this.cursors.right.isDown || this.wasd.D.isDown) dx += speed;
      if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= speed;
      if (this.cursors.down.isDown || this.wasd.S.isDown) dy += speed;
      if (dx !== 0 || dy !== 0) {
        // Movement re-snaps the camera to follow the player.
        this.userPanned = false;
        me.container.x = Phaser.Math.Clamp(me.container.x + dx, 16, WORLD_W - 16);
        me.container.y = Phaser.Math.Clamp(me.container.y + dy, FLOOR_TOP, FLOOR_BOTTOM);
        me.target.x = me.container.x;
        me.target.y = me.container.y;
        if (time - this.lastSentMove > 50 && this.callbacks.onMove) {
          this.callbacks.onMove({ x: me.container.x, y: me.container.y });
          this.lastSentMove = time;
        }
      }
    }

    // Tween remote players to their target
    for (const p of this.players.values()) {
      if (p.isMe) continue;
      p.container.x += (p.target.x - p.container.x) * 0.18;
      p.container.y += (p.target.y - p.container.y) * 0.18;
    }
    // Sync name tags
    for (const p of this.players.values()) {
      p.tag.x = p.container.x;
      p.tag.y = p.container.y + 32;
    }
    // Sync chat bubbles
    for (const [id, bub] of this.chatBubbles) {
      const e = this.players.get(id);
      if (e) {
        bub.text.x = e.container.x;
        bub.text.y = e.container.y - 28;
      }
    }

    // Camera: follow the player smoothly unless they're panning manually
    if (!this.userPanned && me) {
      const cam = this.cameras.main;
      const targetX = me.container.x - VIEW_W / 2;
      const targetY = me.container.y - VIEW_H / 2;
      cam.scrollX += (targetX - cam.scrollX) * 0.08;
      cam.scrollY += (targetY - cam.scrollY) * 0.08;
    }
  }
}

export function startPhaserGame(parent, callbacks) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_W,
    height: VIEW_H,
    backgroundColor: '#23272f',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: VIEW_W,
      height: VIEW_H,
    },
    scene: [WorldScene],
    audio: { noAudio: true },
    banner: false,
  });
  game.scene.start('world', { callbacks });
  return game;
}
