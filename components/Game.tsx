
import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, update, remove, onDisconnect } from 'firebase/database';
import { db, auth } from '../firebase';
import { Room, Player } from '../types';

interface GameProps {
  roomId: string;
  onExit: () => void;
}

export const Game: React.FC<GameProps> = ({ roomId, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'result'>('ready');
  const [localDistance, setLocalDistance] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  
  const user = auth.currentUser;
  const roomRef = ref(db, `rooms/${roomId}`);
  
  // 게임 변수
  const gameActive = useRef(false);
  const distanceRef = useRef(0);
  const velocity = useRef(2);
  const isJumping = useRef(false);
  const jumpFrame = useRef(0);
  const obstacles = useRef<{x: number, type: 'hole' | 'ice'}[]>([]);

  useEffect(() => {
    if (!user) return;
    const playerRef = ref(db, `rooms/${roomId}/players/${user.uid}`);
    const playerData: Player = {
      uid: user.uid,
      displayName: user.displayName || '탐험가',
      email: user.email || '',
      photoURL: user.photoURL || '',
      score: 0,
      position: 0,
      isReady: true,
      status: 'playing'
    };
    update(ref(db, `rooms/${roomId}/players`), { [user.uid]: playerData });

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { onExit(); return; }
      setRoom({ ...data, id: roomId });
    });

    onDisconnect(playerRef).remove();
    return () => {
      unsubscribe();
      gameActive.current = false;
      if (room?.hostId === user.uid) remove(roomRef);
      else remove(playerRef);
    };
  }, [roomId, user?.uid]);

  // 게임 루프 및 렌더링
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const goalDistance = 2000;

    const render = () => {
      if (!gameActive.current) return;

      // 1. 상태 업데이트
      distanceRef.current += velocity.current;
      setLocalDistance(distanceRef.current);

      if (isJumping.current) {
        jumpFrame.current += 1;
        if (jumpFrame.current > 30) {
          isJumping.current = false;
          jumpFrame.current = 0;
        }
      }

      // 장애물 생성
      if (Math.random() < 0.02) {
        obstacles.current.push({ 
          x: canvas.width + 100, 
          type: Math.random() > 0.5 ? 'hole' : 'ice' 
        });
      }

      // 장애물 이동 및 충돌 체크
      obstacles.current = obstacles.current.map(obs => ({ ...obs, x: obs.x - velocity.current * 3 }))
        .filter(obs => obs.x > -50);

      obstacles.current.forEach(obs => {
        if (obs.x > 80 && obs.x < 120 && !isJumping.current) {
          velocity.current = 0.5; // 속도 감소
          setTimeout(() => { if(gameActive.current) velocity.current = 2; }, 500);
        }
      });

      // 2. 그리기
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 배경 (눈길)
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 길 라인
      ctx.strokeStyle = '#BAE6FD';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const y = (i * 40 + (distanceRef.current % 40)) % 400;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 장애물 그리기
      obstacles.current.forEach(obs => {
        ctx.fillStyle = obs.type === 'hole' ? '#0C4A6E' : '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(obs.x, 200, 30, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        if (obs.type === 'ice') {
          ctx.strokeStyle = '#7DD3FC';
          ctx.stroke();
        }
      });

      // 플레이어 (펭귄)
      const jumpY = isJumping.current ? Math.sin((jumpFrame.current / 30) * Math.PI) * 60 : 0;
      ctx.font = '50px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🐧', 100, 220 - jumpY);

      // 목표 도착 체크
      if (distanceRef.current >= goalDistance) {
        gameActive.current = false;
        setGameState('result');
        if (user) {
          update(ref(db, `rooms/${roomId}/players/${user.uid}`), {
            status: 'finished',
            score: Math.floor(timeLeft * 10)
          });
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    if (gameState === 'playing') {
      gameActive.current = true;
      render();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  // 타이머 및 동기화
  useEffect(() => {
    let timer: number;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('result');
            gameActive.current = false;
            return 0;
          }
          return prev - 1;
        });

        // 2초마다 Firebase 위치 업데이트
        if (user && timeLeft % 2 === 0) {
          update(ref(db, `rooms/${roomId}/players/${user.uid}`), {
            position: Math.min(100, (distanceRef.current / 2000) * 100)
          });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleJump = () => {
    if (!isJumping.current && gameState === 'playing') {
      isJumping.current = true;
    }
  };

  const startGame = () => {
    setGameState('playing');
    setTimeLeft(60);
    distanceRef.current = 0;
    obstacles.current = [];
  };

  const players = Object.values(room?.players || {}) as Player[];

  return (
    <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center justify-center font-['Pretendard']">
      {/* 게임 상태 바 */}
      <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-4 flex justify-between items-center text-white border border-white/20">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-blue-300">남은 시간</span>
          <span className="text-2xl font-black">{timeLeft}s</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-blue-300">진행 거리</span>
          <span className="text-2xl font-black">{Math.floor((localDistance/2000)*100)}%</span>
        </div>
      </div>

      {/* 메인 게임 화면 */}
      <div className="relative w-full max-w-2xl aspect-[16/9] bg-blue-50 rounded-3xl overflow-hidden shadow-2xl border-8 border-white/10"
           onClick={handleJump}
           onTouchStart={handleJump}>
        
        <canvas ref={canvasRef} width={640} height={360} className="w-full h-full" />

        {/* 안내 문구 */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
            <span className="text-6xl mb-4 floating">🐧</span>
            <h2 className="text-3xl font-black mb-2">남극 탐험 레이스!</h2>
            <p className="mb-6 text-blue-200 text-center">장애물을 점프해서 피하고<br/>60초 안에 목적지에 도착하세요!</p>
            <button onClick={startGame} className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl transform active:scale-95 transition-all">
              탐험 시작!
            </button>
          </div>
        )}

        {/* 결과 화면 */}
        {gameState === 'result' && (
          <div className="absolute inset-0 bg-blue-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <h2 className="text-5xl font-black mb-6">
              {localDistance >= 2000 ? '🎉 미션 성공!' : '🧊 타임 오버!'}
            </h2>
            <div className="bg-white/10 p-6 rounded-3xl mb-8 w-64 text-center">
              <p className="text-blue-300 mb-1">최종 점수</p>
              <p className="text-4xl font-black">{Math.floor(timeLeft * 10 + (localDistance/20))}점</p>
            </div>
            <div className="flex gap-4">
              <button onClick={startGame} className="bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-xl font-bold">다시 도전</button>
              <button onClick={onExit} className="bg-red-500 hover:bg-red-600 px-8 py-3 rounded-xl font-bold">나가기</button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 실시간 미니맵 */}
      <div className="w-full max-w-2xl mt-6 bg-white/5 p-6 rounded-3xl border border-white/10">
        <div className="flex justify-between items-center mb-4 text-white/50 text-xs font-bold uppercase tracking-widest">
          <span>START</span>
          <span>LIVE RACE MAP</span>
          <span>GOAL</span>
        </div>
        <div className="relative h-12 bg-blue-900/50 rounded-full border border-blue-400/30 px-6">
          <div className="absolute top-1/2 left-6 right-6 h-1 bg-blue-400/20 -translate-y-1/2"></div>
          {players.map(p => (
            <div 
              key={p.uid} 
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 flex flex-col items-center"
              style={{ left: `calc(${p.position || 0}% + 24px)`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="text-[10px] text-white font-bold bg-blue-500 px-1 rounded absolute -top-6 whitespace-nowrap">
                {p.displayName}
              </div>
              <span className="text-2xl drop-shadow-lg">🐧</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-white/40 text-sm font-medium">
        화면을 클릭하거나 스페이스바를 눌러 점프하세요!
      </div>
    </div>
  );
};
