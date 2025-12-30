
import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { db, auth } from '../firebase';
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

    // Fix: Added missing 'status' property to the Player object to satisfy the Player interface.
    // Explicitly typing the 'players' variable as Record<string, Player> ensures the object literal 
    // is correctly interpreted and matches the Room interface's requirements.
    const players: Record<string, Player> = {
      [user.uid]: {
        uid: user.uid,
        displayName: user.displayName || '탐험가',
        email: user.email || '',
        photoURL: user.photoURL || '',
        score: 0,
        position: 0,
        isReady: true,
        status: 'playing',
      }
    };

    const roomData: Partial<Room> = {
      name: newRoomName,
      hostId: user.uid,
      hostName: user.displayName || '익명의 탐험가',
      status: 'waiting',
      createdAt: Date.now(),
      players: players
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
          <h2 className="text-4xl font-black text-blue-900 mb-2">탐험 대기실 🏕️</h2>
          <p className="text-blue-500 font-medium">참여할 기지를 선택하거나 직접 만들어보세요!</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl transform transition-all active:scale-95"
        >
          + 새 기지 만들기
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl border-4 border-orange-100">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">기지 이름 정하기</h3>
            <input
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-blue-50 focus:border-blue-300 outline-none mb-6"
              placeholder="예: 눈보라 기지 🏔️"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createRoom()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 py-3 text-blue-400 font-bold hover:bg-blue-50 rounded-xl"
              >
                취소
              </button>
              <button
                onClick={createRoom}
                className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                만들기!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="text-6xl mb-4">❄️</div>
            <p className="text-blue-300 font-bold">아직 열려있는 기지가 없어요. 직접 만들어볼까요?</p>
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
                <span className="text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full font-bold">대기중</span>
              </div>
              <h4 className="text-xl font-bold text-blue-800 mb-1">{room.name}</h4>
              <p className="text-sm text-blue-400 mb-4">대장: {room.hostName}</p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {(Object.values(room.players || {}) as Player[]).map((p) => (
                    <div key={p.uid} className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center overflow-hidden">
                      {p.photoURL ? <img src={p.photoURL} className="w-full h-full object-cover" /> : <span>👤</span>}
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-blue-300">
                  {Object.keys(room.players || {}).length}명의 대원
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
