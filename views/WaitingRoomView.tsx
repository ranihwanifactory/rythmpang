
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ref, onValue, update } from 'firebase/database';
import { database, joinRoom, leaveRoom } from '../firebase';
import { RoomData, PlayerState } from '../types';
import { generateRaceTrack } from '../geminiService';
import { Share2, ArrowLeft, Play, User as UserIcon, Settings, Check, Flag } from 'lucide-react';

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
    joinRoom(roomId, user.uid, user.displayName || user.email?.split('@')[0] || 'Player');

    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onLeave();
        return;
      }
      setRoom(data);
      if (data.status === 'playing') {
        onStartGame();
      }
    });

    return () => unsubscribe();
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
      const config = await generateRaceTrack(difficulty);
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
        <div className="space-y-6">
          <h3 className="text-3xl font-game text-white flex items-center gap-3">
            <UserIcon size={28} className="text-cyan-400" /> 
            EXPEDITION TEAM ({players.length}/4)
          </h3>
          <div className="space-y-4">
            {players.map(p => (
              <div key={p.uid} className="flex items-center justify-between p-6 bg-glass rounded-[32px] border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-game ${p.uid === room.hostId ? 'bg-yellow-500' : 'bg-blue-500'}`}>
                    🐧
                  </div>
                  <div>
                    <div className="font-bold text-lg">{p.name} {p.uid === room.hostId && '👑'}</div>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Ready to slide</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-glass p-8 rounded-[48px] border border-white/5 h-full flex flex-col">
            <h3 className="text-2xl font-game text-cyan-400 mb-8 flex items-center gap-2">
              <Flag size={24} /> RACE SETTINGS
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
                        ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg' 
                        : 'bg-white/5 border-white/10 text-gray-500'
                      }`}
                    >
                      {d.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isHost ? (
              <button
                onClick={handleStart}
                disabled={isGenerating}
                className="w-full mt-8 py-6 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-[32px] font-game text-3xl text-white shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
              >
                {isGenerating ? "GENERATING TRACK..." : "START EXPEDITION"}
              </button>
            ) : (
              <div className="mt-8 text-center text-gray-500 font-bold animate-pulse">
                Waiting for the leader to start...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoomView;
