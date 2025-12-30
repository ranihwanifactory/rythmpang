
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ref, onValue, set, remove, onDisconnect, update } from 'firebase/database';
import { db } from '../firebase';
import { Room, Player } from '../types';
import Gameplay from './Gameplay';

interface GameRoomProps {
  user: User;
  roomId: string;
  onLeave: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({ user, roomId, onLeave }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onLeave();
        return;
      }
      setRoom({ ...data, id: roomId });
      setLoading(false);
    });

    const setupDisconnect = async () => {
      const snap = await onValue(roomRef, (s) => {}, { onlyOnce: true });
      const currentRoom = snap.snapshot.val() as Room;
      
      if (currentRoom && currentRoom.hostId === user.uid) {
        onDisconnect(roomRef).remove();
      } else {
        const playerRef = ref(db, `rooms/${roomId}/players/${user.uid}`);
        onDisconnect(playerRef).remove();
      }
    };

    setupDisconnect();

    const addSelf = async () => {
      const playerRef = ref(db, `rooms/${roomId}/players/${user.uid}`);
      await update(playerRef, {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || '익명',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`,
        score: 0,
        isReady: false
      });
    };
    
    addSelf();

    return () => unsubscribe();
  }, [roomId, user, onLeave]);

  const handleToggleReady = async () => {
    if (!room) return;
    const playerRef = ref(db, `rooms/${roomId}/players/${user.uid}`);
    await update(playerRef, { isReady: !room.players[user.uid]?.isReady });
  };

  const handleStartGame = async () => {
    if (!room || room.hostId !== user.uid) return;
    const gameRef = ref(db, `rooms/${roomId}/game`);
    await update(gameRef, { status: 'playing', currentRound: 1 });
  };

  const copyLink = () => {
    const link = `${window.location.origin}/#room/${roomId}`;
    navigator.clipboard.writeText(link);
    alert('친구 초대 링크가 복사됐어! 얼른 친구들 불러오자! ✨');
  };

  if (loading || !room) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-20 h-20 border-8 border-indigo-500 border-t-pink-500 rounded-full animate-spin shadow-2xl"></div>
      <p className="mt-8 text-2xl font-jua text-white animate-pulse">맵 불러오는 중...</p>
    </div>
  );

  const playersArr = Object.values(room.players || {}) as Player[];
  const isHost = room.hostId === user.uid;
  const allReady = playersArr.every(p => p.isReady || p.uid === room.hostId);

  if (room.game?.status === 'playing' || room.game?.status === 'results') {
    return <Gameplay user={user} room={room} />;
  }

  return (
    <div className="max-w-4xl mx-auto pt-10 px-4 pb-20">
      <div className="bg-indigo-900/40 backdrop-blur-2xl rounded-[4rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden border-2 border-white/20">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-12 text-white relative">
          <div className="flex justify-between items-center mb-10">
            <button onClick={onLeave} className="bg-white/20 hover:bg-white/30 p-4 rounded-3xl transition-all border border-white/20 active:scale-90">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            <h1 className="text-4xl font-jua drop-shadow-lg">대기실에서 준비 중... 🏁</h1>
            <div className="w-16"></div>
          </div>
          
          <div className="bg-black/20 p-6 rounded-[2.5rem] mb-10 text-center">
             <p className="text-white text-3xl font-jua mb-2">{room.roomName}</p>
             <p className="text-indigo-200 font-bold opacity-80 uppercase tracking-widest text-xs">Battle Arena</p>
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={copyLink}
              className="bg-yellow-400 text-indigo-900 px-10 py-4 rounded-full font-black flex items-center gap-4 clay-button shadow-[0_6px_0_rgb(180,120,0)] hover:scale-105 active:translate-y-1 transition-all"
            >
              <span className="text-2xl">🔗</span>
              <span className="text-lg">친구 초대 링크 복사하기</span>
            </button>
          </div>
        </div>

        <div className="p-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-20">
            {playersArr.map((player) => (
              <div key={player.uid} className="flex flex-col items-center animate-pop group">
                <div className="relative mb-6">
                  <img 
                    src={player.photoURL} 
                    className={`w-28 h-28 rounded-[2.5rem] border-8 ${player.isReady ? 'border-green-400 shadow-[0_0_40px_rgba(74,222,128,0.6)]' : 'border-white/10'} shadow-2xl transition-all group-hover:scale-110 group-hover:rotate-3`}
                    alt={player.name}
                  />
                  {player.isReady && (
                    <div className="absolute -bottom-3 -right-3 bg-green-500 text-white p-2 rounded-2xl shadow-xl ring-4 ring-white">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                    </div>
                  )}
                  {player.uid === room.hostId && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-indigo-900 text-xs font-black px-4 py-2 rounded-full shadow-lg border-2 border-indigo-900 animate-bounce">
                      방장
                    </div>
                  )}
                </div>
                <span className="font-black text-white text-lg truncate w-full text-center drop-shadow-md">{player.name}</span>
              </div>
            ))}
            
            {Array.from({ length: Math.max(0, 4 - playersArr.length) }).map((_, i) => (
              <div key={i} className="flex flex-col items-center opacity-20 hover:opacity-40 transition-opacity">
                <div className="w-28 h-28 rounded-[2.5rem] bg-white/10 border-4 border-dashed border-white/40 flex items-center justify-center">
                   <span className="text-6xl text-white/20">+</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-8">
            {!isHost ? (
              <button 
                onClick={handleToggleReady}
                className={`w-full max-w-sm py-8 rounded-[2.5rem] font-jua text-3xl shadow-2xl transition-all active:scale-95 border-b-[12px] ${
                  room.players[user.uid]?.isReady 
                  ? 'bg-red-500 hover:bg-red-600 text-white border-red-900' 
                  : 'bg-green-500 hover:bg-green-600 text-white border-green-900'
                }`}
              >
                {room.players[user.uid]?.isReady ? '준비 취소!' : '준비 완료! 🏁'}
              </button>
            ) : (
              <button 
                onClick={handleStartGame}
                disabled={!allReady || playersArr.length < 2}
                className={`w-full max-w-sm py-8 rounded-[2.5rem] font-jua text-3xl shadow-2xl transition-all active:scale-95 border-b-[12px] ${
                  allReady && playersArr.length >= 2 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-900 border-orange-800' 
                  : 'bg-white/10 text-gray-500 cursor-not-allowed border-black/20'
                }`}
              >
                {playersArr.length < 2 ? '친구가 부족해!' : !allReady ? '모두 준비 대기 중...' : '전투 시작!! 🔥'}
              </button>
            )}
            <div className="bg-indigo-950/50 px-8 py-3 rounded-full border border-white/10">
               <p className="text-indigo-200 text-sm font-bold">
                 다들 준비가 끝나면 방장이 버튼을 누를 수 있어!
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
