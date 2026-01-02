
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
          .filter(r => r.players && Object.keys(r.players).length > 0 && r.roomName && r.hostId)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRooms(roomList);
      } else {
        setRooms([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const roomRef = ref(db, `rooms/${code}`);
    await set(roomRef, {
      hostId: user.uid,
      roomName: newRoomName,
      createdAt: serverTimestamp(),
      players: {
        [user.uid]: {
          uid: user.uid,
          name: user.displayName || 'Guest',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`,
          score: 0,
          isReady: false
        }
      },
      game: { status: 'waiting', currentRound: 0, totalRounds: 5 }
    });
    setIsCreating(false);
    onJoinRoom(code);
  };

  return (
    <div className="max-w-xl mx-auto px-6 pt-10 pb-20">
      {/* Header Profile */}
      <header className="flex items-center justify-between mb-12 animate-slide-up">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <img src={user.photoURL || ''} className="w-14 h-14 rounded-2xl border-2 border-white/10 group-hover:border-cyan-500/50 transition-all shadow-lg" alt="User" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#020617] rounded-full"></div>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-none mb-1">{user.displayName || 'Agent'}</h2>
            <button onClick={() => signOut(auth)} className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-rose-400 transition-colors">Disconnect</button>
          </div>
        </div>
        <button 
          onClick={() => setShowGuide(true)}
          className="p-3 glass rounded-xl hover:border-cyan-500/30 transition-all text-cyan-400"
          title="Guide"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </header>

      {/* Main Actions */}
      <div className="grid grid-cols-1 gap-4 mb-12 animate-slide-up [animation-delay:0.1s]">
        <button 
          onClick={() => setIsCreating(true)}
          className="group relative overflow-hidden bg-white/5 border border-white/10 hover:border-cyan-500/50 p-6 rounded-[2rem] text-left transition-all shadow-xl"
        >
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">새 세션 생성</h3>
              <p className="text-slate-400 text-xs font-medium">친구들을 초대하여 대결을 시작하세요.</p>
            </div>
            <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[40px] rounded-full"></div>
        </button>

        <div className="glass p-4 rounded-[2rem] flex gap-3">
          <input 
            type="text" 
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="세션 코드 입력"
            maxLength={4}
            className="flex-1 bg-white/5 border border-white/5 px-6 py-4 rounded-2xl text-white outline-none focus:border-cyan-500/30 text-center font-bold tracking-[0.5em]"
          />
          <button 
            onClick={() => inputCode && onJoinRoom(inputCode)}
            className="bg-cyan-500 text-slate-950 px-8 py-4 rounded-2xl font-bold active:scale-95 transition-all"
          >
            접속
          </button>
        </div>
      </div>

      {/* Room List Section */}
      <section className="animate-slide-up [animation-delay:0.2s]">
        <div className="flex items-center justify-between px-2 mb-6">
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Active Channels</h3>
          <div className="h-px flex-1 bg-white/5 mx-4"></div>
          <span className="text-cyan-400 text-[10px] font-bold">{rooms.length}</span>
        </div>

        {rooms.length === 0 ? (
          <div className="py-20 text-center glass rounded-[2.5rem] border-dashed">
            <p className="text-slate-500 text-sm font-medium">활성화된 채널이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div 
                key={room.id}
                onClick={() => onJoinRoom(room.id)}
                className="group glass p-5 rounded-[1.8rem] flex items-center justify-between hover:bg-white/5 hover:border-cyan-500/30 transition-all cursor-pointer shadow-lg"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 font-jua text-lg">
                    {room.id}
                  </div>
                  <div>
                    <h4 className="text-white font-bold group-hover:text-cyan-400 transition-colors">{room.roomName}</h4>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Players: {Object.keys(room.players).length} / 4</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals & Creation UI (Styled similarly to AuthView) */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="glass p-8 w-full max-w-sm rounded-[2.5rem] animate-pop">
            <h2 className="text-xl font-bold text-white mb-6 text-center">채널 이름 설정</h2>
            <input 
              type="text" 
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="예: 최강자 대결"
              maxLength={15}
              className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-xl text-white text-center font-medium mb-6 focus:border-cyan-500/50 outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-4 text-slate-500 font-bold text-sm">Cancel</button>
              <button onClick={handleCreateRoom} className="flex-1 py-4 bg-cyan-500 text-slate-950 rounded-xl font-bold shadow-lg">Create</button>
            </div>
          </div>
        </div>
      )}

      {showGuide && (
        <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-md z-[100] flex items-center justify-center p-8">
          <div className="glass p-8 w-full max-w-sm rounded-[3rem] animate-pop relative">
            <button onClick={() => setShowGuide(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-8 text-center neon-glow-cyan">How to Play</h2>
            <div className="space-y-6 text-slate-300 text-sm">
              <div className="flex gap-5 items-center bg-white/5 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center font-bold text-rose-400">01</div>
                <p>배경이 <span className="text-rose-400 font-bold italic underline">RED</span>일 때는 절대 누르지 말고 대기하세요.</p>
              </div>
              <div className="flex gap-5 items-center bg-white/5 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400">02</div>
                <p>배경이 <span className="text-emerald-400 font-bold italic underline">GREEN</span>으로 바뀌면 즉시 화면을 터치하세요.</p>
              </div>
              <div className="flex gap-5 items-center bg-white/5 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center font-bold text-cyan-400">03</div>
                <p>반응 속도(ms)가 <span className="text-cyan-400 font-bold">작을수록</span> 순위가 높아집니다.</p>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="w-full mt-8 bg-white/5 border border-white/10 hover:border-white/20 py-4 rounded-2xl font-bold text-white transition-all">Understood</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
