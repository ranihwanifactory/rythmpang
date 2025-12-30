
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
          id
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
    <div className="max-w-6xl mx-auto px-4 pt-12">
      <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-sm shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="relative">
             <img src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} className="w-20 h-20 rounded-3xl border-4 border-yellow-400 shadow-lg" alt="Avatar" />
             <div className="absolute -top-3 -left-3 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold animate-pulse">LIVE</div>
          </div>
          <div>
            <h1 className="text-3xl font-jua text-white">안녕, {user.displayName || '플레이어'}! 👋</h1>
            <p className="text-blue-300 font-bold">오늘은 누가 제일 빠를까?</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-b from-green-400 to-green-600 text-indigo-900 px-8 py-4 rounded-2xl font-black text-xl clay-button shadow-[0_5px_0_rgb(30,120,50)] transition-transform hover:scale-105 active:scale-95"
          >
            새로운 방 만들기 ➕
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="bg-white/10 text-white px-6 py-4 rounded-2xl font-bold hover:bg-white/20 transition-colors border border-white/10"
          >
            로그아웃
          </button>
        </div>
      </header>

      {isCreating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#242442] border-2 border-green-400 rounded-[3rem] p-10 w-full max-w-sm shadow-[0_0_50px_rgba(74,222,128,0.3)] animate-pop">
            <h2 className="text-3xl font-jua text-white text-center mb-8">방 제목을 정해줘! 🎮</h2>
            <input 
              type="text" 
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="예: 내가 제일 빨라!"
              className="w-full bg-white/5 border-2 border-white/10 px-6 py-4 rounded-2xl text-white outline-none focus:border-green-400 mb-8 font-bold text-lg text-center"
              autoFocus
            />
            <div className="flex gap-4">
              <button 
                onClick={() => setIsCreating(false)}
                className="flex-1 py-4 font-bold text-gray-400 hover:text-white transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleCreateRoom}
                className="flex-1 py-4 font-black bg-green-500 text-indigo-900 rounded-2xl clay-button shadow-[0_5px_0_rgb(30,120,50)]"
              >
                방 만들기!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rooms.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
            <div className="text-9xl mb-8 grayscale opacity-50">🎮</div>
            <p className="text-2xl font-jua text-gray-500">지금은 열린 방이 없어... 하나 만들어볼래?</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div 
              key={room.id}
              className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-8 shadow-xl border border-white/10 hover:border-yellow-400/50 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl group-hover:bg-yellow-400/20 transition-all"></div>
              
              <h3 className="text-2xl font-jua text-white mb-4 group-hover:text-yellow-400 transition-colors">{room.roomName}</h3>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 bg-indigo-500/30 px-4 py-2 rounded-xl border border-white/10">
                  <span className="text-yellow-400 text-lg">👤</span>
                  <span className="font-bold text-blue-100">{Object.keys(room.players || {}).length}명 참여 중</span>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${room.game.status === 'waiting' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                  {room.game.status === 'waiting' ? '대기 중' : '경기 중'}
                </div>
              </div>

              <button 
                onClick={() => onJoinRoom(room.id)}
                disabled={room.game.status !== 'waiting'}
                className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-lg active:scale-95 ${
                  room.game.status === 'waiting' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white clay-button shadow-[0_5px_0_rgb(30,60,150)]' 
                  : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10'
                }`}
              >
                {room.game.status === 'waiting' ? '입장하기 🚀' : '진행 중...'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Lobby;
