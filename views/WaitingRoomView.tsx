
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ref, onValue, update } from 'firebase/database';
import { database, joinRoom, leaveRoom } from '../firebase';
import { RoomData, GameConfig, PlayerState } from '../types';
import { generateRhythmPattern } from '../geminiService';
import { Share2, ArrowLeft, Play, User as UserIcon, Settings, Copy, Check } from 'lucide-react';

interface WaitingRoomProps {
  user: User;
  roomId: string;
  onLeave: () => void;
  onStartGame: () => void;
}

const WaitingRoomView: React.FC<WaitingRoomProps> = ({ user, roomId, onLeave, onStartGame }) => {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  useEffect(() => {
    // Join logic
    joinRoom(roomId, user.uid, user.displayName || user.email?.split('@')[0] || 'Player');

    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onLeave(); // Host deleted room
        return;
      }
      setRoom(data);
      if (data.status === 'playing') {
        onStartGame();
      }
    });

    return () => {
      // Unsubscribe only. Actual cleanup on component unmount
      unsubscribe();
    };
  }, [roomId, user.uid]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    if (!room || room.hostId !== user.uid) return;
    
    setIsGenerating(true);
    try {
      const config = await generateRhythmPattern(difficulty);
      const roomRef = ref(database, `rooms/${roomId}`);
      await update(roomRef, {
        config,
        status: 'playing'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!room) return null;

  const isHost = room.hostId === user.uid;
  // Fix: Explicitly cast players to PlayerState[] for proper property access
  const players = Object.values(room.players) as PlayerState[];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-12 min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => {
            leaveRoom(roomId, user.uid, isHost);
            onLeave();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft size={20} /> Leave Lobby
        </button>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-xl font-bold">
            Room ID: {roomId.slice(-6).toUpperCase()}
          </div>
          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
          >
            {copied ? <Check size={18} /> : <Share2 size={18} />}
            {copied ? 'Copied!' : 'Invite Friends'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-1">
        {/* Players List */}
        <div className="space-y-6">
          <h3 className="text-3xl font-game text-white flex items-center gap-3">
            <UserIcon size={28} className="text-cyan-400" /> 
            PARTY CREW ({players.length}/4)
          </h3>
          <div className="space-y-4">
            {players.map(p => (
              <div key={p.uid} className="flex items-center justify-between p-6 bg-glass rounded-[32px] border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-game ${p.uid === room.hostId ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-blue-500'}`}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-lg flex items-center gap-2">
                      {p.name}
                      {p.uid === room.hostId && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 rounded-full border border-yellow-500/30">HOST</span>}
                      {p.uid === user.uid && <span className="text-[10px] bg-white/10 text-white px-2 rounded-full border border-white/20 uppercase tracking-tighter">You</span>}
                    </div>
                    <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase">Ready to blast</p>
                  </div>
                </div>
              </div>
            ))}
            {Array.from({length: 4 - players.length}).map((_, i) => (
              <div key={i} className="border-2 border-dashed border-white/5 rounded-[32px] p-6 flex items-center justify-center text-gray-700">
                Waiting for friend...
              </div>
            ))}
          </div>
        </div>

        {/* Room Settings */}
        <div className="space-y-8">
          <div className="bg-glass p-8 rounded-[48px] border border-white/5 relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-pink-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <h3 className="text-2xl font-game text-pink-400 mb-8 flex items-center gap-2">
              <Settings size={24} /> STAGE SETUP
            </h3>

            <div className="space-y-8 flex-1">
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-4 uppercase tracking-widest">Difficulty</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['easy', 'medium', 'hard'] as const).map(d => (
                    <button
                      key={d}
                      disabled={!isHost}
                      onClick={() => setDifficulty(d)}
                      className={`py-4 rounded-2xl font-game text-sm transition-all border-2 ${
                        difficulty === d 
                        ? 'bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-500/20 scale-105' 
                        : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                      }`}
                    >
                      {d.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-gray-400 text-sm italic">
                  "AI will generate a fresh pattern every game. No two stages are ever the same!"
                </p>
              </div>
            </div>

            {isHost ? (
              <button
                onClick={handleStart}
                disabled={isGenerating}
                className="w-full mt-8 py-6 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 rounded-[32px] font-game text-3xl text-white shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4 group"
              >
                {isGenerating ? (
                   <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent border-white"></div>
                ) : (
                  <>
                    <Play size={32} fill="currentColor" className="group-hover:rotate-12 transition-transform" />
                    START BEAT
                  </>
                )}
              </button>
            ) : (
              <div className="mt-8 text-center text-gray-500 font-bold animate-pulse">
                Waiting for host to start...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoomView;
