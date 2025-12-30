
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
  const [message, setMessage] = useState('곧 시작합니다...');
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const isHost = user.uid === room.hostId;

  useEffect(() => {
    if (room.game.status === 'playing') {
      startRoundSequence();
    }
  }, [room.game.currentRound, room.game.status]);

  const startRoundSequence = () => {
    setPhase(GamePhase.WAITING_FOR_GREEN);
    setMessage('기다려요... ✋');
    setLastTime(null);

    const delay = 1500 + Math.random() * 4000;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setPhase(GamePhase.CLICK_NOW);
      setMessage('지금이야!!!! 🔥');
      setStartTime(Date.now());
    }, delay);
  };

  const handleClick = async () => {
    if (phase === GamePhase.WAITING_FOR_GREEN) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage('너무 빨랐어! 🤦 1초 패널티!');
      setShake(true);
      setTimeout(() => setShake(false), 300);
      submitScore(1000);
      setPhase(GamePhase.FINISHED);
    } else if (phase === GamePhase.CLICK_NOW) {
      const reaction = Date.now() - startTime;
      setLastTime(reaction);
      setMessage(`${reaction}ms! 엄청나! ✨`);
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

  if (room.game.status === 'results') {
    const sortedPlayers = (Object.values(room.players) as Player[]).sort((a, b) => a.score - b.score);

    return (
      <div className="max-w-2xl mx-auto pt-10 px-4 pb-20">
        <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden text-center p-12 border border-white/20">
          <h1 className="text-5xl font-jua text-yellow-400 mb-4 animate-bounce">명예의 전당 🏆</h1>
          <p className="text-blue-200 mb-10 font-bold">이번 판의 순위표야!</p>
          
          <div className="space-y-4 mb-12">
            {sortedPlayers.map((p, idx) => (
              <div key={p.uid} className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${idx === 0 ? 'bg-yellow-400/20 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-jua text-2xl ${idx === 0 ? 'bg-yellow-400 text-indigo-900' : 'bg-indigo-500 text-white'}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  <img src={p.photoURL} className="w-12 h-12 rounded-xl shadow-md" alt={p.name} />
                  <span className={`font-black text-xl ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>{p.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-jua text-2xl text-white">{p.score}ms</div>
                  <div className="text-[10px] uppercase font-black text-blue-400">Total Speed</div>
                </div>
              </div>
            ))}
          </div>

          {isHost ? (
            <button 
              onClick={resetGame}
              className="w-full py-6 bg-yellow-400 hover:bg-yellow-500 text-indigo-900 font-jua text-3xl rounded-[2rem] shadow-xl clay-button border-b-8 border-yellow-700 active:scale-95"
            >
              다시 한 판 더! 🤜
            </button>
          ) : (
            <p className="text-gray-400 font-black animate-pulse">방장이 다시 시작하기를 기다리는 중...</p>
          )}
        </div>
      </div>
    );
  }

  const bgColor = phase === GamePhase.CLICK_NOW ? 'bg-green-500 shadow-[0_0_80px_rgba(34,197,94,0.4)]' : phase === GamePhase.WAITING_FOR_GREEN ? 'bg-red-500' : 'bg-indigo-600';

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
      <div className="flex items-center justify-between p-8 bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="font-jua text-yellow-400 text-3xl">ROUND {room.game.currentRound}/{room.game.totalRounds}</div>
        <div className="flex -space-x-4">
          {(Object.values(room.players) as Player[]).map(p => (
            <img key={p.uid} src={p.photoURL} className="w-12 h-12 rounded-2xl border-4 border-[#1a1a2e] shadow-xl" title={p.name} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <button 
          onClick={handleClick}
          disabled={phase === GamePhase.FINISHED}
          className={`w-full max-w-lg h-[28rem] rounded-[4rem] shadow-2xl flex flex-col items-center justify-center text-white transition-all active:scale-[0.97] border-b-[16px] ${bgColor} ${phase === GamePhase.FINISHED ? 'opacity-80 border-black/20' : 'cursor-pointer border-black/30'}`}
        >
          <span className="text-5xl md:text-7xl font-jua mb-8 text-center px-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            {message}
          </span>
          {lastTime && (
            <div className="animate-pop">
              <span className="text-3xl font-black bg-black/30 px-8 py-3 rounded-full backdrop-blur-sm border border-white/20">
                 {lastTime}ms !
              </span>
            </div>
          )}
        </button>

        <div className="mt-12 w-full max-w-lg">
          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
            <h3 className="font-jua text-blue-300 mb-6 text-center tracking-widest uppercase">실시간 상황 중계 📡</h3>
            <div className="space-y-4">
              {(Object.values(room.players) as Player[]).map(p => (
                <div key={p.uid} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <img src={p.photoURL} className="w-8 h-8 rounded-lg" />
                    <span className="font-bold text-white text-sm">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.lastReactionTime ? (
                      <span className={`text-sm font-black px-4 py-1 rounded-full ${p.lastReactionTime > 800 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {p.lastReactionTime}ms
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 italic animate-pulse">대기 중...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {phase === GamePhase.FINISHED && isHost && (
            <button 
              onClick={handleNextRound}
              className="w-full mt-10 py-6 bg-yellow-400 hover:bg-yellow-500 text-indigo-900 font-jua text-3xl rounded-[2.5rem] shadow-2xl animate-bounce-subtle border-b-8 border-yellow-700"
            >
              {room.game.currentRound >= room.game.totalRounds ? '결과 확인하기 🏆' : '다음 라운드 Go! ▶️'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gameplay;
