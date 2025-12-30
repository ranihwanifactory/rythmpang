
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
          // 1. 플레이어가 1명 이상 있고, 2. 방 이름이 있으며, 3. 호스트 정보가 있는 유효한 방만 표시
          .filter(r => r.players && Object.keys(r.players).length > 0 && r.roomName && r.hostId)
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
      setJoinError('해당 번호의 방을 찾을 수 없어요! 🧐');
      setTimeout(() => setJoinError(''), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-20">
      <header className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center bg-indigo-900/60 p-5 rounded-[2.5rem] border-2 border-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.3)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} className="w-12 h-12 rounded-2xl border-2 border-yellow-300 shadow-md" alt="Avatar" />
            <div>
              <p className="text-white font-jua text-lg leading-tight">{user.displayName || '플레이어'}</p>
              <button onClick={() => signOut(auth)} className="text-indigo-300 text-xs font-bold hover:text-white transition-colors">로그아웃</button>
            </div>
          </div>
          <button 
            onClick={() => setShowGuide(true)}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-5 py-2.5 rounded-2xl text-sm font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            게임 방법❓
          </button>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="w-full bg-gradient-to-b from-yellow-300 to-yellow-500 text-indigo-900 py-5 rounded-[2.5rem] font-black text-2xl clay-button shadow-[0_8px_0_rgb(180,130,0)]"
        >
          방 만들기 ➕
        </button>
      </header>

      {/* 방 번호로 입장 */}
      <section className="mb-12 bg-indigo-900/30 p-8 rounded-[3rem] border-4 border-indigo-500/20 text-center">
         <h2 className="text-lg font-jua text-indigo-300 mb-5 uppercase tracking-tighter">친구 방 번호로 바로 입장!</h2>
         <form onSubmit={handleJoinByCode} className="flex gap-4 justify-center items-center">
            <input 
              type="text" 
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="CODE"
              className="w-36 text-center bg-black/40 border-4 border-indigo-400 rounded-3xl py-4 text-3xl font-black text-yellow-400 outline-none focus:border-yellow-400 transition-colors shadow-inner"
            />
            <button 
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-10 py-5 rounded-3xl font-jua text-2xl shadow-[0_6px_0_rgb(67,56,202)] active:translate-y-1 active:shadow-none transition-all"
            >
              입장! 🚀
            </button>
         </form>
         {joinError && <p className="mt-4 text-red-400 font-bold animate-shake">{joinError}</p>}
      </section>

      {/* 게임 안내 모달 */}
      {showGuide && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-md z-[100] p-6 flex items-center justify-center">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm animate-pop text-indigo-900 shadow-[0_0_50px_rgba(255,255,255,0.2)]">
            <h2 className="text-4xl font-jua text-center mb-8">이렇게 놀아요! 🎮</h2>
            <div className="space-y-6 mb-10 text-base leading-relaxed">
              <div className="flex gap-4 items-center bg-red-50 p-4 rounded-2xl">
                <span className="text-3xl">🛑</span>
                <p className="font-bold">빨간색일 땐 기다려요!</p>
              </div>
              <div className="flex gap-4 items-center bg-green-50 p-4 rounded-2xl">
                <span className="text-3xl">⚡</span>
                <p className="font-bold text-green-700">초록색이 되면 광클!</p>
              </div>
              <div className="flex gap-4 items-center bg-yellow-50 p-4 rounded-2xl">
                <span className="text-3xl">🏆</span>
                <p className="font-bold text-orange-700">낮은 점수가 1등이에요!</p>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-jua text-2xl shadow-xl active:scale-95">준비됐어요!</button>
          </div>
        </div>
      )}

      {/* 방 목록 */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
           <h3 className="font-jua text-2xl text-white">대결 중인 방 🔥</h3>
           <div className="h-1 flex-1 bg-white/10 rounded-full"></div>
           <span className="bg-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full text-xs font-black">{rooms.length}개</span>
        </div>
        
        {rooms.length === 0 ? (
          <div className="py-20 text-center bg-indigo-900/20 rounded-[3rem] border-4 border-dashed border-white/5">
            <div className="text-6xl mb-6">🏝️</div>
            <p className="text-indigo-300 font-jua text-xl">텅 비어있어요...<br/>방을 만들고 친구를 초대해보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {rooms.map((room) => (
              <div 
                key={room.id}
                onClick={() => onJoinRoom(room.id)}
                className="bg-gradient-to-r from-indigo-800 to-indigo-900 p-6 rounded-[2.5rem] flex items-center justify-between border-4 border-indigo-400/30 hover:border-yellow-400 hover:scale-[1.02] transition-all shadow-xl cursor-pointer group"
              >
                <div className="flex flex-col gap-1">
                  <h4 className="text-white font-jua text-2xl group-hover:text-yellow-300 transition-colors">{room.roomName}</h4>
                  <div className="flex items-center gap-2">
                    <span className="bg-yellow-400 text-indigo-900 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">CODE: {room.id}</span>
                    <span className="text-indigo-200 text-xs font-bold">👤 {Object.keys(room.players || {}).length}명 대기 중</span>
                  </div>
                </div>
                <div className="bg-indigo-400 text-white w-14 h-14 rounded-full flex items-center justify-center font-black shadow-lg group-hover:bg-yellow-400 group-hover:text-indigo-900 transition-all">
                  입장
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] p-10 w-full max-w-sm animate-pop shadow-2xl border-t-[12px] border-indigo-500">
            <h2 className="text-3xl font-jua text-indigo-900 text-center mb-8 leading-tight">우리 방의 이름은? 🏷️</h2>
            <input 
              type="text" 
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="예: 초고수만 오삼"
              maxLength={15}
              className="w-full bg-indigo-50 border-4 border-indigo-100 px-6 py-5 rounded-3xl text-indigo-900 text-center text-xl font-bold mb-8 outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
            <div className="flex gap-4">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-5 text-gray-400 font-bold text-lg">취소</button>
              <button onClick={handleCreateRoom} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-lg active:scale-95">방 만들기!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
