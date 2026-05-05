// Tiny pub/sub used to bridge React (socket events) → Phaser scene.
// PixelWorld registers a forwarder and useSocket calls publish().

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function publish(eventName, payload) {
  for (const fn of listeners) {
    try { fn(eventName, payload); } catch (e) { /* swallow */ }
  }
}
