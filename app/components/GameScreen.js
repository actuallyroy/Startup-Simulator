'use client';

import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';
import MetricsBar from './MetricsBar';
import PixelWorld from './PixelWorld';
import EventFeed from './EventFeed';
import ActionPanel from './ActionPanel';
import { EVENT_RESPONSES, WORLD_STAGES } from '../lib/gameConfig';

export default function GameScreen() {
  const { socket } = useSocket();
  const {
    roomCode, activeEvents, actionToasts, pendingDelegation,
    setPendingDelegation, setNotification, stage, timeRemaining,
  } = useGameStore();

  // Get unresponded events for alert banners
  const alertEvents = (activeEvents || []).filter(e => !e.responded);

  const handleRespondEvent = (eventId) => {
    if (!socket) return;
    socket.emit('game:respondEvent', { roomCode, eventId }, (res) => {
      if (!res.success) {
        setNotification({ message: res.error || 'Failed to respond', type: 'error' });
      }
    });
  };

  const handleDelegationResponse = (delegationId, accepted) => {
    if (!socket) return;
    socket.emit('game:delegationResponse', { roomCode, delegationId, accepted }, () => {});
    setPendingDelegation(null);
  };

  const stageName = WORLD_STAGES[stage]?.name || 'Garage Startup';

  return (
    <div className="game-screen">
      <MetricsBar />

      <div className="game-content">
        {/* Main game area */}
        <div className="game-main">
          {/* Pixel World */}
          <PixelWorld />

          {/* Event Alert Banners */}
          <div className="event-alerts">
            {alertEvents.slice(0, 2).map((event) => {
              const response = EVENT_RESPONSES[event.id];
              return (
                <div key={`${event.id}-${event.startTick}`}
                  className={`event-alert severity-${event.severity}`}>
                  <div className="event-alert-content">
                    <div className="event-alert-title">{event.name}</div>
                    <div className="event-alert-desc">{event.description}</div>
                  </div>
                  <div className="event-alert-actions">
                    {response ? (
                      <button className="event-respond-btn"
                        onClick={() => handleRespondEvent(event.id)}>
                        {response.label}
                      </button>
                    ) : (
                      <span className="event-unavoidable">⚠ Unavoidable — ride it out</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Toasts */}
          <div className="action-toasts">
            {actionToasts.map((toast) => (
              <div key={toast.id} className={`action-toast toast-${toast.type}`}>
                {toast.message}
              </div>
            ))}
          </div>

          {/* Delegation Popup */}
          {pendingDelegation && (
            <div className="delegation-popup">
              <div className="delegation-popup-content">
                <div className="delegation-popup-title">🤝 Task Delegation</div>
                <div className="delegation-popup-text">
                  <strong>{pendingDelegation.fromName}</strong> wants you to:
                </div>
                <div className="delegation-action">
                  {pendingDelegation.actionEmoji} {pendingDelegation.actionName}
                </div>
                <div className="delegation-popup-buttons">
                  <button className="delegation-accept"
                    onClick={() => handleDelegationResponse(pendingDelegation.delegationId, true)}>
                    ✅ Accept
                  </button>
                  <button className="delegation-decline"
                    onClick={() => handleDelegationResponse(pendingDelegation.delegationId, false)}>
                    ❌ Decline
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <EventFeed />
      </div>

      <ActionPanel />
    </div>
  );
}
