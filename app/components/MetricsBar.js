'use client';

import { useRef, useEffect } from 'react';
import { METRICS_CONFIG, WORLD_STAGES } from '../lib/gameConfig';
import { useGameStore } from '../hooks/useGameState';

export default function MetricsBar() {
  const metrics = useGameStore((s) => s.metrics);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const stage = useGameStore((s) => s.stage);
  const milestone = useGameStore((s) => s.milestone);
  const winCondition = useGameStore((s) => s.winCondition);
  const lastBurn = useGameStore((s) => s.lastBurn);
  const lastIncome = useGameStore((s) => s.lastIncome);
  const lastOrganicGrowth = useGameStore((s) => s.lastOrganicGrowth);
  const arpu = useGameStore((s) => s.arpu);

  const prevMetrics = useRef(metrics);
  const changingMetrics = useRef({});

  useEffect(() => {
    if (!metrics) return;
    if (!prevMetrics.current) { prevMetrics.current = metrics; return; }
    const changed = {};
    for (const key in metrics) {
      if (metrics[key] !== prevMetrics.current[key]) changed[key] = true;
    }
    changingMetrics.current = changed;
    prevMetrics.current = metrics;
    const t = setTimeout(() => { changingMetrics.current = {}; }, 300);
    return () => clearTimeout(t);
  }, [metrics]);

  if (!metrics) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getMetricStatus = (key, value) => {
    const config = METRICS_CONFIG[key];
    if (key === 'errors') {
      if (value > 70) return 'danger';
      if (value > 40) return 'warning';
    }
    if (key === 'latency') {
      if (value > 1000) return 'danger';
      if (value > 300) return 'warning';
    }
    if (key === 'happiness') {
      if (value < 20) return 'danger';
      if (value < 40) return 'warning';
    }
    return '';
  };

  const getBarPercent = (key, value) => {
    const config = METRICS_CONFIG[key];
    return Math.min(100, Math.max(0, ((value - config.min) / (config.max - config.min)) * 100));
  };

  const getBarColor = (key, value) => {
    const status = getMetricStatus(key, value);
    if (status === 'danger') return 'var(--accent-red)';
    if (status === 'warning') return 'var(--accent-orange)';
    return METRICS_CONFIG[key].color;
  };

  const formatValue = (key, value) => {
    const config = METRICS_CONFIG[key];
    if (config.unit === 'ms') return `${Math.round(value)}ms`;
    if (config.unit === '$') return `$${Math.round(value).toLocaleString()}`;
    if (config.unit === '%') return `${Math.round(value)}%`;
    return Math.round(value).toLocaleString();
  };

  const stageName = WORLD_STAGES[stage]?.name || 'Starting';

  // Win-target progress
  let winPct = 0;
  let winLabel = null;
  if (winCondition && metrics) {
    const cur = metrics[winCondition.metric] || 0;
    winPct = Math.min(100, (cur / winCondition.value) * 100);
    const prefix = winCondition.metric === 'revenue' ? '$' : '';
    const cleanCur = winCondition.metric === 'revenue' ? Math.round(cur) : Math.round(cur);
    winLabel = `🎯 ${winCondition.label} (${prefix}${cleanCur.toLocaleString()} / ${prefix}${winCondition.value.toLocaleString()})`;
  }

  return (
    <div className="metrics-bar">
      <div className="metrics-group">
        {Object.entries(METRICS_CONFIG).map(([key, config]) => {
          const value = metrics[key] ?? config.start;
          const status = getMetricStatus(key, value);
          const isChanging = changingMetrics.current[key];
          return (
            <div key={key} className={`metric-item ${status ? `metric-${status}` : ''}`}>
              <span className="metric-label">
                {config.emoji} {config.name}
                {key === 'revenue' && (lastBurn > 0 || lastIncome > 0) && (
                  <span className="cashflow-badge" title={`ARPU: $${arpu.toFixed(2)}/user/tick`}>
                    {lastIncome > 0 && <span className="cf-income">+${lastIncome}</span>}
                    {lastBurn > 0 && <span className="cf-burn">−${lastBurn}</span>}
                  </span>
                )}
                {key === 'users' && lastOrganicGrowth > 0 && (
                  <span className="cashflow-badge" title="Passive user growth this tick (driven by happiness, low errors, foundation buffs)">
                    <span className="cf-income">+{lastOrganicGrowth}/T</span>
                  </span>
                )}
              </span>
              <span className={`metric-value ${isChanging ? 'changing' : ''}`} style={{ color: config.color }}>
                {formatValue(key, value)}
              </span>
              <div className="metric-bar">
                <div
                  className="metric-bar-fill"
                  style={{ width: `${getBarPercent(key, value)}%`, background: getBarColor(key, value) }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="hud-right">
        {milestone && !milestone.completed && (
          <span className="milestone-pill">🏁 {milestone.description}</span>
        )}
        {winLabel && (
          <div className="win-target">
            <div className="win-target-text">{winLabel}</div>
            <div className="win-target-bar"><div className="win-target-fill" style={{ width: `${winPct}%` }} /></div>
          </div>
        )}
        <span className="stage-badge">🏢 {stageName}</span>
        <div className={`timer-display ${timeRemaining < 60 ? 'urgent' : ''}`}>
          ⏱ {formatTime(timeRemaining)}
        </div>
      </div>
    </div>
  );
}
