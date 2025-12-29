
import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError("구글 로그인 중 오류가 발생했어요.");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName });
      }
    } catch (err: any) {
      setError("이메일이나 비밀번호를 확인해주세요!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 snow-bg">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-8 border-blue-100 transform transition-all hover:scale-[1.01]">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-blue-50 rounded-full mb-4 floating">
            <span className="text-6xl">🐧</span>
          </div>
          <h1 className="text-3xl font-bold text-blue-800">남극 탐험대</h1>
          <p className="text-blue-500 font-medium">신나는 남극 여행을 시작해요!</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm border border-red-100 text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="탐험가 이름 (별명)"
              className="w-full px-4 py-3 rounded-xl border-2 border-blue-50 focus:border-blue-300 outline-none transition-all"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="이메일 주소"
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-50 focus:border-blue-300 outline-none transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-50 focus:border-blue-300 outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all"
          >
            {isLogin ? '탐험 시작하기' : '대원 등록하기'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-2">
          <div className="flex-1 h-px bg-blue-100"></div>
          <span className="text-xs text-blue-300 font-bold uppercase">또는</span>
          <div className="flex-1 h-px bg-blue-100"></div>
        </div>

        <button
          onClick={handleGoogle}
          className="w-full bg-white border-2 border-blue-100 hover:bg-blue-50 text-blue-800 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
          구글로 간편 로그인
        </button>

        <p className="text-center mt-6 text-sm text-blue-400">
          {isLogin ? "처음 오셨나요?" : "이미 대원이신가요?"}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-bold hover:underline"
          >
            {isLogin ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  );
};
