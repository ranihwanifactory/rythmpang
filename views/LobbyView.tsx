
import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, database, createRoom } from '../firebase';
import { RoomData, PlayerState } from '../types';
import { Plus, Users, LogOut, Search, Trophy, MapPin } from 'lucide-react';

interface LobbyProps {
  user: User;
  onEnterRoom: (roomId: string) => void;
}

const LobbyView: React.FC<LobbyProps> = ({ user, onEnterRoom }) => {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const roomsRef = ref(database, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomList = Object.values(data) as RoomData[];
        setRooms(roomList);
      } else {
        setRooms([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCreateRoom = async () => {
    const roomId = await createRoom(user.uid, user.displayName || user.email?.split('@')[0] || 'Explorer');
    onEnterRoom(roomId);
  };

  const filteredRooms = rooms.filter(r => 
    r.hostName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.id.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl overflow-hidden ring-4 ring-blue-400 shadow-xl bg-blue-900 flex items-center justify-center text-4xl">
            {user.photoURL ? <img src={user.photoURL} alt="pfp" /> : '🐧'}
          </div>
          <div>
            <h2 className="text-3xl font-game">Hello, {user.displayName || user.email?.split('@')[0]}!</h2>
            <p className="text-blue-400 flex items-center gap-1 font-bold">
              <Trophy size={16} /> Expedition Rank: Rookie
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => signOut(auth)}
            className="p-4 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all rounded-2xl"
          >
            <LogOut size={24} />
          </button>
          <button 
            onClick={handleCreateRoom}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:scale-105 active:scale-95 transition-all rounded-2xl font-game text-xl shadow-lg shadow-blue-500/20"
          >
            <Plus size={24} /> START EXPEDITION
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-glass p-6 rounded-[32px] space-y-4">
            <h3 className="text-xl font-game text-blue-400">SEARCH STAGE</h3>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-gray-500" size={20} />
              <input 
                type="text" 
                placeholder="Team Leader Name..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Room List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRooms.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-glass rounded-[40px] border-2 border-dashed border-white/10">
                <MapPin size={64} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-2xl font-game text-gray-400">No active expeditions...</h3>
                <p className="text-gray-500">Create a room and invite your friends!</p>
              </div>
            ) : (
              filteredRooms.map(room => (
                <div 
                  key={room.id}
                  onClick={() => onEnterRoom(room.id)}
                  className="group bg-glass hover:bg-white/10 border border-white/10 hover:border-blue-500/50 p-6 rounded-[40px] transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl">
                      🏔️
                    </div>
                    <div>
                      <h4 className="text-xl font-bold truncate">{room.hostName}'s Team</h4>
                      <p className="text-xs text-gray-400">STAGE ID: {room.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className={`ml-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${room.status === 'playing' ? 'bg-red-500' : 'bg-emerald-500'} text-white`}>
                      {room.status}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex -space-x-2">
                      {room.players && (Object.values(room.players) as PlayerState[]).map((p, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-400 flex items-center justify-center text-[10px] font-bold">
                          {p.name?.[0]?.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-blue-300">
                      {room.players ? Object.keys(room.players).length : 0} / 4 Explorers
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;
