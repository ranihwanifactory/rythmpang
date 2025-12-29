
import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, update, remove, onDisconnect } from 'firebase/database';
import { db, auth } from '../firebase';
import { Room, Player } from '../types';
import { getAntarcticFact, generateQuiz } from '../services/geminiService';

interface GameProps {
  roomId: string;
  onExit: () => void;
}

export const Game: React.FC<GameProps> = ({ roomId, onExit }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [aiMessage, setAiMessage] = useState("Hi! I'm Pingo! Let's explore Antarctica! 🐧");
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const user = auth.currentUser;
  const roomRef = ref(db, `rooms/${roomId}`);

  useEffect(() => {
    if (!user) return;

    // Presence Logic
    const playerRef = ref(db, `rooms/${roomId}/players/${user.uid}`);
    const playerData: Player = {
      uid: user.uid,
      displayName: user.displayName || 'Explorer',
      email: user.email || '',
      photoURL: user.photoURL || '',
      score: 0,
      position: 0,
      isReady: true,
    };
    
    // Join logic
    update(ref(db, `rooms/${roomId}/players`), { [user.uid]: playerData });

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onExit(); // Room deleted (host left)
        return;
      }
      setRoom({ ...data, id: roomId });
    });

    // Cleanup logic: If host leaves, delete room. If player leaves, remove player.
    const disconnectRef = onDisconnect(playerRef);
    disconnectRef.remove();

    return () => {
      unsubscribe();
      // Handle actual component unmount exit
      if (room?.hostId === user.uid) {
        remove(roomRef);
      } else {
        remove(playerRef);
      }
    };
  }, [roomId, user?.uid]);

  const shareLink = () => {
    const link = `${window.location.origin}/#room=${roomId}`;
    navigator.clipboard.writeText(link);
    alert("Camp link copied! Send it to your friends! 🎿");
  };

  const handleMove = async () => {
    if (!room || !user || isQuizOpen || loading) return;
    
    setLoading(true);
    const newPos = (room.players[user.uid]?.position || 0) + 1;
    
    // AI Interaction
    const fact = await getAntarcticFact(`Moved to position ${newPos}`);
    setAiMessage(fact);

    // Randomly trigger quiz
    if (Math.random() > 0.6) {
      const quiz = await generateQuiz();
      setCurrentQuiz(quiz);
      setIsQuizOpen(true);
    } else {
      await update(ref(db, `rooms/${roomId}/players/${user.uid}`), {
        position: newPos,
        score: (room.players[user.uid]?.score || 0) + 10
      });
    }
    setLoading(false);
  };

  const handleQuizAnswer = async (ans: string) => {
    if (!user || !room || !currentQuiz) return;

    const isCorrect = ans === currentQuiz.correctAnswer;
    const bonus = isCorrect ? 50 : -10;
    
    setAiMessage(isCorrect ? "Brilliant! You're a true expert! 🌟" : "Ouch, cold water! Try again next time! 🧊");
    
    const currentScore = room.players[user.uid]?.score || 0;
    const currentPos = room.players[user.uid]?.position || 0;

    await update(ref(db, `rooms/${roomId}/players/${user.uid}`), {
      score: Math.max(0, currentScore + bonus),
      position: isCorrect ? currentPos + 2 : currentPos
    });

    setIsQuizOpen(false);
    setCurrentQuiz(null);
  };

  if (!room) return <div className="p-20 text-center text-blue-400">Loading Expedition... 🌨️</div>;

  // Fixed: cast to Player[] to avoid Property '...' does not exist on type 'unknown'
  const players = Object.values(room.players || {}) as Player[];
  const isHost = room.hostId === user?.uid;

  return (
    <div className="min-h-screen bg-blue-50 p-4 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">{room.name}</h2>
          <p className="text-sm text-blue-400">Leader: {room.hostName}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={shareLink} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">
            🔗 Share Link
          </button>
          <button onClick={onExit} className="bg-red-50 hover:bg-red-100 text-red-500 px-4 py-2 rounded-xl text-sm font-bold border border-red-100">
            {isHost ? "Close Expedition" : "Leave Group"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Expedition Map (Left/Center) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-xl border-4 border-blue-100 relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="grid grid-cols-10 grid-rows-10 gap-2 p-4">
              {[...Array(100)].map((_, i) => <div key={i} className="text-2xl">❄️</div>)}
            </div>
          </div>

          <div className="relative z-10 w-full max-w-2xl h-64 border-b-8 border-blue-100 flex items-end justify-around pb-2 px-10 bg-blue-50/50 rounded-b-3xl">
             {/* Simple visualization of positions */}
             {players.map((p, idx) => (
               <div 
                key={p.uid} 
                className="transition-all duration-1000 flex flex-col items-center" 
                style={{ 
                  transform: `translateX(${p.position * 10}px)`,
                  marginBottom: `${idx * 15}px` 
                }}
               >
                 <div className="text-xs font-bold text-blue-600 mb-1">{p.displayName}</div>
                 <div className="text-4xl floating">🐧</div>
                 <div className="text-[10px] bg-white px-2 rounded-full border border-blue-100">{p.score} pts</div>
               </div>
             ))}
          </div>

          <div className="mt-12 text-center">
             <button 
              disabled={loading || isQuizOpen}
              onClick={handleMove}
              className={`text-2xl font-black px-12 py-6 rounded-full shadow-2xl transform active:scale-90 transition-all ${
                loading ? 'bg-gray-200 text-gray-400' : 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse'
              }`}
             >
               {loading ? "Exploring..." : "Waddle Forward! 🐾"}
             </button>
          </div>
        </div>

        {/* Sidebar: AI Penguin & Leaderboard */}
        <div className="space-y-6">
          {/* AI Penguin */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-200 relative">
            <div className="absolute -top-10 -left-2 text-7xl floating">🐧</div>
            <div className="pt-8">
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 relative mb-4">
                <div className="absolute -top-2 left-10 w-4 h-4 bg-blue-50 rotate-45 border-t-2 border-l-2 border-blue-100"></div>
                <p className="text-blue-800 font-medium italic">"{aiMessage}"</p>
              </div>
              <p className="text-[10px] uppercase font-bold text-blue-300 tracking-widest text-right">— Pingo the Guide</p>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-100">
            <h3 className="text-xl font-bold text-blue-900 mb-4 border-b pb-2">Expedition Ranks 🏆</h3>
            <div className="space-y-3">
              {players.sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.uid} className="flex items-center justify-between p-3 bg-blue-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-white' : 'bg-blue-100 text-blue-600'}`}>
                      {i + 1}
                    </span>
                    <span className="font-bold text-blue-800 text-sm">{p.displayName}</span>
                  </div>
                  <span className="font-black text-blue-600">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Overlay */}
      {isQuizOpen && currentQuiz && (
        <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl border-[10px] border-blue-200 text-center animate-bounce-in">
            <div className="text-6xl mb-6">💡</div>
            <h3 className="text-2xl font-black text-blue-900 mb-6">{currentQuiz.question}</h3>
            <div className="grid grid-cols-1 gap-4">
              {currentQuiz.options.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleQuizAnswer(opt)}
                  className="bg-blue-50 hover:bg-blue-500 hover:text-white p-5 rounded-2xl font-bold text-blue-800 border-2 border-blue-100 transition-all text-lg"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
