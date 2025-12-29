
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import LoginView from './views/LoginView';
import LobbyView from './views/LobbyView';
import WaitingRoomView from './views/WaitingRoomView';
import GameView from './views/GameView';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [view, setView] = useState<'lobby' | 'waiting' | 'game'>('lobby');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Check URL hash for direct room access
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setCurrentRoomId(hash);
      setView('waiting');
    }

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f1a]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen">
      {view === 'lobby' && (
        <LobbyView 
          user={user} 
          onEnterRoom={(id) => {
            setCurrentRoomId(id);
            setView('waiting');
            window.location.hash = id;
          }} 
        />
      )}
      {view === 'waiting' && currentRoomId && (
        <WaitingRoomView 
          user={user} 
          roomId={currentRoomId} 
          onLeave={() => {
            setCurrentRoomId(null);
            setView('lobby');
            window.location.hash = '';
          }}
          onStartGame={() => setView('game')}
        />
      )}
      {view === 'game' && currentRoomId && (
        <GameView 
          user={user} 
          roomId={currentRoomId} 
          onEndGame={() => {
            setView('waiting');
          }}
        />
      )}
    </div>
  );
};

export default App;
