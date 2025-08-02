import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Lock, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username dan password harus diisi');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login with:', { username, password: '***' });

      const response = await fetch("http://127.0.0.1:8001/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      const data = await response.json();
      console.log('Login response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || data.detail || "Login gagal");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log('Login successful, user role:', data.user.role);

      const role = data.user.role?.toLowerCase();
      
      setTimeout(() => {
        if (role === 'superadmin') {
          window.location.reload();
        } else if (role === 'employee') {
          window.location.reload();
        } else {
          window.location.reload();
        }
      }, 100);

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-orange-400/20 to-amber-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-4 h-full animate-pulse">
            {Array.from({length: 144}).map((_, i) => (
              <div key={i} className="bg-gradient-to-br from-green-500 to-orange-500 rounded-full" style={{
                animationDelay: `${i * 0.1}s`,
                animation: 'pulse 3s infinite'
              }}></div>
            ))}
          </div>
        </div>
      </div>

      <div className={`w-full max-w-md relative z-10 transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        {/* Logo dan Header dengan Animasi */}
        <div className="text-center mb-8">
          <div className="mb-6 group">
            <div className={`w-28 h-28 mx-auto bg-white rounded-3xl shadow-2xl flex items-center justify-center transform transition-all duration-700 hover:scale-110 hover:rotate-3 hover:shadow-3xl ${mounted ? 'scale-100 rotate-0' : 'scale-75 -rotate-12'}`}>
              <div className="relative">
                <img 
                  src="\src\assets\image.png" 
                  alt="Logo BPS Kota Malang" 
                  className="w-20 h-20 object-contain transition-all duration-300 group-hover:scale-110" 
                />
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          </div>
          
          <div className={`transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`} style={{transitionDelay: '300ms'}}>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-orange-600 bg-clip-text text-transparent mb-2 hover:scale-105 transition-transform duration-300">
              BPS KOTA MALANG
            </h1>
            <p className="text-gray-600 text-lg animate-fade-in">Sistem Manajemen Data & Pelabelan</p>
          </div>
        </div>

        {/* Form Login dengan Glassmorphism */}
        <div className={`backdrop-blur-2xl bg-white/80 border border-white/50 rounded-3xl shadow-2xl p-8 transform transition-all duration-1000 hover:shadow-3xl hover:bg-white/90 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{transitionDelay: '600ms'}}>
          {error && (
            <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 group-focus-within:text-green-600 transition-colors duration-200">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-green-500">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-green-500" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200/50 rounded-2xl bg-white/50 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 focus:bg-white/80 transition-all duration-300 hover:shadow-lg hover:bg-white/70"
                  placeholder="Masukkan username"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 group-focus-within:text-green-600 transition-colors duration-200">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-green-500">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-green-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 border border-gray-200/50 rounded-2xl bg-white/50 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 focus:bg-white/80 transition-all duration-300 hover:shadow-lg hover:bg-white/70"
                  placeholder="Masukkan password"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 via-emerald-600 to-orange-500 text-white py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl focus:ring-4 focus:ring-green-500/50 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 transform hover:scale-105 hover:-translate-y-1 active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="animate-pulse">Memproses...</span>
                </>
              ) : (
                <>
                  <span className="relative">
                    Masuk
                    <div className="absolute inset-0 bg-white/20 rounded-lg blur-sm opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200/50">
            <p className="text-center text-sm text-gray-600 mb-4 animate-fade-in">
              Belum memiliki akun? Hubungi administrator.
            </p>
            
          </div>
        </div>

        {/* Footer dengan Animasi */}
        <div className={`text-center mt-8 transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`} style={{transitionDelay: '900ms'}}>
          <p className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200">
            © 2024 BPS Kota Malang. All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;