
import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove, onDisconnect } from 'firebase/database';
import { db, auth } from '../firebase';
import { Room, Player } from '../types';

// 로컬 데이터 세트 (AI API 대신 사용)
const ANTARCTIC_FACTS = [
  "남극은 세계에서 가장 추운 곳이에요! ❄️",
  "남극에는 북극곰이 살지 않아요. 펭귄들의 천국이죠! 🐧",
  "남극의 얼음 두께는 평균 2,000미터가 넘어요! 🧊",
  "황제펭귄은 영하 40도의 추위도 견딜 수 있어요. ✨",
  "남극에서는 해가 지지 않는 '백야' 현상이 나타나기도 해요! ☀️",
  "남극은 지구에서 가장 큰 얼음 덩어리예요. 🌍",
  "펭귄은 날지 못하지만 바다에서는 아주 빠른 수영 선수예요! 🏊‍♂️",
  "남극 대륙의 크기는 대한민국 면적의 약 140배나 된답니다! 😲"
];

const ANTARCTIC_QUIZZES = [
  { question: "남극에 사는 가장 큰 펭귄은?", options: ["황제펭귄", "아델리펭귄", "젠투펭귄"], correctAnswer: "황제펭귄" },
  { question: "남극에는 북극곰이 살까요?", options: ["네", "아니오", "가끔 놀러와요"], correctAnswer: "아니오" },
  { question: "펭귄의 주된 먹이는 무엇일까요?", options: ["풀", "물고기와 크릴새우", "나무열매"], correctAnswer: "물고기와 크릴새우" },
  { question: "남극은 어느 쪽에 있을까요?", options: ["지구의 위쪽", "지구의 아래쪽", "지구의 옆쪽"], correctAnswer: "지구의 아래쪽" },
  { question: "남극의 얼음이 모두 녹으면 어떻게 될까요?", options: ["바닷물이 높아져요", "바닷물이 낮아져요", "아무 일도 없어요"], correctAnswer: "바닷물이 높아져요" }
];

interface GameProps {
  roomId: string;
  onExit: () => void;
}

export const Game: React.FC<GameProps> = ({ roomId, onExit }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [aiMessage, setAiMessage] = useState("안녕! 나는 가이드 펭귄 핑고야! 나랑 같이 남극을 탐험하자! 🐧");
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const user = auth.currentUser;
  const roomRef = ref(db, `rooms/${roomId}`);

  useEffect(() => {
    if (!user) return;

    const playerRef = ref(db, `rooms/${roomId}/players/${user.uid}`);
    const playerData: Player = {
      uid: user.uid,
      displayName: user.displayName || '탐험가',
      email: user.email || '',
      photoURL: user.photoURL || '',
      score: 0,
      position: 0,
      isReady: true,
    };
    
    update(ref(db, `rooms/${roomId}/players`), { [user.uid]: playerData });

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onExit();
        return;
      }
      setRoom({ ...data, id: roomId });
    });

    onDisconnect(playerRef).remove();

    return () => {
      unsubscribe();
      if (room?.hostId === user.uid) {
        remove(roomRef);
      } else {
        remove(playerRef);
      }
    };
  }, [roomId, user?.uid]);

  const shareLink = () => {
    const link = `${window.location.origin}/#room=${roomId}`;
    navigator.clipboard.writeText(link);
    alert("기지 링크가 복사되었어요! 친구들에게 보내주세요! 🎿");
  };

  const handleMove = () => {
    if (!room || !user || isQuizOpen || loading) return;
    
    setLoading(true);
    setTimeout(() => {
      const newPos = (room.players[user.uid]?.position || 0) + 1;
      
      // 로컬 상식 데이터에서 랜덤 선택
      const randomFact = ANTARCTIC_FACTS[Math.floor(Math.random() * ANTARCTIC_FACTS.length)];
      setAiMessage(randomFact);

      // 40% 확률로 퀴즈 발생
      if (Math.random() > 0.6) {
        const quiz = ANTARCTIC_QUIZZES[Math.floor(Math.random() * ANTARCTIC_QUIZZES.length)];
        setCurrentQuiz(quiz);
        setIsQuizOpen(true);
      } else {
        update(ref(db, `rooms/${roomId}/players/${user.uid}`), {
          position: newPos,
          score: (room.players[user.uid]?.score || 0) + 10
        });
      }
      setLoading(false);
    }, 300);
  };

  const handleQuizAnswer = async (ans: string) => {
    if (!user || !room || !currentQuiz) return;

    const isCorrect = ans === currentQuiz.correctAnswer;
    const bonus = isCorrect ? 50 : -10;
    
    setAiMessage(isCorrect ? "우와! 정답이야! 너 정말 똑똑하구나! 🌟" : "앗, 틀렸어! 괜찮아, 다음에 맞히면 돼! 🧊");
    
    const currentScore = room.players[user.uid]?.score || 0;
    const currentPos = room.players[user.uid]?.position || 0;

    await update(ref(db, `rooms/${roomId}/players/${user.uid}`), {
      score: Math.max(0, currentScore + bonus),
      position: isCorrect ? currentPos + 2 : currentPos
    });

    setIsQuizOpen(false);
    setCurrentQuiz(null);
  };

  if (!room) return <div className="p-20 text-center text-blue-400 font-bold">기지 연결 중... 🌨️</div>;

  const players = Object.values(room.players || {}) as Player[];
  const isHost = room.hostId === user?.uid;

  return (
    <div className="min-h-screen bg-blue-50 p-4 md:p-8 flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">{room.name}</h2>
          <p className="text-sm text-blue-400 font-bold">대장: {room.hostName}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={shareLink} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all">
            🔗 초대 링크 복사
          </button>
          <button onClick={onExit} className="bg-red-50 hover:bg-red-100 text-red-500 px-4 py-2 rounded-xl text-sm font-bold border border-red-100 transition-all">
            {isHost ? "기지 폐쇄하기" : "기지 나가기"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-xl border-4 border-blue-100 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="grid grid-cols-10 grid-rows-10 gap-2 p-4">
              {[...Array(100)].map((_, i) => <div key={i} className="text-2xl">❄️</div>)}
            </div>
          </div>

          <div className="relative z-10 w-full max-w-2xl h-64 border-b-8 border-blue-100 flex items-end justify-around pb-2 px-10 bg-blue-50/50 rounded-b-3xl">
             {players.map((p, idx) => (
               <div 
                key={p.uid} 
                className="transition-all duration-700 flex flex-col items-center" 
                style={{ 
                  transform: `translateX(${p.position * 12}px)`,
                  marginBottom: `${idx * 15}px` 
                }}
               >
                 <div className="text-[10px] font-bold text-blue-600 mb-1 bg-white/80 px-1 rounded">{p.displayName}</div>
                 <div className="text-5xl floating">🐧</div>
                 <div className="text-[10px] bg-blue-500 text-white px-2 rounded-full font-bold">{p.score}점</div>
               </div>
             ))}
          </div>

          <div className="mt-12 text-center">
             <button 
              disabled={loading || isQuizOpen}
              onClick={handleMove}
              className={`text-2xl font-black px-12 py-6 rounded-full shadow-2xl transform active:scale-90 transition-all ${
                loading ? 'bg-gray-200 text-gray-400' : 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse'
              }`}
             >
               {loading ? "탐험 중..." : "앞으로 아장아장! 🐾"}
             </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-200 relative">
            <div className="absolute -top-10 -left-2 text-7xl floating">🐧</div>
            <div className="pt-8">
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 relative mb-4">
                <div className="absolute -top-2 left-10 w-4 h-4 bg-blue-50 rotate-45 border-t-2 border-l-2 border-blue-100"></div>
                <p className="text-blue-800 font-bold leading-relaxed text-lg">"{aiMessage}"</p>
              </div>
              <p className="text-[10px] uppercase font-bold text-blue-300 tracking-widest text-right">— 가이드 펭귄 핑고</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-100">
            <h3 className="text-xl font-bold text-blue-900 mb-4 border-b pb-2">탐험대 순위 🏆</h3>
            <div className="space-y-3">
              {players.sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.uid} className="flex items-center justify-between p-3 bg-blue-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-white' : 'bg-blue-100 text-blue-600'}`}>
                      {i + 1}
                    </span>
                    <span className="font-bold text-blue-800 text-sm">{p.displayName}</span>
                  </div>
                  <span className="font-black text-blue-600">{p.score}점</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isQuizOpen && currentQuiz && (
        <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl border-[10px] border-blue-200 text-center animate-bounce-in">
            <div className="text-6xl mb-6">💡</div>
            <h3 className="text-2xl font-black text-blue-900 mb-6">{currentQuiz.question}</h3>
            <div className="grid grid-cols-1 gap-4">
              {currentQuiz.options.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleQuizAnswer(opt)}
                  className="bg-blue-50 hover:bg-blue-500 hover:text-white p-5 rounded-2xl font-bold text-blue-800 border-2 border-blue-100 transition-all text-lg shadow-sm"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
