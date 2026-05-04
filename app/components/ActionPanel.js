'use client';

import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';
import { ACTIONS, ROLES, GAME_CONFIG } from '../lib/gameConfig';

export default function ActionPanel() {
  const { socket } = useSocket();
  const { roomCode, myRole, myCooldowns, myActionsUsed, setNotification } = useGameStore();

  if (!myRole) return null;

  const role = Object.values(ROLES).find(r => r.id === myRole);
  const availableActions = role ? role.actions.map(id => ACTIONS[id]).filter(Boolean) : [];

  const handleAction = (actionId) => {
    if (!socket) return;
    socket.emit('game:action', { roomCode, actionId }, (res) => {
      if (!res.success) {
        setNotification({
          message: res.cooldownRemaining
            ? `Cooldown: ${res.cooldownRemaining}s`
            : res.error,
          type: 'error',
        });
      }
    });
  };

  return (
    <div className="action-panel">
      <span className="actions-remaining">
        {role.emoji} {role.name} • Actions: {myActionsUsed}/{GAME_CONFIG.MAX_ACTIONS_PER_ROUND}
      </span>
      {availableActions.map((action) => {
        const cd = myCooldowns[action.id] || 0;
        const disabled = cd > 0 || myActionsUsed >= GAME_CONFIG.MAX_ACTIONS_PER_ROUND;
        return (
          <button
            key={action.id}
            className="action-btn"
            onClick={() => handleAction(action.id)}
            disabled={disabled}
            title={action.description}
          >
            <span className="action-emoji">{action.emoji}</span>
            <span className="action-name">{action.name}</span>
            {cd > 0 && <div className="action-cooldown">{cd}</div>}
          </button>
        );
      })}
    </div>
  );
}
