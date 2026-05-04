'use client';

import { useMemo } from 'react';
import { ROLES, WORLD_STAGES } from '../lib/gameConfig';

export default function PixelWorld({ metrics, stage, activeEvents, players }) {
  // Number of tiny user sprites based on user count
  const userCount = Math.min(40, Math.floor((metrics?.users || 0) / 50));

  // Server health indicators
  const errorRate = metrics?.errors || 0;
  const latency = metrics?.latency || 50;

  // Determine server light statuses
  const serverLights = useMemo(() => {
    const lights = [];
    for (let i = 0; i < 8; i++) {
      if (errorRate > 70 && Math.random() > 0.4) lights.push('red');
      else if (errorRate > 30 && Math.random() > 0.6) lights.push('yellow');
      else lights.push('green');
    }
    return lights;
  }, [errorRate, Math.floor(metrics?.errors / 10)]);

  // Desks based on stage
  const deskCount = [2, 3, 4, 6][stage] || 2;
  const stageInfo = WORLD_STAGES[stage] || WORLD_STAGES[0];

  // Characters from player list
  const playerList = players ? Object.values(players) : [];

  // Active event visual effects
  const hasCrash = activeEvents?.some(e => e.id === 'serviceCrash');
  const hasSpike = activeEvents?.some(e => e.id === 'trafficSpike');

  return (
    <div className="pixel-world">
      <div
        className="office-scene"
        style={{
          animation: hasCrash ? 'shake 0.2s infinite' : undefined,
          filter: latency > 500 ? `blur(${Math.min(2, (latency - 500) / 500)}px)` : undefined,
        }}
      >
        {/* Wall */}
        <div className="office-wall">
          {/* Window decoration */}
          <div style={{
            position: 'absolute', top: '20px', left: '30px', width: '50px', height: '40px',
            border: '3px solid #3a3a5e', background: hasSpike
              ? 'linear-gradient(180deg, #1a237e, #283593)'
              : 'linear-gradient(180deg, #0d1b2a, #1b2838)',
          }}>
            {hasSpike && (
              <div style={{ position: 'absolute', top: '5px', left: '5px', fontSize: '1.2rem', animation: 'blink 0.5s infinite' }}>
                📈
              </div>
            )}
          </div>

          {/* Company name */}
          <div style={{
            position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '0.5rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-pixel)',
            letterSpacing: '2px', opacity: 0.7,
          }}>
            {stageInfo.name.toUpperCase()}
          </div>

          {/* Motivational poster */}
          <div style={{
            position: 'absolute', top: '25px', right: '30px', width: '40px', height: '30px',
            background: 'var(--bg-card)', border: '2px solid #3a3a5e', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
          }}>
            🚀
          </div>
        </div>

        {/* Floor */}
        <div className="office-floor" />

        {/* Desks */}
        {Array.from({ length: deskCount }).map((_, i) => {
          const leftPos = 80 + i * (500 / deskCount);
          const monitorActive = errorRate < 50;
          return (
            <div key={`desk-${i}`}>
              <div className="desk" style={{ left: `${leftPos}px` }}>
                <div className="monitor">
                  <div className={`monitor-screen ${monitorActive ? 'active' : 'error'}`} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Server rack */}
        <div className="server-rack">
          {serverLights.map((color, i) => (
            <div key={`light-${i}`} className={`server-light ${color}`} />
          ))}
        </div>

        {/* Player characters */}
        {playerList.map((p, i) => {
          const role = Object.values(ROLES).find(r => r.id === p.role);
          const leftPos = 100 + i * 100;
          return (
            <div key={p.id} className="character" style={{ left: `${leftPos}px` }}>
              <div className="character-head" style={{ background: role?.color || '#888' }} />
              <div className="character-body" style={{ background: role?.color || '#888', opacity: 0.8 }} />
              <div style={{
                position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                fontSize: '0.7rem', whiteSpace: 'nowrap',
              }}>
                {role?.emoji || '👤'}
              </div>
              <div style={{
                position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)',
                fontSize: '0.3rem', color: role?.color || '#888', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-pixel)',
              }}>
                {p.name}
              </div>
            </div>
          );
        })}

        {/* User crowd */}
        <div className="user-crowd">
          {Array.from({ length: userCount }).map((_, i) => (
            <div
              key={`user-${i}`}
              className="tiny-user"
              style={{ animationDelay: `${i * 0.05}s`, opacity: 0.3 + Math.random() * 0.5 }}
            />
          ))}
        </div>

        {/* Floating bug icons when errors are high */}
        {errorRate > 40 && Array.from({ length: Math.min(5, Math.floor(errorRate / 20)) }).map((_, i) => (
          <div
            key={`bug-${i}`}
            className="floating-icon"
            style={{
              left: `${100 + Math.random() * 500}px`,
              top: `${50 + Math.random() * 200}px`,
              animationDelay: `${i * 0.5}s`,
              fontSize: '0.8rem',
            }}
          >
            🐛
          </div>
        ))}

        {/* Floating coins when revenue is growing */}
        {metrics?.revenue > 1000 && Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`coin-${i}`}
            className="floating-icon"
            style={{
              right: `${60 + i * 30}px`,
              top: `${100 + i * 40}px`,
              animationDelay: `${i * 0.7}s`,
              fontSize: '0.7rem',
            }}
          >
            💰
          </div>
        ))}

        {/* Critical overlay */}
        {hasCrash && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(239, 83, 80, 0.1)', pointerEvents: 'none',
            animation: 'pulse 0.5s infinite',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              fontSize: '2rem', animation: 'shake 0.3s infinite',
            }}>
              💀 CRASH 💀
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
