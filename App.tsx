
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import AuthView from './components/AuthView';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && hash.startsWith('room/')) {
      const roomId = hash.split('/')[1];
      setActiveRoomId(roomId);
    }

    return () => unsubscribe();
  }, []);

  const handleJoinRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    window.location.hash = `room/${roomId}`;
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
    window.location.hash = '';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617]">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-cyan-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-cyan-400 rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-cyan-400 font-medium tracking-widest uppercase text-xs animate-pulse">Initializing System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] selection:bg-cyan-500/30">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px]"></div>
      </div>
      
      <main className="relative z-10">
        {user ? (
          activeRoomId ? (
            <GameRoom user={user} roomId={activeRoomId} onLeave={handleLeaveRoom} />
          ) : (
            <Lobby user={user} onJoinRoom={handleJoinRoom} />
          )
        ) : (
          <AuthView />
        )}
      </main>
    </div>
  );
};

export default App;
