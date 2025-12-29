
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import LoginView from './views/LoginView';
import LobbyView from './views/LobbyView';
import WaitingRoomView from './views/WaitingRoomView';
import GameView from './views/GameView';
import { Snowflake } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [view, setView] = useState<'lobby' | 'waiting' | 'game'>('lobby');

  useEffect(() => {
    // Check URL hash for direct room access on initial load
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setCurrentRoomId(hash);
      setView('waiting');
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white">
        <div className="relative">
          <Snowflake className="w-16 h-16 text-blue-400 animate-spin-slow" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            🐧
          </div>
        </div>
        <h2 className="mt-6 text-xl font-game tracking-widest animate-pulse">LOADING EXPEDITION...</h2>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
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
