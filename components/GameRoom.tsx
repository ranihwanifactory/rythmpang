
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ref, onValue, onDisconnect, update, remove, get } from 'firebase/database';
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

  const roomRef = ref(db, `rooms/${roomId}`);
  const playerRef = ref(db, `rooms/${roomId}/players/${user.uid}`);

  useEffect(() => {
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
      const roomSnap = await get(roomRef);
      const currentRoom = roomSnap.val() as Room;
      
      if (currentRoom && currentRoom.hostId === user.uid) {
        // 방장이 네트워크 연결이 끊기면 방 전체 삭제
        onDisconnect(roomRef).remove();
      } else {
        // 일반 참가자가 끊기면 본인만 삭제
        onDisconnect(playerRef).remove();
      }
    };

    setupDisconnect();

    const addSelf = async () => {
      await update(playerRef, {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || '플레이어',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`,
        score: 0,
        isReady: false
      });
    };
    
    addSelf();

    return () => unsubscribe();
  }, [roomId, user, onLeave]);

  const handleLeaveGame = async () => {
    if (room && room.hostId === user.uid) {
      // 방장이 직접 "나가기"를 누르면 방 전체 삭제
      await remove(roomRef);
    } else {
      // 참가자가 "나가기"를 누르면 본인만 삭제
      await remove(playerRef);
    }
    onLeave();
  };

  const handleToggleReady = async () => {
    if (!room) return;
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
    alert(`방 번호 [${roomId}] 복사 완료! 친구에게 이 번호를 알려줘! ✨`);
  };

  if (loading || !room) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1a2e]">
      <div className="w-20 h-20 border-8 border-indigo-500 border-t-yellow-400 rounded-full animate-spin shadow-[0_0_40px_rgba(250,204,21,0.4)]"></div>
      <p className="mt-8 text-2xl font-jua text-white animate-pulse">무대에 입장하는 중...</p>
    </div>
  );

  const playersArr = Object.values(room.players || {}) as Player[];
  const isHost = room.hostId === user.uid;
  const allReady = playersArr.every(p => p.isReady || p.uid === room.hostId);

  if (room.game?.status === 'playing' || room.game?.status === 'results') {
    return <Gameplay user={user} room={room} />;
  }

  return (
    <div className="max-w-4xl mx-auto pt-6 px-4 pb-20">
      <div className="bg-indigo-900/40 backdrop-blur-2xl rounded-[4rem] shadow-2xl overflow-hidden border-2 border-white/10">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-10 text-white relative">
          <div className="flex justify-between items-center mb-8">
            <button 
              onClick={handleLeaveGame} 
              className="bg-white/20 hover:bg-white/30 p-4 rounded-3xl transition-all active:scale-90 shadow-lg border border-white/20"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            <div className="text-center">
               <h1 className="text-xl font-jua mb-1 text-indigo-200">배틀 코드</h1>
               <div className="bg-yellow-400 text-indigo-900 px-8 py-2 rounded-3xl font-black text-4xl shadow-[0_8px_0_rgb(180,130,0)] rotate-[-2deg]">
                  {roomId}
               </div>
            </div>
            <div className="w-16"></div>
          </div>
          
          <p className="text-center text-white text-3xl font-jua mb-8 drop-shadow-md">"{room.roomName}"</p>
          
          <div className="flex justify-center">
            <button 
              onClick={copyLink}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-bold flex items-center gap-3 border-2 border-white/20 transition-all shadow-xl active:scale-95"
            >
              <span>🔗 링크 복사해서 친구 초대하기</span>
            </button>
          </div>
        </div>

        <div className="p-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-16">
            {playersArr.map((player) => (
              <div key={player.uid} className="flex flex-col items-center animate-pop group">
                <div className="relative mb-4">
                  <img 
                    src={player.photoURL} 
                    className={`w-28 h-28 rounded-[2.8rem] border-8 ${player.isReady ? 'border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.5)]' : 'border-indigo-800 shadow-xl'} transition-all duration-300 group-hover:scale-110`}
                    alt={player.name}
                  />
                  {player.isReady && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-2xl shadow-lg ring-4 ring-indigo-900 animate-bounce">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                    </div>
                  )}
                  {player.uid === room.hostId && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-indigo-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg border-2 border-indigo-900 whitespace-nowrap">
                      방장👑
                    </div>
                  )}
                </div>
                <span className="font-black text-white text-lg truncate w-full text-center drop-shadow-md">{player.name}</span>
              </div>
            ))}
            {/* 빈 자리 표시 */}
            {playersArr.length < 4 && Array.from({ length: 4 - playersArr.length }).map((_, i) => (
              <div key={i} className="flex flex-col items-center opacity-30">
                <div className="w-28 h-28 rounded-[2.8rem] border-4 border-dashed border-indigo-400 flex items-center justify-center">
                   <span className="text-5xl text-indigo-400 font-black">+</span>
                </div>
                <span className="mt-4 font-bold text-indigo-400">초대 대기...</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-8">
            {!isHost ? (
              <button 
                onClick={handleToggleReady}
                className={`w-full max-w-sm py-8 rounded-[3rem] font-jua text-4xl shadow-2xl transition-all active:scale-95 border-b-[12px] ${
                  room.players[user.uid]?.isReady ? 'bg-rose-500 border-rose-900' : 'bg-emerald-500 border-emerald-900'
                } text-white`}
              >
                {room.players[user.uid]?.isReady ? '준비 취소' : '준비 완료! 🏁'}
              </button>
            ) : (
              <button 
                onClick={handleStartGame}
                disabled={!allReady || playersArr.length < 2}
                className={`w-full max-w-sm py-8 rounded-[3rem] font-jua text-4xl shadow-2xl transition-all active:scale-95 border-b-[12px] ${
                  allReady && playersArr.length >= 2 ? 'bg-yellow-400 border-orange-800 text-indigo-900' : 'bg-indigo-800 text-indigo-400 border-black/40 cursor-not-allowed opacity-50'
                }`}
              >
                {playersArr.length < 2 ? '친구 초대 중...' : !allReady ? '준비 대기 중...' : '전투 시작!! 🔥'}
              </button>
            )}
            <p className="text-indigo-200 font-bold bg-indigo-950/50 px-8 py-3 rounded-full text-sm border border-indigo-400/20">
              {isHost ? '방장님! 모두 준비되면 버튼을 눌러주세요!' : '방장님이 게임을 시작할 때까지 기다려주세요!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
