
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
    
    // Listen for room changes
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onLeave();
        return;
      }
      setRoom({ ...data, id: roomId });
      setLoading(false);
    });

    // Host Management: If host leaves, delete room. If player leaves, remove self.
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
    alert('방 링크가 복사되었어! 친구에게 보내줘! 🔗');
  };

  if (loading || !room) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const playersArr = Object.values(room.players || {}) as Player[];
  const isHost = room.hostId === user.uid;
  const allReady = playersArr.every(p => p.isReady || p.uid === room.hostId);

  if (room.game.status === 'playing' || room.game.status === 'results') {
    return <Gameplay user={user} room={room} />;
  }

  return (
    <div className="max-w-4xl mx-auto pt-10 px-4 pb-20">
      <div className="bg-white/5 backdrop-blur-xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
        <div className="bg-gradient-to-r from-indigo-700 to-purple-800 p-10 text-white relative">
          <div className="flex justify-between items-center mb-6">
            <button onClick={onLeave} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-colors border border-white/10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            <h1 className="text-3xl font-jua">게임 대기실 🏁</h1>
            <div className="w-12"></div>
          </div>
          <p className="text-center text-blue-200 text-xl font-bold mb-8">방 제목: {room.roomName}</p>
          
          <div className="flex justify-center">
            <button 
              onClick={copyLink}
              className="bg-yellow-400 text-indigo-900 px-8 py-3 rounded-full font-black flex items-center gap-3 clay-button shadow-[0_4px_0_rgb(180,120,0)] hover:scale-105 transition-all"
            >
              <span>🔗 친구 초대 링크 복사</span>
            </button>
          </div>
        </div>

        <div className="p-10">
          <h2 className="text-xl font-jua text-blue-300 mb-8 text-center uppercase tracking-widest">접속 중인 플레이어</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-16">
            {playersArr.map((player) => (
              <div key={player.uid} className="flex flex-col items-center animate-pop">
                <div className="relative mb-4 group">
                  <img 
                    src={player.photoURL} 
                    className={`w-24 h-24 rounded-[2rem] border-4 ${player.isReady ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : 'border-white/10'} shadow-xl transition-all group-hover:scale-110`}
                    alt={player.name}
                  />
                  {player.isReady && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-xl shadow-lg text-[10px] font-black">
                      준비완료!
                    </div>
                  )}
                  {player.uid === room.hostId && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-indigo-900 text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                      👑 방장
                    </div>
                  )}
                </div>
                <span className="font-bold text-white text-base truncate w-full text-center">{player.name}</span>
              </div>
            ))}
            
            {Array.from({ length: Math.max(0, 4 - playersArr.length) }).map((_, i) => (
              <div key={i} className="flex flex-col items-center opacity-20">
                <div className="w-24 h-24 rounded-[2rem] bg-white/5 border-4 border-dashed border-white/20 flex items-center justify-center">
                   <span className="text-4xl text-white/30">?</span>
                </div>
                <span className="mt-4 font-bold text-white/30 text-sm">기다리는 중...</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-6">
            {!isHost ? (
              <button 
                onClick={handleToggleReady}
                className={`w-full max-w-sm py-6 rounded-3xl font-jua text-2xl shadow-xl transition-all active:scale-95 border-b-8 ${
                  room.players[user.uid]?.isReady 
                  ? 'bg-red-500 hover:bg-red-600 text-white border-red-800' 
                  : 'bg-green-500 hover:bg-green-600 text-white border-green-800'
                }`}
              >
                {room.players[user.uid]?.isReady ? '준비 취소' : '게임 준비! ⭕'}
              </button>
            ) : (
              <button 
                onClick={handleStartGame}
                disabled={!allReady || playersArr.length < 2}
                className={`w-full max-w-sm py-6 rounded-3xl font-jua text-2xl shadow-xl transition-all active:scale-95 border-b-8 ${
                  allReady && playersArr.length >= 2 
                  ? 'bg-yellow-400 hover:bg-yellow-500 text-indigo-900 border-yellow-700' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed border-gray-900'
                }`}
              >
                {playersArr.length < 2 ? '친구가 더 필요해' : !allReady ? '모두 준비하면 시작!' : '게임 시작!! 🔥'}
              </button>
            )}
            <p className="text-gray-500 text-sm font-bold bg-white/5 px-6 py-2 rounded-full">
              모든 사람이 준비하면 방장이 시작할 수 있어!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
