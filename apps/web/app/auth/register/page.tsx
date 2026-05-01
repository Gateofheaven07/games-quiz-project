'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!formData.username || !formData.email || !formData.password) {
      setLocalError('Harap isi semua kolom');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Kata sandi tidak cocok');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Kata sandi minimal 6 karakter');
      return;
    }

    const result = await register(formData.username, formData.email, formData.password);
    if (result.success) {
      router.push('/auth/login');
    } else {
      setLocalError(result.error || 'Pendaftaran gagal');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-20 bg-[#090f12] text-[#dde3e7] font-sans selection:bg-[#cf5cff]/30">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#cf5cff]/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00d1ff]/10 blur-[120px] rounded-full"></div>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAlRcgUxa3ii_NiSemyYTATZdxkY8hVsG8tYrDMI-5f4i-OSMvdwmNeArzA8YTnYMiHAcRoU2AvtawIzxNKCVUykPvDuvxZlEzvzqBEu3YbgZb0Xiueilikt8q-Bjvoa0Iet5LbSrzPITyl4YVx0VqD95aQbJKyqLOAtUUnYhhhAGoUGwI-U3rr4VXVCiM4BFSepr9RGcf73oqEyvQoaDUFeroqwbm36JiIdqgdB4dP-gX7GjAYLw1C-j09glY27HGwFHqSp7TTghY')" }}></div>
      
      {/* Main Content Wrapper */}
      <div className="relative z-10 w-full max-w-[1100px] grid md:grid-cols-2 gap-12 items-center">
        {/* Branding/Value Prop Section */}
        <div className="hidden md:flex flex-col space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-[#cf5cff] to-[#00d1ff] rounded-xl flex items-center justify-center neon-glow-hover icon-box">
              <span className="material-symbols-outlined text-[#0e1417] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
            </div>
            <span className="font-bold text-4xl text-[#ecb2ff] tracking-tighter italic">QuizBattle</span>
          </div>
          <h1 className="font-bold text-5xl text-[#dde3e7] leading-tight">
            JADI SEORANG <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#cf5cff] to-[#00d1ff]">OPERATOR.</span>
          </h1>
          <p className="text-lg text-[#bbc9cf] max-w-md">
            Inisialisasi profil Anda untuk bergabung dalam pertukaran pengetahuan taktis. Tingkatkan peringkat, kuasai leaderboard, dan buktikan keunggulan kognitif Anda.
          </p>
          <div className="pt-12 grid grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-xl">
              <div className="text-[#a4e6ff] font-bold text-xs uppercase tracking-widest mb-1">REKRUTAN BARU</div>
              <div className="font-semibold text-2xl">450+ Hari Ini</div>
            </div>
            <div className="glass-panel p-6 rounded-xl">
              <div className="text-[#ecb2ff] font-bold text-xs uppercase tracking-widest mb-1">PERINGKAT GLOBAL</div>
              <div className="font-semibold text-2xl">Menantimu</div>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="w-full">
          <div className="glass-panel p-10 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Subtle Header for Mobile */}
            <div className="md:hidden flex flex-col items-center mb-12">
              <span className="font-bold text-3xl text-[#ecb2ff] tracking-tighter italic mb-2">QuizBattle</span>
              <h2 className="font-semibold text-2xl text-[#dde3e7]">Pendaftaran Operator</h2>
            </div>
            <div className="mb-12 hidden md:block">
              <h2 className="font-bold text-3xl text-[#dde3e7]">Pendaftaran Operator</h2>
              <p className="text-[#bbc9cf]">Inisialisasi profil baru Anda untuk masuk ke pertempuran.</p>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="font-bold text-xs tracking-widest text-[#bbc9cf] ml-1">CALLSIGN (USERNAME)</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#859399] group-focus-within:text-[#cf5cff] transition-colors icon-box">
                    <span className="material-symbols-outlined text-xl">badge</span>
                  </div>
                  <input 
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-[#1a2123]/50 border border-[#3c494e] rounded-lg py-4 pl-14 pr-6 text-[#dde3e7] focus:outline-none focus:border-[#cf5cff] focus:ring-1 focus:ring-[#cf5cff]/30 transition-all placeholder:text-[#859399]/50" 
                    placeholder="Ghost007" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs tracking-widest text-[#bbc9cf] ml-1">IDENTIFIKASI (EMAIL)</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#859399] group-focus-within:text-[#cf5cff] transition-colors icon-box">
                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                  </div>
                  <input 
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-[#1a2123]/50 border border-[#3c494e] rounded-lg py-4 pl-14 pr-6 text-[#dde3e7] focus:outline-none focus:border-[#cf5cff] focus:ring-1 focus:ring-[#cf5cff]/30 transition-all placeholder:text-[#859399]/50" 
                    placeholder="operator@battle.net" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="font-bold text-xs tracking-widest text-[#bbc9cf] ml-1">CIPHER (KATA SANDI)</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#859399] group-focus-within:text-[#cf5cff] transition-colors icon-box">
                      <span className="material-symbols-outlined text-xl">lock</span>
                    </div>
                    <input 
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-[#1a2123]/50 border border-[#3c494e] rounded-lg py-4 pl-12 pr-4 text-[#dde3e7] focus:outline-none focus:border-[#cf5cff] focus:ring-1 focus:ring-[#cf5cff]/30 transition-all placeholder:text-[#859399]/50" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-xs tracking-widest text-[#bbc9cf] ml-1">KONFIRMASI CIPHER</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#859399] group-focus-within:text-[#cf5cff] transition-colors icon-box">
                      <span className="material-symbols-outlined text-xl">lock_reset</span>
                    </div>
                    <input 
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full bg-[#1a2123]/50 border border-[#3c494e] rounded-lg py-4 pl-12 pr-4 text-[#dde3e7] focus:outline-none focus:border-[#cf5cff] focus:ring-1 focus:ring-[#cf5cff]/30 transition-all placeholder:text-[#859399]/50" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>
              </div>

              {(localError || error) && (
                <div className="bg-[#93000a]/30 border border-[#93000a] rounded p-3">
                  <p className="text-[#ffb4ab] text-sm">{localError || error}</p>
                </div>
              )}
              
              <div className="pt-4 space-y-3">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#cf5cff] to-[#00d1ff] py-5 rounded-lg font-bold text-xs tracking-widest text-[#0e1417] uppercase neon-glow-hover active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <span>{isLoading ? 'MENGINISIALISASI...' : 'BUAT PROFIL OPERATOR'}</span>
                  <span className="material-symbols-outlined text-xl">person_add</span>
                </button>
                <Link href="/auth/login" className="block text-center w-full border border-[#cf5cff]/30 hover:bg-[#cf5cff]/10 py-6 rounded-lg font-bold text-xs tracking-widest text-[#ecb2ff] transition-all uppercase">
                  KEMBALI KE LOGIN
                </Link>
              </div>
            </form>

            {/* Footer Decorative */}
            <div className="mt-16 flex justify-between items-center opacity-40">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#cf5cff] rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-[#cf5cff]/50 rounded-full"></div>
                <div className="w-2 h-2 bg-[#cf5cff]/20 rounded-full"></div>
              </div>
              <span className="font-bold text-[10px] tracking-widest uppercase text-[#ecb2ff]">Enkripsi Aktif: AES-256</span>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-12">
            <Link href="#" className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#dde3e7] transition-colors uppercase">STATUS: AKTIF</Link>
            <Link href="#" className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#dde3e7] transition-colors uppercase">PROTOKOL PRIVASI</Link>
            <Link href="#" className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#dde3e7] transition-colors uppercase">PUSAT BANTUAN</Link>
          </div>
        </div>
      </div>
      
      {/* Decorative Floating Image - Contextual */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[1228px] -z-10 opacity-30 mix-blend-overlay">
        <img alt="Gaming Background" className="w-full h-full object-cover grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDm2ab-JNTLpOZak88g5wLazEoLWAttmzgS_vG6759XdCDWOk4QYl4pthfA1XpA8Vd1KEJonNVtmDKDGlkTXkRoKq0oQlmLi47z8HDHYAwR1r8z79MIQuY0-N4ud_Z1ApFQiOnI_sMZImqPjHnVFQahcflJVnM5trRTHhJ1BeY0GNbXjhddNf2f7-2JhJHVj9RGXFAjs6VvipGFohV63TUeRALVfxIQZpaqUYrmP0DheAEvR2tIUv5cHCNajiA7YuQEyKZKNytzuuQ" />
      </div>
    </div>
  );
}
