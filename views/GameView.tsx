
import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '../firebase';
import { RoomData, GameNote, PlayerState } from '../types';
import { Music, Zap, Flame, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameViewProps {
  user: User;
  roomId: string;
  onEndGame: () => void;
}

const GameView: React.FC<GameViewProps> = ({ user, roomId, onEndGame }) => {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [activeNotes, setActiveNotes] = useState<GameNote[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number>();
  const laneKeys = ['d', 'f', 'j', 'k'];
  const noteSpeed = 0.5; // pixel per ms
  const laneHeight = 600;

  useEffect(() => {
    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onEndGame();
        return;
      }
      setRoom(data);
    });

    // Start delay
    const timer = setTimeout(() => {
      setStartTime(Date.now());
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [roomId]);

  // Main game loop
  useEffect(() => {
    if (!startTime || !room?.config || isFinished) return;

    const loop = () => {
      const elapsed = Date.now() - startTime;
      const config = room.config!;
      
      // Calculate notes to display
      // A note should appear on screen if its (timestamp - travel_time) <= elapsed
      const travelTime = laneHeight / noteSpeed;
      
      const onScreen = config.pattern.filter(note => {
        const appearAt = note.timestamp - travelTime;
        const leaveAt = note.timestamp + 100; // Extra buffer
        return elapsed >= appearAt && elapsed <= leaveAt;
      });

      setActiveNotes(onScreen);

      // End condition
      const lastNote = config.pattern[config.pattern.length - 1];
      if (elapsed > lastNote.timestamp + 2000) {
        handleGameEnd();
      } else {
        requestRef.current = requestAnimationFrame(loop);
      }
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [startTime, room?.config, isFinished]);

  const handleGameEnd = async () => {
    setIsFinished(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });

    const playerRef = ref(database, `rooms/${roomId}/players/${user.uid}`);
    await update(playerRef, { status: 'finished' });

    // Sync score one last time
    await update(playerRef, { score });
  };

  const handleHit = (lane: number) => {
    if (!startTime || isFinished) return;
    const elapsed = Date.now() - startTime;
    
    // Find closest note in this lane
    const targetNote = activeNotes.find(n => n.lane === lane && Math.abs(elapsed - n.timestamp) < 150);

    if (targetNote) {
      const diff = Math.abs(elapsed - targetNote.timestamp);
      let hitScore = 0;
      let hitText = "";
      let hitColor = "";

      if (diff < 40) {
        hitScore = 100;
        hitText = "PERFECT";
        hitColor = "text-yellow-400";
      } else if (diff < 80) {
        hitScore = 70;
        hitText = "GREAT";
        hitColor = "text-cyan-400";
      } else {
        hitScore = 40;
        hitText = "GOOD";
        hitColor = "text-emerald-400";
      }

      setScore(prev => prev + hitScore);
      setCombo(prev => prev + 1);
      setMaxCombo(prev => Math.max(prev, combo + 1));
      setFeedback({ text: hitText, color: hitColor });

      // Visual feedback: remove note from display (local only for efficiency)
      setActiveNotes(prev => prev.filter(n => n.id !== targetNote.id));

      // Play sound
      playHitSound(lane);
    } else {
      // Miss
      setCombo(0);
      setFeedback({ text: "MISS", color: "text-red-500" });
    }

    // Debounced score update to DB
    updatePlayerScore(score);
  };

  const updatePlayerScore = (s: number) => {
    const playerRef = ref(database, `rooms/${roomId}/players/${user.uid}`);
    update(playerRef, { score: s });
  };

  const playHitSound = (lane: number) => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    
    const freqs = [261.63, 329.63, 392.00, 523.25];
    osc.frequency.setValueAtTime(freqs[lane], audioContextRef.current.currentTime);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);
    
    osc.start();
    osc.stop(audioContextRef.current.currentTime + 0.1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const idx = laneKeys.indexOf(e.key.toLowerCase());
      if (idx !== -1) handleHit(idx);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNotes, startTime, isFinished, combo]);

  // Fix: Explicitly cast result of Object.values to PlayerState[] for proper property access (score, uid, status, name)
  const players = room ? (Object.values(room.players) as PlayerState[]).sort((a, b) => b.score - a.score) : [];

  return (
    <div className="relative h-screen bg-[#0f0f1a] overflow-hidden flex flex-col md:flex-row">
      
      {/* HUD - Players & Rankings */}
      <div className="w-full md:w-64 bg-glass border-r border-white/5 p-6 flex flex-col gap-6 z-20 order-2 md:order-1">
        <h3 className="font-game text-xl text-pink-400 flex items-center gap-2">
          <Trophy size={20} /> RANKING
        </h3>
        <div className="space-y-4 flex-1">
          {players.map((p, idx) => (
            <div 
              key={p.uid} 
              className={`p-4 rounded-2xl transition-all border ${p.uid === user.uid ? 'bg-pink-500/20 border-pink-500/50 scale-105' : 'bg-white/5 border-white/10'}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                <span className="text-[10px] bg-white/10 px-2 rounded-full text-white">{p.status.toUpperCase()}</span>
              </div>
              <div className="font-game text-sm truncate">{p.name}</div>
              <div className="text-xl font-game text-white">{p.score.toLocaleString()}</div>
            </div>
          ))}
        </div>
        
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <Zap size={16} fill="currentColor" />
            <span className="text-xs font-bold uppercase">Game Info</span>
          </div>
          <p className="text-sm font-bold truncate">{room?.config?.songTitle || "Loading..."}</p>
          <p className="text-xs text-gray-500">BPM: {room?.config?.bpm}</p>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 relative flex items-center justify-center order-1 md:order-2">
        
        {/* Combo Overlay */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
          {combo > 0 && (
            <div className="animate-bounce">
              <div className="text-7xl font-game text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{combo}</div>
              <div className="text-2xl font-game text-cyan-400 tracking-widest">COMBO</div>
            </div>
          )}
          {feedback && (
            <div className={`mt-4 text-4xl font-game ${feedback.color} animate-ping`}>
              {feedback.text}
            </div>
          )}
        </div>

        {/* Lanes */}
        <div className="flex gap-4 h-[600px] items-end pb-12">
          {[0, 1, 2, 3].map(lane => (
            <div key={lane} className="relative w-20 h-full">
              {/* Lane Background */}
              <div className="absolute inset-0 bg-white/5 rounded-2xl border-x border-white/10"></div>
              
              {/* Note Track */}
              <div className="absolute inset-0 overflow-hidden">
                {activeNotes.filter(n => n.lane === lane).map(note => {
                   const elapsed = startTime ? Date.now() - startTime : 0;
                   const distance = (note.timestamp - elapsed) * noteSpeed;
                   return (
                     <div 
                      key={note.id}
                      className="absolute left-1/2 -translate-x-1/2 w-16 h-8 bg-gradient-to-r from-pink-400 to-rose-600 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                      style={{ bottom: `${distance + 40}px` }}
                     ></div>
                   );
                })}
              </div>

              {/* Hit Zone */}
              <button 
                onMouseDown={() => handleHit(lane)}
                className="absolute bottom-0 w-full h-20 bg-glass border-4 border-white/20 rounded-2xl hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center font-game text-2xl text-white/50"
              >
                {laneKeys[lane].toUpperCase()}
              </button>
            </div>
          ))}
        </div>

        {!startTime && !isFinished && (
           <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f1a]/80 z-50 backdrop-blur-sm">
             <div className="text-center">
                <div className="text-8xl font-game text-white animate-pulse mb-4">GET READY!</div>
                <div className="text-2xl font-game text-pink-400">Loading Stage...</div>
             </div>
           </div>
        )}

        {isFinished && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f1a]/90 z-50 backdrop-blur-lg">
             <div className="bg-glass p-12 rounded-[60px] border border-white/10 text-center max-w-lg w-full">
                <Flame size={64} className="mx-auto text-orange-500 mb-6 animate-pulse" />
                <h2 className="text-6xl font-game text-white mb-2">STAGE CLEAR!</h2>
                <div className="text-2xl font-game text-pink-400 mb-8">Score: {score.toLocaleString()}</div>
                
                <div className="grid grid-cols-2 gap-4 mb-12">
                  <div className="bg-white/5 p-4 rounded-3xl">
                    <div className="text-xs text-gray-500 uppercase font-bold">Max Combo</div>
                    <div className="text-3xl font-game text-cyan-400">{maxCombo}</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-3xl">
                    <div className="text-xs text-gray-500 uppercase font-bold">Rank</div>
                    <div className="text-3xl font-game text-yellow-400">{score > 4000 ? 'SSS' : score > 3000 ? 'S' : 'A'}</div>
                  </div>
                </div>

                <button 
                  onClick={onEndGame}
                  className="w-full py-6 bg-white text-black font-game text-2xl rounded-3xl hover:scale-105 active:scale-95 transition-all"
                >
                  BACK TO LOBBY
                </button>
             </div>
          </div>
        )}
      </div>
      
      {/* Mobile-only Lane Indicators */}
      <div className="md:hidden grid grid-cols-4 gap-2 p-4 bg-glass border-t border-white/10 z-30">
        {laneKeys.map((k, i) => (
           <button 
            key={k} 
            onClick={() => handleHit(i)}
            className="h-20 bg-pink-500 rounded-2xl flex items-center justify-center text-3xl font-game text-white shadow-lg active:scale-90 transition-all"
           >
             {k.toUpperCase()}
           </button>
        ))}
      </div>
    </div>
  );
};

export default GameView;
