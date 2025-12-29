
import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../firebase';
import { RoomData, Obstacle, PlayerState } from '../types';
import { Flag, Shield, FastForward, Timer, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameViewProps {
  user: User;
  roomId: string;
  onEndGame: () => void;
}

const GameView: React.FC<GameViewProps> = ({ user, roomId, onEndGame }) => {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [distance, setDistance] = useState(0);
  const [lane, setLane] = useState(1);
  const [speed, setSpeed] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [isStunned, setIsStunned] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const requestRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  
  const MAX_SPEED = 15;
  const ACCELERATION = 0.05;
  const FRICTION = 0.02;

  useEffect(() => {
    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      setRoom(data);
      
      const me = data.players?.[user.uid];
      if (me?.status === 'finished' && !isFinished) {
        setIsFinished(true);
      }
    });

    const timer = setTimeout(() => {
      setStartTime(Date.now());
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [roomId]);

  // Physics Loop
  useEffect(() => {
    if (!startTime || !room?.config || isFinished || isStunned) return;

    const loop = () => {
      const now = Date.now();
      
      setSpeed(prev => {
        let next = prev + ACCELERATION;
        if (next > MAX_SPEED) next = MAX_SPEED;
        return next;
      });

      setDistance(prev => {
        const next = prev + speed;
        if (next >= room.config!.totalDistance) {
          handleFinish();
          return room.config!.totalDistance;
        }
        return next;
      });

      // Periodic DB sync
      if (now - lastUpdateRef.current > 100) {
        updatePlayerInDB();
        lastUpdateRef.current = now;
      }

      // Obstacle Collision Check
      checkCollisions();

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [startTime, room?.config, isFinished, isStunned, speed, distance, lane, isJumping]);

  const updatePlayerInDB = () => {
    const playerRef = ref(database, `rooms/${roomId}/players/${user.uid}`);
    update(playerRef, {
      distance: Math.floor(distance),
      lane: lane,
      speed: Math.floor(speed)
    });
  };

  const handleFinish = async () => {
    setIsFinished(true);
    const playerRef = ref(database, `rooms/${roomId}/players/${user.uid}`);
    await update(playerRef, { 
      status: 'finished',
      distance: room!.config!.totalDistance,
      finishTime: Date.now() - (startTime || 0)
    });
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  const checkCollisions = () => {
    if (isJumping || !room?.config) return;

    const myDist = distance;
    const hitObstacle = room.config.obstacles.find(obs => 
      obs.lane === lane && 
      Math.abs(obs.distance - myDist) < 40
    );

    if (hitObstacle) {
      if (hitObstacle.type === 'hole') {
        stunPlayer("FELL IN HOLE!", 1500);
      } else if (hitObstacle.type === 'seal') {
        stunPlayer("HIT A SEAL!", 1000);
      } else {
        setSpeed(s => s * 0.5);
        setFeedback("SNOWBALL SLOW!");
        setTimeout(() => setFeedback(null), 1000);
      }
    }
  };

  const stunPlayer = (msg: string, duration: number) => {
    setIsStunned(true);
    setSpeed(0);
    setFeedback(msg);
    setTimeout(() => {
      setIsStunned(false);
      setFeedback(null);
    }, duration);
  };

  const handleJump = () => {
    if (isJumping || isStunned || isFinished) return;
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 600);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStunned || isFinished) return;
      if (e.key === 'ArrowLeft') setLane(l => Math.max(0, l - 1));
      if (e.key === 'ArrowRight') setLane(l => Math.min(2, l + 1));
      if (e.key === ' ' || e.key === 'ArrowUp') handleJump();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStunned, isFinished, isJumping]);

  if (!room) return null;

  // FIX: Explicitly cast the result of Object.values to PlayerState[] to prevent "unknown" type errors.
  // This ensures that the map and filter operations below recognize the properties like distance, uid, and name.
  const players = (Object.values(room.players) as PlayerState[]).sort((a, b) => (b.distance || 0) - (a.distance || 0));
  const totalDist = room.config?.totalDistance || 5000;

  return (
    <div className="relative h-screen bg-gradient-to-b from-blue-300 to-white overflow-hidden flex flex-col">
      
      {/* Race Progress Bar */}
      <div className="bg-white/30 backdrop-blur-md p-4 flex items-center justify-center gap-4 border-b border-white/20 z-20">
        <div className="flex-1 max-w-2xl h-6 bg-blue-900/20 rounded-full relative overflow-hidden">
          {players.map(p => (
            <div 
              key={p.uid}
              className={`absolute top-0 h-full w-8 flex items-center justify-center transition-all duration-300 ${p.uid === user.uid ? 'z-10' : 'z-0 opacity-60'}`}
              style={{ left: `${((p.distance || 0) / totalDist) * 100}%`, marginLeft: '-16px' }}
            >
              <div className={`text-2xl ${p.uid === user.uid ? 'scale-125' : 'scale-100'}`}>🐧</div>
              {p.uid === user.uid && <div className="absolute -top-6 text-[10px] font-bold text-blue-800 bg-white px-1 rounded">YOU</div>}
            </div>
          ))}
          <div className="absolute right-0 top-0 h-full w-2 bg-red-500 flex items-center justify-center">🏁</div>
        </div>
      </div>

      {/* Game Stage (Pseudo-3D Track) */}
      <div className="flex-1 relative flex items-center justify-center perspective-[1000px]">
        
        {/* Environment - Animated background patterns for movement feel */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 opacity-20"
            style={{ 
              backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', 
              backgroundSize: '100px 100px',
              transform: `translateY(${(distance % 1000)}px)` 
            }}
          ></div>
        </div>

        {/* Feedback Messages */}
        <div className="absolute top-20 z-50 pointer-events-none">
          {feedback && (
            <div className="text-6xl font-game text-red-600 animate-bounce drop-shadow-lg">
              {feedback}
            </div>
          )}
        </div>

        {/* The Track */}
        <div className="relative w-[600px] h-[800px] bg-white/40 border-x-8 border-blue-100 shadow-2xl flex justify-around items-end overflow-hidden">
          
          {/* LANES */}
          {[0, 1, 2].map(l => (
            <div key={l} className="w-1/3 h-full border-x border-blue-200/30 relative">
              {/* Render Obstacles in this lane */}
              {room.config?.obstacles.filter(obs => obs.lane === l).map(obs => {
                const distToMe = obs.distance - distance;
                if (distToMe > -100 && distToMe < 1000) {
                  return (
                    <div 
                      key={obs.id}
                      className="absolute left-1/2 -translate-x-1/2 transition-all duration-16"
                      style={{ bottom: `${distToMe * 0.8}px` }}
                    >
                      {obs.type === 'hole' && <div className="w-24 h-12 bg-gray-900/80 rounded-[100%] border-4 border-blue-400"></div>}
                      {obs.type === 'seal' && <div className="text-4xl">🦭</div>}
                      {obs.type === 'snowball' && <div className="w-16 h-16 bg-white rounded-full shadow-lg border border-blue-100"></div>}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))}

          {/* MY CHARACTER */}
          <div 
            className={`absolute transition-all duration-150 z-20 ${isJumping ? 'scale-150 -translate-y-48' : 'scale-100'}`}
            style={{ 
              left: `${(lane * 33.33) + 16.66}%`, 
              bottom: '40px',
              transform: `translateX(-50%) ${isJumping ? 'translateY(-100px)' : ''}`
            }}
          >
            <div className={`text-7xl ${isStunned ? 'rotate-90 grayscale' : 'animate-bounce'}`}>🐧</div>
            <div className="w-16 h-4 bg-black/10 rounded-full blur-sm mx-auto"></div>
          </div>

          {/* OTHER PLAYERS (GHOSTS) */}
          {players.filter(p => p.uid !== user.uid).map(p => {
             const distToMe = (p.distance || 0) - distance;
             if (distToMe > -100 && distToMe < 1000) {
               return (
                <div 
                  key={p.uid}
                  className="absolute opacity-40 grayscale z-10"
                  style={{ 
                    left: `${((p.lane || 1) * 33.33) + 16.66}%`, 
                    bottom: `${40 + (distToMe * 0.8)}px`,
                    transform: 'translateX(-50%) scale(0.8)'
                  }}
                >
                  <div className="text-6xl">🐧</div>
                  <div className="text-[10px] bg-black/20 text-white px-1 rounded whitespace-nowrap">{p.name}</div>
                </div>
               );
             }
             return null;
          })}
        </div>

        {/* Start Countdown Overlay */}
        {!startTime && (
          <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-md flex items-center justify-center z-50">
            <div className="text-center">
              <div className="text-9xl font-game text-white animate-ping">READY?</div>
              <div className="text-2xl font-game text-cyan-300 mt-4 uppercase">Expedition starting soon!</div>
            </div>
          </div>
        )}

        {/* Finish Screen */}
        {isFinished && (
          <div className="absolute inset-0 bg-blue-950/90 flex items-center justify-center z-50">
            <div className="bg-white p-12 rounded-[60px] text-center max-w-lg shadow-2xl">
              <Flag size={64} className="mx-auto text-blue-600 mb-6" />
              <h2 className="text-6xl font-game text-blue-900 mb-2">GOAL IN!</h2>
              <div className="space-y-4 my-8">
                {players.map((p, i) => (
                  <div key={p.uid} className={`flex items-center justify-between p-4 rounded-2xl ${p.uid === user.uid ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'}`}>
                    <span className="font-game text-xl">#{i+1} {p.name}</span>
                    <span className="font-bold text-blue-600">{p.finishTime ? (p.finishTime/1000).toFixed(2) + 's' : 'Racing...'}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={onEndGame}
                className="w-full py-6 bg-blue-600 text-white font-game text-2xl rounded-3xl hover:bg-blue-700 transition-all"
              >
                RETURN TO LOBBY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Info */}
      <div className="bg-white/10 p-4 flex justify-around text-blue-900/60 font-bold uppercase text-xs">
        <div className="flex items-center gap-2"><FastForward size={16} /> Arrow Keys to Move</div>
        <div className="flex items-center gap-2"><Shield size={16} /> Space to Jump</div>
        <div className="flex items-center gap-2"><Timer size={16} /> Distance: {Math.floor(distance)}m / {totalDist}m</div>
      </div>
      
      {/* Mobile Controls */}
      <div className="md:hidden grid grid-cols-3 gap-2 p-4 bg-white/20 z-30">
        <button onTouchStart={() => setLane(l => Math.max(0, l - 1))} className="h-20 bg-blue-500/50 rounded-2xl flex items-center justify-center text-4xl">⬅️</button>
        <button onTouchStart={handleJump} className="h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-4xl">JUMP</button>
        <button onTouchStart={() => setLane(l => Math.min(2, l + 1))} className="h-20 bg-blue-500/50 rounded-2xl flex items-center justify-center text-4xl">➡️</button>
      </div>
    </div>
  );
};

export default GameView;
