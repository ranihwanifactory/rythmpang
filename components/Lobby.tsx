
import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { ref, onValue, get, set, serverTimestamp } from 'firebase/database';
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
  const [inputCode, setInputCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomList = Object.entries(data)
          .map(([id, room]: [string, any]) => ({
            ...room,
            id,
          }))
          // 플레이어가 있고, 생성된 지 얼마 안 된 방들 위주로 필터링 (유령 방 방지)
          .filter(r => r.players && Object.keys(r.players).length > 0)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRooms(roomList);
      } else {
        setRooms([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 4자리 짧은 방 코드 생성 (숫자 + 대문자 영문)
  const generateRoomCode = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    
    let code = generateRoomCode();
    // 방 코드 중복 체크 (매우 드물지만 안전을 위해)
    const existingRoom = await get(ref(db, `rooms/${code}`));
    if (existingRoom.exists()) {
      code = generateRoomCode(); // 재시도
    }

    const roomRef = ref(db, `rooms/${code}`);
    const roomData = {
      hostId: user.uid,
      roomName: newRoomName,
      createdAt: serverTimestamp(),
      players: {
        [user.uid]: {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || '승부사',
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

    await set(roomRef, roomData);
    setIsCreating(false);
    onJoinRoom(code);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputCode.toUpperCase().trim();
    if (code.length < 1) return;

    setJoinError('');
    const roomSnap = await get(ref(db, `rooms/${code}`));
    if (roomSnap.exists()) {
      onJoinRoom(code);
    } else {
      setJoinError('어라? 그 번호의 방은 없는 것 같아! 🧐');
      setTimeout(() => setJoinError(''), 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 rounded-[3rem] border-4 border-indigo-400 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-5">
          <img src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} className="w-16 h-16 rounded-3xl border-4 border-yellow-300 shadow-lg" alt="Avatar" />
          <div>
            <h1 className="text-2xl font-jua text-white">반가워, {user.displayName || '플레이어'}! 👋</h1>
            <p className="text-indigo-200 text-sm font-bold">친구의 방 번호를 입력해봐!</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-yellow-400 text-indigo-900 px-8 py-4 rounded-3xl font-black text-lg clay-button shadow-[0_6px_0_rgb(180,130,0)]"
          >
            새 방 만들기 ➕
          </button>
          <button onClick={() => signOut(auth)} className="text-white/50 hover:text-white font-bold text-sm px-4">로그아웃</button>
        </div>
      </header>

      {/* 방 번호 입력 섹션 */}
      <div className="mb-16 max-w-2xl mx-auto bg-white/5 p-8 rounded-[3rem] border-2 border-dashed border-white/20 text-center animate-pop">
         <h2 className="text-xl font-jua text-blue-300 mb-6 uppercase tracking-widest">방 번호 4자리로 입장하기</h2>
         <form onSubmit={handleJoinByCode} className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <input 
              type="text" 
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="예: 7A2B"
              className="w-48 text-center bg-indigo-950 border-4 border-indigo-500 rounded-2xl py-4 text-3xl font-black text-yellow-400 outline-none focus:ring-4 ring-yellow-400/30 transition-all placeholder:text-indigo-800"
            />
            <button 
              type="submit"
              className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white px-10 py-5 rounded-2xl font-jua text-2xl shadow-lg active:scale-95 transition-all"
            >
              입장!! 🚀
            </button>
         </form>
         {joinError && <p className="mt-4 text-red-400 font-bold animate-shake">{joinError}</p>}
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="h-1 flex-1 bg-white/10 rounded-full"></div>
        <h3 className="font-jua text-gray-400 text-lg">지금 열려있는 방들 ({rooms.length})</h3>
        <div className="h-1 flex-1 bg-white/10 rounded-full"></div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-2xl animate-pop">
            <h2 className="text-3xl font-jua text-indigo-900 text-center mb-6">방 제목을 정해줘!</h2>
            <input 
              type="text" 
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="예: 순발력 킹왕짱"
              className="w-full bg-indigo-50 border-4 border-indigo-100 px-6 py-4 rounded-2xl text-indigo-900 outline-none focus:border-indigo-500 mb-8 font-bold text-center"
              autoFocus
            />
            <div className="flex gap-4">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-4 font-bold text-gray-400">취소</button>
              <button onClick={handleCreateRoom} className="flex-1 py-4 font-black bg-indigo-600 text-white rounded-2xl shadow-lg">만들기 완료!</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rooms.length === 0 ? (
          <div className="col-span-full py-24 text-center">
            <div className="text-8xl mb-6 grayscale opacity-30">🎮</div>
            <p className="text-xl font-jua text-gray-600">지금은 열린 방이 없어. 직접 방을 만들어볼래?</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div 
              key={room.id}
              className="bg-white/10 backdrop-blur-lg rounded-[3rem] p-8 border border-white/20 hover:border-yellow-400 transition-all group relative active:scale-95 cursor-pointer"
              onClick={() => onJoinRoom(room.id)}
            >
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-xl font-jua text-white mb-1">{room.roomName}</h3>
                    <p className="text-yellow-400 font-black text-sm">번호: {room.id}</p>
                 </div>
                 <div className="bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full text-xs font-bold">
                   👤 {Object.keys(room.players || {}).length}명
                 </div>
              </div>
              
              <button className="w-full py-4 rounded-2xl font-black bg-white/10 text-white border border-white/10 group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all">
                {room.game?.status === 'waiting' ? '같이 놀기! 🤜' : '게임 진행 중...'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Lobby;
