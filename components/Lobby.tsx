
import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { auth, db } from '../firebase';
import { Room } from '../types';

interface LobbyProps {
  user: User;
  onJoinRoom: (id: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ user, onJoinRoom }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomList = Object.entries(data).map(([id, room]: [string, any]) => ({
          ...room,
          id,
          // DB 구조 유연성 확보: game 객체가 없을 경우 기본값 생성
          game: room.game || { status: 'waiting', currentRound: 0, totalRounds: 5 }
        }));
        setRooms(roomList);
      } else {
        setRooms([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    
    const roomsRef = ref(db, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomData = {
      hostId: user.uid,
      roomName: newRoomName,
      createdAt: serverTimestamp(),
      players: {
        [user.uid]: {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || '익명의 승부사',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`,
          score: 0,
          isReady: false
        }
      },
      game: {
        status: 'waiting',
        currentRound: 0,
        totalRounds: 5
      }
    };

    await set(newRoomRef, roomData);
    setIsCreating(false);
    onJoinRoom(newRoomRef.key!);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 rounded-[3rem] border-4 border-indigo-400 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="relative group">
             <img src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} className="w-20 h-20 rounded-3xl border-4 border-yellow-300 shadow-lg group-hover:rotate-6 transition-transform" alt="Avatar" />
             <div className="absolute -top-4 -left-4 bg-gradient-to-r from-pink-500 to-yellow-500 text-white text-[10px] px-3 py-1 rounded-full font-black shadow-lg animate-bounce">LV.99</div>
          </div>
          <div>
            <h1 className="text-3xl font-jua text-white drop-shadow-md">반가워, {user.displayName || '플레이어'}! 🔥</h1>
            <p className="text-indigo-200 font-bold">오늘 컨디션은 어때? 1등 하러 가자!</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-b from-yellow-300 to-yellow-500 text-indigo-900 px-10 py-4 rounded-3xl font-black text-xl clay-button shadow-[0_6px_0_rgb(180,130,0)] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none"
          >
            방 만들기 ➕
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="bg-white/10 text-white px-6 py-4 rounded-3xl font-bold hover:bg-red-500 transition-all border-2 border-white/20"
          >
            나가기
          </button>
        </div>
      </header>

      {isCreating && (
        <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-t-[12px] border-indigo-500 animate-pop">
            <h2 className="text-3xl font-jua text-indigo-900 text-center mb-6">어떤 방으로 할까?</h2>
            <input 
              type="text" 
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="예: 초스피드 배틀!!"
              className="w-full bg-indigo-50 border-4 border-indigo-100 px-6 py-4 rounded-2xl text-indigo-900 outline-none focus:border-indigo-500 mb-8 font-bold text-lg text-center transition-all"
              autoFocus
            />
            <div className="flex gap-4">
              <button 
                onClick={() => setIsCreating(false)}
                className="flex-1 py-4 font-bold text-gray-400 hover:text-indigo-600 transition-colors"
              >
                닫기
              </button>
              <button 
                onClick={handleCreateRoom}
                className="flex-1 py-4 font-black bg-indigo-600 text-white rounded-2xl shadow-[0_6px_0_rgb(30,40,100)] active:translate-y-1 active:shadow-none transition-all"
              >
                만들기 완료!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rooms.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white/5 rounded-[4rem] border-4 border-dashed border-white/10 animate-pulse">
            <div className="text-9xl mb-8">💤</div>
            <p className="text-2xl font-jua text-indigo-300">지금은 모두 잠잠해... 방을 하나 만들어줘!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div 
              key={room.id}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-[3.5rem] p-10 shadow-2xl border-2 border-white/20 hover:border-yellow-400/80 transition-all group relative overflow-hidden active:scale-95 cursor-pointer"
              onClick={() => onJoinRoom(room.id)}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-all"></div>
              
              <div className="flex justify-between items-start mb-6">
                 <h3 className="text-2xl font-jua text-white group-hover:text-yellow-300 transition-colors">{room.roomName}</h3>
                 <div className="bg-white/10 p-2 rounded-2xl text-xl">⚡</div>
              </div>
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3 bg-indigo-600/50 px-5 py-2 rounded-2xl border border-white/20">
                  <span className="text-white font-bold">👤 {Object.keys(room.players || {}).length}명</span>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-tighter ${room.game?.status === 'waiting' ? 'bg-green-400 text-indigo-900' : 'bg-red-500 text-white'}`}>
                  {room.game?.status === 'waiting' ? '대기 중' : '진행 중'}
                </div>
              </div>

              <button 
                className={`w-full py-5 rounded-3xl font-black text-xl transition-all shadow-lg ${
                  room.game?.status === 'waiting' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white clay-button shadow-[0_6px_0_rgb(40,30,120)] group-hover:from-indigo-400 group-hover:to-purple-500' 
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
              >
                {room.game?.status === 'waiting' ? '같이 놀기! 🎮' : '기다려줘요...'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Lobby;
