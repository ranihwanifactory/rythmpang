
import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { Room, GamePhase, Player } from '../types';

interface GameplayProps { user: User; room: Room; }

const Gameplay: React.FC<GameplayProps> = ({ user, room }) => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.IDLE);
  const [startTime, setStartTime] = useState<number>(0);
  const [message, setMessage] = useState('전투 준비!');
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [invert, setInvert] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const isHost = user.uid === room.hostId;

  useEffect(() => {
    if (room.game?.status === 'playing') startRoundSequence();
  }, [room.game?.currentRound, room.game?.status]);

  const startRoundSequence = () => {
    setPhase(GamePhase.WAITING_FOR_GREEN);
    setMessage('기다려... 🤫');
    setLastTime(null);
    const delay = 1500 + Math.random() * 4500;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setPhase(GamePhase.CLICK_NOW);
      setMessage('지금이야!!! 🔥');
      setStartTime(Date.now());
    }, delay);
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent default touch behaviors (scrolling, zooming)
    if (e.type === 'touchstart') e.preventDefault();
    
    if (phase === GamePhase.WAITING_FOR_GREEN) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage('너무 빨랐어! 🤦');
      setShake(true);
      setTimeout(() => setShake(false), 300);
      submitScore(1200); 
      setPhase(GamePhase.FINISHED);
    } else if (phase === GamePhase.CLICK_NOW) {
      const reaction = Date.now() - startTime;
      setLastTime(reaction);
      setInvert(true);
      setTimeout(() => setInvert(false), 150);
      setMessage(`${reaction}ms! 성공! ⚡`);
      submitScore(reaction);
      setPhase(GamePhase.FINISHED);
    }
  };

  const submitScore = async (time: number) => {
    const playerRef = ref(db, `rooms/${room.id}/players/${user.uid}`);
    const currentScore = room.players[user.uid]?.score || 0;
    await update(playerRef, { score: currentScore + time, lastReactionTime: time });
  };

  const handleNextRound = async () => {
    if (!isHost) return;
    const gameRef = ref(db, `rooms/${room.id}/game`);
    if (room.game.currentRound >= room.game.totalRounds) await update(gameRef, { status: 'results' });
    else await update(gameRef, { currentRound: room.game.currentRound + 1 });
  };

  const resetGame = async () => {
    if (!isHost) return;
    const gameRef = ref(db, `rooms/${room.id}/game`);
    const playersRef = ref(db, `rooms/${room.id}/players`);
    const updates: any = {};
    Object.keys(room.players).forEach(uid => {
      updates[`${uid}/score`] = 0;
      updates[`${uid}/lastReactionTime`] = 0;
      updates[`${uid}/isReady`] = false;
    });
    await update(playersRef, updates);
    await update(gameRef, { status: 'waiting', currentRound: 0 });
  };

  if (room.game?.status === 'results') {
    const sortedPlayers = (Object.values(room.players) as Player[]).sort((a, b) => a.score - b.score);
    return (
      <div className="min-h-screen px-4 py-8 overflow-y-auto">
        <div className="bg-indigo-900/80 backdrop-blur-xl rounded-[3rem] p-8 border-4 border-yellow-400 text-center shadow-2xl">
          <h1 className="text-5xl font-jua text-yellow-300 mb-2">시상대 🏆</h1>
          <p className="text-indigo-200 mb-8 font-bold">누가 가장 빨랐을까?</p>
          <div className="space-y-4 mb-10">
            {sortedPlayers.map((p, idx) => (
              <div key={p.uid} className={`flex items-center justify-between p-5 rounded-2xl border-2 ${idx === 0 ? 'bg-yellow-400/20 border-yellow-400' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <span className="font-jua text-xl">{idx === 0 ? '👑' : idx + 1}</span>
                  <img src={p.photoURL} className="w-10 h-10 rounded-xl" />
                  <span className="font-black text-sm">{p.name}</span>
                </div>
                <span className="font-jua text-xl text-white">{p.score}ms</span>
              </div>
            ))}
          </div>
          {isHost ? (
            <button onClick={resetGame} className="w-full py-6 bg-pink-500 text-white font-jua text-3xl rounded-[2.5rem] shadow-lg active:scale-95">다시 하기!</button>
          ) : (
            <p className="text-indigo-300 font-bold animate-pulse">방장이 다시 시작하기를 기다려요...</p>
          )}
        </div>
      </div>
    );
  }

  const bgColor = phase === GamePhase.CLICK_NOW ? 'bg-green-500' : phase === GamePhase.WAITING_FOR_GREEN ? 'bg-red-500' : 'bg-indigo-800';

  return (
    <div className={`fixed inset-0 flex flex-col transition-all duration-300 ${shake ? 'animate-shake' : ''} ${invert ? 'invert' : ''}`}>
      <div className="flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="font-jua text-yellow-400 text-2xl">라운드 {room.game?.currentRound}/{room.game?.totalRounds}</div>
        <div className="flex -space-x-3">
          {(Object.values(room.players) as Player[]).map(p => (
            <img key={p.uid} src={p.photoURL} className="w-10 h-10 rounded-xl border-2 border-indigo-900" title={p.name} />
          ))}
        </div>
      </div>

      <div 
        className={`flex-1 flex flex-col items-center justify-center p-6 game-tap-area ${bgColor} cursor-pointer`}
        onMouseDown={handleClick}
        onTouchStart={handleClick}
      >
        <span className="text-5xl md:text-7xl font-jua text-white text-center drop-shadow-lg leading-tight pointer-events-none">
          {message}
        </span>
        {lastTime && (
          <div className="mt-8 animate-pop pointer-events-none">
            <span className="text-3xl font-black bg-white/20 px-8 py-3 rounded-full border border-white/30">
               🚀 {lastTime}ms
            </span>
          </div>
        )}
      </div>

      <div className="p-6 bg-indigo-950">
        <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10">
           <h3 className="font-jua text-indigo-400 text-center mb-4 text-sm">실시간 기록</h3>
           <div className="grid grid-cols-2 gap-3">
             {(Object.values(room.players) as Player[]).map(p => (
               <div key={p.uid} className="flex items-center gap-2 bg-black/20 p-2 rounded-xl">
                 <img src={p.photoURL} className="w-6 h-6 rounded-lg" />
                 <span className="text-[10px] font-bold truncate flex-1">{p.name}</span>
                 <span className="text-[10px] font-black text-yellow-400">{p.lastReactionTime || '-'}ms</span>
               </div>
             ))}
           </div>
        </div>
        {phase === GamePhase.FINISHED && isHost && (
          <button 
            onClick={handleNextRound}
            className="w-full mt-6 py-5 bg-yellow-400 text-indigo-900 font-jua text-2xl rounded-3xl shadow-lg active:scale-95 animate-bounce-subtle"
          >
            다음 라운드 진격! ▶️
          </button>
        )}
      </div>
    </div>
  );
};

export default Gameplay;
