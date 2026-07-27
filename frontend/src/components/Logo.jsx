export default function Logo() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 w-full py-4">
      {/* Exact Logo Image */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        <img src="/la_logo.png" alt="LA Logo" className="w-full h-full object-contain rounded-full shadow-[0_0_25px_rgba(99,102,241,0.5)]" />
      </div>
      {/* AI-LUMA Text */}
      <h1 className="text-[22px] font-semibold text-slate-100 tracking-wider text-glow" style={{ fontFamily: 'Cinzel, serif' }}>
        AI-LUMA
      </h1>
    </div>
  );
}
