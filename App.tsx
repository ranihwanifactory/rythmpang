
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
          <p className="text-blue-500 font-bold text-xl animate-pulse">남극 기지 연결 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen snow-bg">
      <nav className="p-4 bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">❄️</span>
          <h1 className="text-xl font-black text-blue-900 hidden sm:block">남극 탐험대</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-blue-400 font-bold uppercase">내 정보</p>
            <p className="text-sm font-bold text-blue-900">{user.displayName || '탐험 대원'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-200 overflow-hidden flex items-center justify-center">
            {user.photoURL ? (
              <img src={user.photoURL} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">👤</span>
            )}
          </div>
          <button 
            onClick={() => auth.signOut()} 
            className="text-xs font-bold text-red-400 hover:text-red-600 border border-red-100 px-3 py-1 rounded-full bg-white transition-all shadow-sm"
          >
            로그아웃
          </button>
        </div>
      </nav>

      <main className="container mx-auto py-8">
        {currentRoomId ? (
          <Game roomId={currentRoomId} onExit={handleExitRoom} />
        ) : (
          <Lobby onJoinRoom={handleJoinRoom} />
        )}
      </main>

      <footer className="p-8 text-center text-blue-300 text-sm font-medium">
        <p>© 2024 어린이 남극 탐험대 • 신나게 배우고 즐겨요!</p>
      </footer>
    </div>
  );
};

export default App;
