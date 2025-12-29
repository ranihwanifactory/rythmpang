
import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, database, createRoom } from '../firebase';
import { RoomData, PlayerState } from '../types';
import { Plus, Users, LogOut, Search, Trophy } from 'lucide-react';

interface LobbyProps {
  user: User;
  onEnterRoom: (roomId: string) => void;
}

const LobbyView: React.FC<LobbyProps> = ({ user, onEnterRoom }) => {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const roomsRef = ref(database, 'rooms');
    return onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomList = Object.values(data) as RoomData[];
        setRooms(roomList);
      } else {
        setRooms([]);
      }
    });
  }, []);

  const handleCreateRoom = async () => {
    const roomId = await createRoom(user.uid, user.displayName || user.email?.split('@')[0] || 'Player');
    onEnterRoom(roomId);
  };

  const filteredRooms = rooms.filter(r => 
    r.hostName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.id.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl overflow-hidden ring-4 ring-pink-500 shadow-xl">
            <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/150`} alt="avatar" />
          </div>
          <div>
            <h2 className="text-3xl font-game text-white">Hi, {user.displayName || user.email?.split('@')[0]}!</h2>
            <p className="text-pink-400 flex items-center gap-1 font-bold">
              <Trophy size={16} /> Rhythm Level 10
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
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-105 active:scale-95 transition-all rounded-2xl font-game text-xl shadow-lg shadow-cyan-500/20"
          >
            <Plus size={24} /> NEW ROOM
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar / Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-glass p-6 rounded-[32px] space-y-4">
            <h3 className="text-xl font-game text-pink-400">FIND A ROOM</h3>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-gray-500" size={20} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="bg-glass p-6 rounded-[32px] overflow-hidden relative">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl"></div>
            <h3 className="text-xl font-game text-yellow-400 mb-4">LEADERBOARD</h3>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="font-game text-yellow-500">#{i}</span>
                    <span className="text-sm font-bold">ProPlayer_{i}</span>
                  </div>
                  <span className="text-xs text-gray-400">9,999 pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Room List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRooms.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-glass rounded-[40px]">
                <Users size={64} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-2xl font-game text-gray-400">No rooms active right now...</h3>
                <p className="text-gray-500">Why not create your own and invite friends?</p>
              </div>
            ) : (
              filteredRooms.map(room => (
                <div 
                  key={room.id}
                  onClick={() => onEnterRoom(room.id)}
                  className="group relative bg-glass hover:bg-white/10 border border-white/10 hover:border-pink-500/50 p-6 rounded-[40px] transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${room.status === 'playing' ? 'bg-red-500' : 'bg-emerald-500'} text-white`}>
                      {room.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xl font-game shadow-lg">
                      {room.hostName[0]}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{room.hostName}'s Party</h4>
                      <p className="text-sm text-gray-400">Room ID: {room.id.slice(-6)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex -space-x-3">
                      {/* Explicitly cast result of Object.values to PlayerState[] for property access */}
                      {(Object.values(room.players) as PlayerState[]).map((p, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f0f1a] bg-blue-500 flex items-center justify-center text-[10px] font-bold">
                          {p.name[0]}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-gray-300">
                      {Object.keys(room.players).length} / 4 Players
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-full py-2 text-pink-400 font-game text-lg">CLICK TO JOIN</button>
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
