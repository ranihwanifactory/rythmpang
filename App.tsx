
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

    // Check URL hash for direct room entry
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-pink-100">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-pink-600 font-semibold text-lg">Loading Super Fun...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-pink-50 pb-10">
      {activeRoomId ? (
        <GameRoom user={user} roomId={activeRoomId} onLeave={handleLeaveRoom} />
      ) : (
        <Lobby user={user} onJoinRoom={handleJoinRoom} />
      )}
    </div>
  );
};

export default App;
