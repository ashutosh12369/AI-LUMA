export default function Logo() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 w-full py-4">
      {/* Circle with LA */}
      <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-b from-indigo-500/20 to-purple-500/10 border border-indigo-400/30 shadow-[0_0_25px_rgba(99,102,241,0.3)]">
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]">
          <path d="M 25 80 L 50 20 L 60 45 L 45 45 M 50 20 L 75 80" fill="none" stroke="url(#logo-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 30 80 L 70 80" fill="none" stroke="url(#logo-grad)" strokeWidth="6" strokeLinecap="round" />
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* AI-LUMA Text */}
      <h1 className="text-[22px] font-semibold text-slate-100 tracking-wider text-glow" style={{ fontFamily: 'Cinzel, serif' }}>
        AI-LUMA
      </h1>
    </div>
  );
}
