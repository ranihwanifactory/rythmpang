
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  push, 
  remove, 
  update,
  onDisconnect,
  get
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDJoI2d4yhRHl-jOsZMp57V41Skn8HYFa8",
  authDomain: "touchgame-bf7e2.firebaseapp.com",
  databaseURL: "https://touchgame-bf7e2-default-rtdb.firebaseio.com",
  projectId: "touchgame-bf7e2",
  storageBucket: "touchgame-bf7e2.firebasestorage.app",
  messagingSenderId: "289443560144",
  appId: "1:289443560144:web:6ef844f5e4a022fca13cd5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// Database helpers
export const createRoom = async (uid: string, name: string) => {
  const roomsRef = ref(database, 'rooms');
  const newRoomRef = push(roomsRef);
  const roomId = newRoomRef.key!;

  const initialRoomData = {
    id: roomId,
    hostId: uid,
    hostName: name,
    status: 'lobby',
    players: {
      [uid]: {
        uid,
        name,
        score: 0,
        combo: 0,
        status: 'waiting'
      }
    },
    createdAt: Date.now(),
    config: null
  };

  await set(newRoomRef, initialRoomData);

  // Auto-delete room when host disconnects
  const roomRef = ref(database, `rooms/${roomId}`);
  onDisconnect(roomRef).remove();

  return roomId;
};

export const joinRoom = async (roomId: string, uid: string, name: string) => {
  const playerRef = ref(database, `rooms/${roomId}/players/${uid}`);
  await set(playerRef, {
    uid,
    name,
    score: 0,
    combo: 0,
    status: 'waiting'
  });
};

export const leaveRoom = async (roomId: string, uid: string, isHost: boolean) => {
  if (isHost) {
    await remove(ref(database, `rooms/${roomId}`));
  } else {
    await remove(ref(database, `rooms/${roomId}/players/${uid}`));
  }
};
