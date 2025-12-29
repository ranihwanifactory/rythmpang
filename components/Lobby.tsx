
import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { db, auth } from '../firebase';
// Added Player to imports to fix type casting
import { Room, Player } from '../types';

interface LobbyProps {
  onJoinRoom: (roomId: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinRoom }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsList: Room[] = Object.keys(data).map((id) => ({
          ...data[id],
          id,
        }));
        setRooms(roomsList.filter(r => r.status === 'waiting'));
      } else {
        setRooms([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    const roomsRef = ref(db, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomData: Partial<Room> = {
      name: newRoomName,
      hostId: user.uid,
      hostName: user.displayName || 'Anonymous Explorer',
      status: 'waiting',
      createdAt: Date.now(),
      players: {
        [user.uid]: {
          uid: user.uid,
          displayName: user.displayName || 'Explorer',
          email: user.email || '',
          photoURL: user.photoURL || '',
          score: 0,
          position: 0,
          isReady: true,
        }
      }
    };

    await set(newRoomRef, roomData);
    onJoinRoom(newRoomRef.key!);
    setNewRoomName('');
    setIsCreating(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-4xl font-black text-blue-900 mb-2">Adventure Lobby 🏕️</h2>
          <p className="text-blue-500">Pick a base camp or start your own!</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl transform transition-all active:scale-95"
        >
          + New Base Camp
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl border-4 border-orange-100">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">Name your Camp</h3>
            <input
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-blue-50 focus:border-blue-300 outline-none mb-6"
              placeholder="e.g., Snowy Peak 🏔️"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createRoom()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 py-3 text-blue-400 font-bold hover:bg-blue-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                Go!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="text-6xl mb-4">❄️</div>
            <p className="text-blue-300 font-medium italic">No expeditions yet. Be the first to start!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => onJoinRoom(room.id)}
              className="bg-white p-6 rounded-3xl shadow-lg border-2 border-transparent hover:border-blue-300 cursor-pointer transform transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-2xl">⛺</span>
                <span className="text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full font-bold">Waiting</span>
              </div>
              <h4 className="text-xl font-bold text-blue-800 mb-1">{room.name}</h4>
              <p className="text-sm text-blue-400 mb-4">Leader: {room.hostName}</p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {/* Fixed: cast to Player[] to resolve Property 'uid' does not exist on type 'unknown' */}
                  {(Object.values(room.players || {}) as Player[]).map((p, i) => (
                    <div key={p.uid} className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center overflow-hidden">
                      {p.photoURL ? <img src={p.photoURL} className="w-full h-full object-cover" /> : <span>👤</span>}
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-blue-300">
                  {Object.keys(room.players || {}).length} explorer(s)
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
