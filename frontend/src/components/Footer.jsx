import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full flex items-center justify-between px-6 py-3 border-t border-white/[0.06] text-[11px] text-slate-500">
      <div className="flex gap-4">
        <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
        <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
      </div>
      <div>
        &copy; {new Date().getFullYear()} LUMA. All rights reserved.
      </div>
    </footer>
  );
}
