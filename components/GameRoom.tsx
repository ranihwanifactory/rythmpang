
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
        onDisconnect(roomRef).remove();
      } else {
        onDisconnect(playerRef).remove();
      }
    };
    setupDisconnect();

    update(playerRef, {
      uid: user.uid,
      name: user.displayName || 'Guest',
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`,
      score: 0,
      isReady: false
    });

    return () => unsubscribe();
  }, [roomId, user, onLeave]);

  const handleLeaveGame = async () => {
    if (room && room.hostId === user.uid) await remove(roomRef);
    else await remove(playerRef);
    onLeave();
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Lightning Reflex',
      text: `Join session [${roomId}] for a reflex challenge!`,
      url: `${window.location.origin}/#room/${roomId}`
    };
    if (navigator.share) await navigator.share(shareData);
    else {
      navigator.clipboard.writeText(shareData.url);
      alert('Link copied to clipboard!');
    }
  };

  if (loading || !room) return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400"></div>
    </div>
  );

  const playersArr = Object.values(room.players || {}) as Player[];
  const isHost = room.hostId === user.uid;
  const allReady = playersArr.every(p => p.isReady || p.uid === room.hostId);

  if (room.game?.status === 'playing' || room.game?.status === 'results') {
    return <Gameplay user={user} room={room} />;
  }

  return (
    <div className="max-w-xl mx-auto px-6 pt-10 pb-20">
      <div className="glass rounded-[3rem] overflow-hidden shadow-2xl animate-slide-up">
        {/* Room Status Header */}
        <div className="p-8 border-b border-white/5 bg-white/5 relative">
          <div className="flex justify-between items-start mb-10">
            <button onClick={handleLeaveGame} className="p-3 glass rounded-xl hover:text-rose-400 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div className="text-center">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1 block">Session ID</span>
               <div className="text-3xl font-bold text-white tracking-tighter neon-glow-cyan">{roomId}</div>
            </div>
            <button onClick={handleShare} className="p-3 glass rounded-xl hover:text-cyan-400 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">{room.roomName}</h1>
          <p className="text-slate-500 text-xs font-medium text-center">전술적 순발력 교전 대기 중</p>
        </div>

        {/* Players Slot */}
        <div className="p-8">
          <div className="grid grid-cols-2 gap-4 mb-10">
            {Array.from({ length: 4 }).map((_, i) => {
              const player = playersArr[i];
              return (
                <div key={i} className={`h-40 glass rounded-[2rem] flex flex-col items-center justify-center relative transition-all ${player ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-dashed border-white/5 opacity-50'}`}>
                  {player ? (
                    <>
                      <img src={player.photoURL} className="w-16 h-16 rounded-2xl mb-3 border-2 border-white/10" alt="" />
                      <span className="text-xs font-bold text-white truncate w-full px-4 text-center">{player.name}</span>
                      {player.uid === room.hostId && <span className="absolute top-3 left-3 text-[8px] bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Host</span>}
                      {player.isReady && <div className="absolute top-3 right-3 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>}
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 mb-3 flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Waiting</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4 text-center">
            {isHost ? (
              <button 
                onClick={async () => await update(ref(db, `rooms/${roomId}/game`), { status: 'playing', currentRound: 1 })}
                disabled={!allReady || playersArr.length < 2}
                className={`w-full py-5 rounded-2xl font-bold text-sm uppercase tracking-[0.2em] transition-all shadow-xl ${allReady && playersArr.length >= 2 ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/20' : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'}`}
              >
                {playersArr.length < 2 ? 'Need more players' : !allReady ? 'Waiting for readiness' : 'Initiate Session'}
              </button>
            ) : (
              <button 
                onClick={async () => await update(playerRef, { isReady: !room.players[user.uid]?.isReady })}
                className={`w-full py-5 rounded-2xl font-bold text-sm uppercase tracking-[0.2em] border transition-all ${room.players[user.uid]?.isReady ? 'border-rose-500 text-rose-500 bg-rose-500/5' : 'border-emerald-500 text-emerald-500 bg-emerald-500/5'}`}
              >
                {room.players[user.uid]?.isReady ? 'De-authorize' : 'Authorize Ready'}
              </button>
            )}
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              {isHost ? 'Admin authorization required' : 'Standard protocol waiting'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
