// Phaser 3 scene that renders the office world.
// Imported dynamically (browser-only) by PixelWorld.

import Phaser from 'phaser';
import { drawAvatar, randomAvatar } from './avatarConfig.js';

const WORLD_W = 640;
const WORLD_H = 320;
const FLOOR_TOP = 130;
const FLOOR_BOTTOM = 304;

const DESK_POSITIONS = [
  { x: 90, y: 220 }, { x: 220, y: 220 }, { x: 350, y: 220 },
  { x: 90, y: 280 }, { x: 220, y: 280 },
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

    this.drawWall();
    this.drawCeiling();
    this.drawWindow();
    this.drawFloor();
    this.drawDesks();
    this.drawServerRack();

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
    // Solid wall color from top of room to floor
    g.fillStyle(0x4a5568).fillRect(0, 60, WORLD_W, FLOOR_TOP - 60 + 8);
    // Wall stripes / wainscot
    g.fillStyle(0x3a4252).fillRect(0, FLOOR_TOP - 6, WORLD_W, 6);
    // Picture frames on the wall as dressing
    const frame = (x, y, w, h, color) => {
      g.fillStyle(0x111).fillRect(x, y, w, h);
      g.fillStyle(color).fillRect(x + 2, y + 2, w - 4, h - 4);
    };
    frame(40, 78, 28, 22, 0x4fc3f7);
    frame(120, 76, 36, 26, 0xff8a65);
    frame(WORLD_W - 80, 80, 30, 24, 0x81c784);
    // "WHITEBOARD" near the right
    g.fillStyle(0xeceff1).fillRect(WORLD_W - 180, 78, 60, 32);
    g.lineStyle(2, 0x37474f).strokeRect(WORLD_W - 180, 78, 60, 32);
    g.fillStyle(0xef5350).fillRect(WORLD_W - 174, 84, 18, 2);
    g.fillStyle(0x4fc3f7).fillRect(WORLD_W - 174, 90, 24, 2);
    g.fillStyle(0x81c784).fillRect(WORLD_W - 174, 96, 14, 2);
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
    g.fillStyle(0x2c3e50).fillRect(WORLD_W / 2 - 76, 16, 152, 56);
    g.fillStyle(0x87ceeb).fillRect(WORLD_W / 2 - 70, 22, 140, 44);
    // Sun
    g.fillStyle(0xfff176).fillCircle(WORLD_W / 2 + 40, 36, 6);
    // Distant buildings
    g.fillStyle(0x546e7a).fillRect(WORLD_W / 2 - 60, 50, 22, 16);
    g.fillStyle(0x455a64).fillRect(WORLD_W / 2 - 30, 42, 18, 24);
    g.fillStyle(0x546e7a).fillRect(WORLD_W / 2, 48, 14, 18);
    g.fillStyle(0x455a64).fillRect(WORLD_W / 2 + 18, 40, 18, 26);
  }

  drawFloor() {
    const g = this.add.graphics();
    const tile = 16;
    for (let y = Math.floor(FLOOR_TOP / tile); y < Math.ceil(FLOOR_BOTTOM / tile) + 1; y++) {
      for (let x = 0; x < WORLD_W / tile; x++) {
        const c = (x + y) % 2 === 0 ? 0x3b4654 : 0x2f3845;
        g.fillStyle(c).fillRect(x * tile, y * tile, tile, tile);
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

  drawServerRack() {
    const x = 580, y = 240;
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

        const nameText = (p.name || '?') + (isMe ? ' (YOU)' : '');
        const tag = this.add.text(startPos.x, startPos.y + 32, nameText, {
          fontFamily: 'Press Start 2P, monospace', fontSize: '7px',
          color: isMe ? '#ffd54f' : '#ffffff',
          backgroundColor: '#000000aa', padding: { left: 4, right: 4, top: 2, bottom: 2 },
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
  }
}

export function startPhaserGame(parent, callbacks) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD_W,
    height: WORLD_H,
    backgroundColor: '#23272f',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD_W,
      height: WORLD_H,
    },
    scene: [WorldScene],
    audio: { noAudio: true },
    banner: false,
  });
  game.scene.start('world', { callbacks });
  return game;
}
