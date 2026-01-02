
import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { Room, GamePhase, Player } from '../types';

interface GameplayProps { user: User; room: Room; }

const Gameplay: React.FC<GameplayProps> = ({ user, room }) => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.IDLE);
  const [startTime, setStartTime] = useState<number>(0);
  const [message, setMessage] = useState('시스템 대기 중');
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const isHost = user.uid === room.hostId;

  useEffect(() => {
    if (room.game?.status === 'playing') {
      setPhase(GamePhase.WAITING_FOR_GREEN);
      setMessage('HOLD POSITION...');
      setLastTime(null);
      const delay = 2000 + Math.random() * 4000;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setPhase(GamePhase.CLICK_NOW);
        setMessage('ENGAGE NOW!');
        setStartTime(Date.now());
      }, delay);
    }
  }, [room.game?.currentRound, room.game?.status]);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'touchstart') e.preventDefault();
    if (phase === GamePhase.FINISHED) return;

    if (phase === GamePhase.WAITING_FOR_GREEN) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage('EARLY TRIGGER!');
      setShake(true);
      setTimeout(() => setShake(false), 300);
      submitScore(1500); 
      setPhase(GamePhase.FINISHED);
    } else if (phase === GamePhase.CLICK_NOW) {
      const reaction = Date.now() - startTime;
      setLastTime(reaction);
      setFlash(true);
      setTimeout(() => setFlash(false), 100);
      setMessage(`${reaction}ms`);
      submitScore(reaction);
      setPhase(GamePhase.FINISHED);
    }
  };

  const submitScore = async (time: number) => {
    const playerRef = ref(db, `rooms/${room.id}/players/${user.uid}`);
    const currentScore = room.players[user.uid]?.score || 0;
    await update(playerRef, { score: currentScore + time, lastReactionTime: time });
  };

  if (room.game?.status === 'results') {
    const sortedPlayers = (Object.values(room.players) as Player[]).sort((a, b) => a.score - b.score);
    return (
      <div className="min-h-screen px-6 py-12 flex flex-col items-center">
        <div className="glass w-full max-w-sm rounded-[3rem] p-8 border-cyan-500/30 animate-slide-up shadow-2xl">
          <header className="text-center mb-10">
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-2 block">Mission Summary</span>
            <h1 className="text-4xl font-bold text-white tracking-tighter">LEADERBOARD</h1>
          </header>
          <div className="space-y-3 mb-12">
            {sortedPlayers.map((p, idx) => (
              <div key={p.uid} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${idx === 0 ? 'bg-cyan-500/10 border-cyan-500/50 scale-105' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-6 text-center font-bold text-xs ${idx === 0 ? 'text-cyan-400' : 'text-slate-600'}`}>0{idx + 1}</span>
                  <img src={p.photoURL} className="w-8 h-8 rounded-lg" alt="" />
                  <span className="font-bold text-sm text-white truncate max-w-[100px]">{p.name}</span>
                </div>
                <span className={`font-mono text-xs font-bold ${idx === 0 ? 'text-cyan-400' : 'text-slate-400'}`}>{p.score}ms</span>
              </div>
            ))}
          </div>
          {isHost ? (
            <button 
              onClick={async () => {
                const updates: any = {};
                Object.keys(room.players).forEach(uid => { updates[`players/${uid}/score`] = 0; updates[`players/${uid}/lastReactionTime`] = 0; updates[`players/${uid}/isReady`] = false; });
                updates['game'] = { status: 'waiting', currentRound: 0, totalRounds: 5 };
                await update(ref(db, `rooms/${room.id}`), updates);
              }} 
              className="w-full py-5 bg-cyan-500 text-slate-950 font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              Restart Session
            </button>
          ) : (
            <div className="text-center py-4 text-slate-600 text-[10px] font-bold uppercase tracking-widest animate-pulse">Waiting for host...</div>
          )}
        </div>
      </div>
    );
  }

  const bgStyle = phase === GamePhase.CLICK_NOW ? 'bg-[#06b6d4]' : phase === GamePhase.WAITING_FOR_GREEN ? 'bg-[#f43f5e]' : 'bg-[#020617]';
  const textStyle = phase === GamePhase.IDLE ? 'text-slate-700' : 'text-white';

  return (
    <div className={`fixed inset-0 flex flex-col transition-all duration-300 ${shake ? 'animate-shake' : ''} ${flash ? 'brightness-150' : ''} ${bgStyle}`}>
      <header className="flex items-center justify-between px-8 py-6 bg-black/20 backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Sequence</span>
          <span className="text-lg font-bold text-white leading-none">{room.game?.currentRound} / {room.game?.totalRounds}</span>
        </div>
        <div className="flex -space-x-2">
          {Object.values(room.players).map((p: any) => (
            <div key={p.uid} className="w-8 h-8 rounded-lg border-2 border-black/20 overflow-hidden">
              <img src={p.photoURL} alt="" />
            </div>
          ))}
        </div>
      </header>

      <div 
        className="flex-1 flex flex-col items-center justify-center p-8 game-tap-area relative"
        onMouseDown={handleClick}
        onTouchStart={handleClick}
      >
        <span className={`text-4xl md:text-6xl font-bold tracking-tighter text-center leading-none ${textStyle} drop-shadow-2xl`}>
          {message}
        </span>
        {lastTime && (
          <div className="absolute bottom-20 animate-pop">
            <span className="text-xl font-mono font-bold bg-black/30 backdrop-blur px-6 py-2 rounded-full border border-white/10">
               {lastTime}ms
            </span>
          </div>
        )}
      </div>

      <footer className="p-8 bg-black/40 backdrop-blur-xl">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-2 gap-2 mb-6">
            {(Object.values(room.players) as Player[]).map(p => (
              <div key={p.uid} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <img src={p.photoURL} className="w-5 h-5 rounded" alt="" />
                <span className="text-[9px] font-bold text-slate-400 truncate flex-1">{p.name}</span>
                <span className="text-[9px] font-mono font-bold text-cyan-400">{p.lastReactionTime || 0}ms</span>
              </div>
            ))}
          </div>
          {phase === GamePhase.FINISHED && isHost && (
            <button 
              onClick={async () => {
                const gameRef = ref(db, `rooms/${room.id}/game`);
                if (room.game.currentRound >= room.game.totalRounds) await update(gameRef, { status: 'results' });
                else await update(gameRef, { currentRound: room.game.currentRound + 1 });
              }}
              className="w-full py-4 bg-white text-slate-950 font-bold rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-[0.2em]"
            >
              Next Sequence ▶
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Gameplay;
