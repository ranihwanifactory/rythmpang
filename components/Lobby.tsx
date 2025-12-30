
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
  const [showGuide, setShowGuide] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomList = Object.entries(data)
          .map(([id, room]: [string, any]) => ({ ...room, id }))
          .filter(r => r.players && Object.keys(r.players).length > 0)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRooms(roomList);
      } else {
        setRooms([]);
      }
    });
    return () => unsubscribe();
  }, []);

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
    const existingRoom = await get(ref(db, `rooms/${code}`));
    if (existingRoom.exists()) code = generateRoomCode();

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
      game: { status: 'waiting', currentRound: 0, totalRounds: 5 }
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
    if (roomSnap.exists()) onJoinRoom(code);
    else {
      setJoinError('그 번호의 방이 없어요! 🧐');
      setTimeout(() => setJoinError(''), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-20">
      <header className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center bg-indigo-900/40 p-5 rounded-[2rem] border border-white/10 shadow-lg">
          <div className="flex items-center gap-3">
            <img src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} className="w-12 h-12 rounded-2xl border-2 border-yellow-300" alt="Avatar" />
            <div>
              <p className="text-white font-jua text-lg">{user.displayName || '플레이어'}</p>
              <button onClick={() => signOut(auth)} className="text-white/40 text-xs font-bold underline">로그아웃</button>
            </div>
          </div>
          <button 
            onClick={() => setShowGuide(true)}
            className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-black border border-white/20 animate-pulse"
          >
            게임 방법❓
          </button>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="w-full bg-yellow-400 text-indigo-900 py-5 rounded-[2rem] font-black text-xl clay-button shadow-[0_6px_0_rgb(180,130,0)]"
        >
          새 방 만들기 ➕
        </button>
      </header>

      {/* 방 번호로 입장 */}
      <section className="mb-10 bg-indigo-950/50 p-6 rounded-[2.5rem] border-2 border-dashed border-indigo-500/30 text-center shadow-inner">
         <h2 className="text-sm font-jua text-indigo-300 mb-4 uppercase tracking-widest">방 번호 4자리 입력</h2>
         <form onSubmit={handleJoinByCode} className="flex gap-3 justify-center">
            <input 
              type="text" 
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="0000"
              className="w-32 text-center bg-indigo-950 border-4 border-indigo-500 rounded-2xl py-3 text-2xl font-black text-yellow-400 outline-none"
            />
            <button 
              type="submit"
              className="bg-indigo-500 text-white px-8 py-3 rounded-2xl font-jua text-xl shadow-lg active:scale-95"
            >
              입장!
            </button>
         </form>
         {joinError && <p className="mt-3 text-red-400 text-sm font-bold animate-shake">{joinError}</p>}
      </section>

      {/* 게임 안내 모달 */}
      {showGuide && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-md z-[100] p-6 flex items-center justify-center">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm animate-pop text-indigo-900">
            <h2 className="text-3xl font-jua text-center mb-6">게임 방법 🎮</h2>
            <div className="space-y-6 mb-8 text-sm">
              <div className="flex gap-4 items-start">
                <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                <p>화면이 <b>빨간색</b>일 때는 절대 누르면 안 돼요! 가만히 기다리세요.</p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                <p>화면이 <b>초록색</b>으로 변하거나 <b>"지금이야!"</b>라고 하면 최대한 빨리 화면을 터치하세요!</p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                <p>기록(ms)이 낮을수록 순위가 높아요. 5라운드까지 합산해서 <b>가장 낮은 사람이 승리!</b></p>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-jua text-xl shadow-lg">알겠어요!</button>
          </div>
        </div>
      )}

      {/* 방 목록 */}
      <div className="space-y-4">
        <h3 className="font-jua text-indigo-300 ml-2">참여 가능한 방 ({rooms.length})</h3>
        {rooms.length === 0 ? (
          <div className="py-12 text-center bg-white/5 rounded-[2.5rem] border border-white/10">
            <p className="text-indigo-400 font-bold">열린 방이 없어요. 먼저 만들어보세요!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div 
              key={room.id}
              onClick={() => onJoinRoom(room.id)}
              className="bg-white/10 p-5 rounded-[2.2rem] flex items-center justify-between border border-white/10 active:bg-indigo-500/20 transition-all"
            >
              <div>
                <h4 className="text-white font-jua text-lg">{room.roomName}</h4>
                <p className="text-yellow-400 font-black text-xs">ID: {room.id} • 👤 {Object.keys(room.players || {}).length}명</p>
              </div>
              <span className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-black">입장</span>
            </div>
          ))
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm animate-pop">
            <h2 className="text-2xl font-jua text-indigo-900 text-center mb-6">방 제목 정하기</h2>
            <input 
              type="text" 
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="예: 초스피드 대결"
              className="w-full bg-indigo-50 border-2 border-indigo-100 px-6 py-4 rounded-2xl text-indigo-900 text-center font-bold mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-4 text-gray-400 font-bold">취소</button>
              <button onClick={handleCreateRoom} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black">만들기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
