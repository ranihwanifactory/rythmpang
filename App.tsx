
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { Auth } from './components/Auth';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  useEffect(() => {
    // Check for room ID in hash
    const hash = window.location.hash;
    const roomParam = hash.split('room=')[1];
    if (roomParam) {
      setCurrentRoomId(roomParam);
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleJoinRoom = (id: string) => {
    setCurrentRoomId(id);
    window.location.hash = `room=${id}`;
  };

  const handleExitRoom = () => {
    setCurrentRoomId(null);
    window.location.hash = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center snow-bg">
        <div className="text-center">
          <div className="text-6xl mb-4 floating">🧊</div>
          <p className="text-blue-500 font-bold text-xl animate-pulse">Loading Antarctic Base...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen snow-bg">
      {/* Navigation Header */}
      <nav className="p-4 bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">❄️</span>
          <h1 className="text-xl font-black text-blue-900 hidden sm:block">Explorer AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-blue-400 font-bold uppercase">Explorer Profile</p>
            <p className="text-sm font-bold text-blue-900">{user.displayName || 'Unnamed Scout'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-200 overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center h-full text-xl">👤</span>
            )}
          </div>
          <button 
            onClick={() => auth.signOut()} 
            className="text-xs font-bold text-red-400 hover:text-red-600 border border-red-100 px-3 py-1 rounded-full bg-white transition-all"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* View Switcher */}
      <main className="container mx-auto py-8">
        {currentRoomId ? (
          <Game roomId={currentRoomId} onExit={handleExitRoom} />
        ) : (
          <Lobby onJoinRoom={handleJoinRoom} />
        )}
      </main>

      {/* Fun Footer */}
      <footer className="p-8 text-center text-blue-300 text-sm font-medium">
        <p>Built with ❤️ for young explorers worldwide • Powered by Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;
