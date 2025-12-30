
import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { Room, GamePhase, Player } from '../types';

interface GameplayProps {
  user: User;
  room: Room;
}

const Gameplay: React.FC<GameplayProps> = ({ user, room }) => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.IDLE);
  const [startTime, setStartTime] = useState<number>(0);
  const [message, setMessage] = useState('전투를 준비하세요!');
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [invert, setInvert] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const isHost = user.uid === room.hostId;

  useEffect(() => {
    if (room.game?.status === 'playing') {
      startRoundSequence();
    }
  }, [room.game?.currentRound, room.game?.status]);

  const startRoundSequence = () => {
    setPhase(GamePhase.WAITING_FOR_GREEN);
    setMessage('집중해! 아직 아니야... 🤫');
    setLastTime(null);

    const delay = 1500 + Math.random() * 4500;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setPhase(GamePhase.CLICK_NOW);
      setMessage('지금이야!!! 눌러!!!! 🔥');
      setStartTime(Date.now());
    }, delay);
  };

  const handleClick = async () => {
    if (phase === GamePhase.WAITING_FOR_GREEN) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage('아이쿠! 너무 빨랐어! 🤦');
      setShake(true);
      setTimeout(() => setShake(false), 300);
      submitScore(1200); // Penalty
      setPhase(GamePhase.FINISHED);
    } else if (phase === GamePhase.CLICK_NOW) {
      const reaction = Date.now() - startTime;
      setLastTime(reaction);
      setInvert(true);
      setTimeout(() => setInvert(false), 150);
      setMessage(`${reaction}ms! 대단해! ⚡`);
      submitScore(reaction);
      setPhase(GamePhase.FINISHED);
    }
  };

  const submitScore = async (time: number) => {
    const playerRef = ref(db, `rooms/${room.id}/players/${user.uid}`);
    const currentScore = room.players[user.uid]?.score || 0;
    await update(playerRef, { 
      score: currentScore + time,
      lastReactionTime: time 
    });
  };

  const handleNextRound = async () => {
    if (!isHost) return;
    const gameRef = ref(db, `rooms/${room.id}/game`);
    if (room.game.currentRound >= room.game.totalRounds) {
      await update(gameRef, { status: 'results' });
    } else {
      await update(gameRef, { currentRound: room.game.currentRound + 1 });
    }
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
      <div className="max-w-2xl mx-auto pt-10 px-4 pb-20">
        <div className="bg-gradient-to-b from-indigo-900/80 to-purple-900/80 backdrop-blur-3xl rounded-[4rem] shadow-2xl overflow-hidden text-center p-14 border-4 border-yellow-400">
          <h1 className="text-6xl font-jua text-yellow-300 mb-4 animate-bounce drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">시상대 🏆</h1>
          <p className="text-indigo-200 mb-12 font-bold text-xl italic">누가 가장 빛나는 승자인가!</p>
          
          <div className="space-y-6 mb-16">
            {sortedPlayers.map((p, idx) => (
              <div key={p.uid} className={`flex items-center justify-between p-8 rounded-[3rem] border-4 transition-all duration-500 animate-pop ${idx === 0 ? 'bg-gradient-to-r from-yellow-300 to-orange-400 border-yellow-200 shadow-[0_0_50px_rgba(250,204,21,0.4)] scale-105' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-jua text-3xl shadow-lg ${idx === 0 ? 'bg-indigo-900 text-yellow-300' : 'bg-indigo-600 text-white'}`}>
                    {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  <img src={p.photoURL} className="w-16 h-16 rounded-2xl shadow-xl ring-4 ring-white/20" alt={p.name} />
                  <span className={`font-black text-2xl ${idx === 0 ? 'text-indigo-900' : 'text-white'}`}>{p.name}</span>
                </div>
                <div className="text-right">
                  <div className={`font-jua text-3xl ${idx === 0 ? 'text-indigo-900' : 'text-white'}`}>{p.score}ms</div>
                  <div className={`text-[10px] uppercase font-black ${idx === 0 ? 'text-indigo-800' : 'text-indigo-400'}`}>전체 기록</div>
                </div>
              </div>
            ))}
          </div>

          {isHost ? (
            <button 
              onClick={resetGame}
              className="w-full py-8 bg-gradient-to-r from-pink-500 to-red-500 text-white font-jua text-4xl rounded-[3rem] shadow-[0_10px_0_rgb(150,30,50)] active:translate-y-2 active:shadow-none transition-all"
            >
              한판 더 가자! 🤜
            </button>
          ) : (
            <div className="p-6 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/20">
               <p className="text-indigo-300 font-black animate-pulse text-xl">방장님, 어서 다음 판을 시작해주세요! 🙏</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const bgColor = phase === GamePhase.CLICK_NOW ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-[0_0_100px_rgba(34,197,94,0.6)]' : phase === GamePhase.WAITING_FOR_GREEN ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-indigo-800';

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${shake ? 'animate-shake' : ''} ${invert ? 'invert' : ''}`}>
      <div className="flex items-center justify-between p-10 bg-black/30 backdrop-blur-xl border-b-4 border-white/10">
        <div className="font-jua text-yellow-400 text-4xl drop-shadow-md">진행 {room.game?.currentRound}/{room.game?.totalRounds}</div>
        <div className="flex -space-x-5">
          {(Object.values(room.players) as Player[]).map(p => (
            <img key={p.uid} src={p.photoURL} className="w-14 h-14 rounded-[1.5rem] border-4 border-indigo-900 shadow-2xl" title={p.name} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <button 
          onClick={handleClick}
          disabled={phase === GamePhase.FINISHED}
          className={`w-full max-w-xl h-[32rem] rounded-[5rem] shadow-2xl flex flex-col items-center justify-center text-white transition-all active:scale-[0.95] border-b-[20px] ${bgColor} ${phase === GamePhase.FINISHED ? 'opacity-80 border-black/30' : 'cursor-pointer border-black/40'}`}
        >
          <span className="text-6xl md:text-8xl font-jua mb-10 text-center px-10 drop-shadow-[0_6px_6px_rgba(0,0,0,0.4)] leading-tight">
            {message}
          </span>
          {lastTime && (
            <div className="animate-pop">
              <span className="text-4xl font-black bg-white/20 px-10 py-4 rounded-full backdrop-blur-md border-2 border-white/30 shadow-lg">
                 🚀 {lastTime}ms
              </span>
            </div>
          )}
        </button>

        <div className="mt-16 w-full max-w-xl">
          <div className="bg-indigo-900/40 backdrop-blur-2xl p-10 rounded-[4rem] border-2 border-white/10 shadow-3xl">
            <h3 className="font-jua text-pink-400 mb-8 text-center text-2xl tracking-widest uppercase">실시간 순위 중계소 📻</h3>
            <div className="space-y-5">
              {(Object.values(room.players) as Player[]).map(p => (
                <div key={p.uid} className="flex items-center justify-between bg-white/5 p-5 rounded-[2rem] border border-white/5 transition-all">
                  <div className="flex items-center gap-4">
                    <img src={p.photoURL} className="w-10 h-10 rounded-xl" />
                    <span className="font-black text-white text-lg">{p.name}</span>
                  </div>
                  <div className="flex items-center">
                    {p.lastReactionTime ? (
                      <span className={`text-lg font-black px-6 py-2 rounded-2xl ${p.lastReactionTime > 800 ? 'bg-red-500/30 text-red-300' : 'bg-green-500/30 text-green-300'}`}>
                        {p.lastReactionTime}ms
                      </span>
                    ) : (
                      <span className="text-sm text-white/30 font-bold italic animate-pulse">측정 대기...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {phase === GamePhase.FINISHED && isHost && (
            <button 
              onClick={handleNextRound}
              className="w-full mt-12 py-8 bg-gradient-to-r from-blue-400 to-indigo-600 text-white font-jua text-4xl rounded-[3rem] shadow-[0_10px_0_rgb(30,30,120)] active:translate-y-2 active:shadow-none animate-bounce-subtle"
            >
              {room.game.currentRound >= room.game.totalRounds ? '결과 보러 가자! ✨' : '다음 라운드 진격! ▶️'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gameplay;
