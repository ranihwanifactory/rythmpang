
import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Music, Play, Mail, LogIn } from 'lucide-react';

const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-500/20 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[100px] rounded-full"></div>

      <div className="z-10 text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <div className="p-4 bg-gradient-to-tr from-pink-500 to-yellow-500 rounded-3xl shadow-xl animate-bounce">
            <Music size={48} className="text-white" />
          </div>
        </div>
        <h1 className="text-6xl md:text-7xl font-game tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-yellow-400 to-cyan-400 drop-shadow-lg">
          RHYTHM BLAST
        </h1>
        <p className="text-gray-400 mt-4 text-xl">Feel the beat, rule the stage!</p>
      </div>

      <div className="w-full max-w-md bg-glass p-8 rounded-[40px] shadow-2xl space-y-6">
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <input 
              type="email" 
              placeholder="Your Email" 
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Your Password" 
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:scale-105 active:scale-95 transition-all text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
          >
            <LogIn size={20} />
            {isRegister ? 'Join the Party' : 'Start Playing'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#0f0f1a] text-gray-500 uppercase">Or with</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-white text-gray-900 hover:bg-gray-100 transition-colors font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          Login with Google
        </button>

        {error && <p className="text-red-400 text-center text-sm">{error}</p>}

        <p className="text-center text-gray-400 text-sm">
          {isRegister ? 'Already a player?' : 'New to the game?'} 
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className="ml-2 text-pink-400 hover:underline font-bold"
          >
            {isRegister ? 'Sign In' : 'Create Account'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginView;
