
import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError("구글 로그인 실패: " + err.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(isSignUp ? "회원가입 실패!" : "로그인 실패! 이메일과 비번을 확인해줘.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1a1a2e] p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-600/30 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-blue-600/30 rounded-full blur-[100px]"></div>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md z-10 animate-pop">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-yellow-400 rounded-3xl shadow-lg mb-4 rotate-[-3deg] animate-bounce-subtle">
             <h1 className="text-4xl font-jua text-indigo-900 leading-none">⚡ 번개 순발력 ⚡</h1>
          </div>
          <p className="text-blue-200 font-bold">친구들과 펼치는 실시간 반응속도 대결!</p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-5">
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/20 px-6 py-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-yellow-400 transition-all placeholder:text-gray-500"
            placeholder="이메일 주소"
            required
          />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/20 px-6 py-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-yellow-400 transition-all placeholder:text-gray-500"
            placeholder="비밀번호"
            required
          />

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-900 font-black text-xl py-4 rounded-2xl clay-button shadow-[0_5px_0_rgb(180,120,0)]"
          >
            {isSignUp ? '가입하고 시작하기!' : '지금 바로 입장!'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-300 text-sm font-bold hover:text-white transition-colors"
          >
            {isSignUp ? '이미 계정이 있나요? 로그인' : '처음인가요? 회원가입 하기'}
          </button>
        </div>

        <div className="flex items-center my-8">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="px-4 text-gray-500 text-xs font-bold uppercase">간편하게 입장</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-white text-gray-800 flex items-center justify-center gap-3 py-4 rounded-2xl font-black hover:bg-gray-100 transition-all shadow-md active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          구글 계정으로 로그인
        </button>

        {error && <p className="mt-4 text-red-400 text-sm font-bold text-center animate-shake">{error}</p>}
      </div>
    </div>
  );
};

export default AuthView;
