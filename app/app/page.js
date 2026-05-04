'use client';

import { SocketProvider } from '../hooks/useSocket';
import GameManager from '../components/GameManager';

export default function Home() {
  return (
    <SocketProvider>
      <GameManager />
    </SocketProvider>
  );
}
