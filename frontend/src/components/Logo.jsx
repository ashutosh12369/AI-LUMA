// Logo component ek reusable UI element hai jo website ka brand logo aur naam show karta hai.
export default function Logo() {
  return (
    // Main wrapper container. Flexbox use karke content ko vertically (flex-col) arrange kiya gaya hai,
    // items center me hain aur unke beech me 3px ki spacing (gap-3) hai.
    <div className="flex flex-col items-center justify-center gap-3 w-full py-4">
      
      {/* Container for the logo image. Relative positioning taaki background glow/effects properly place ho sakein. */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Actual image tag. Image ka path /la_logo.png hai jo public folder me rakhi hoti hai.
            object-contain se image stretch nahi hoti. rounded-full isko circular shape deta hai.
            shadow classes ek premium neon/glow effect create karti hain. (Interview tip: Visual details UX ko better banate hain). */}
        <img 
          src="/la_logo.png" 
          alt="LA Logo" 
          className="w-full h-full object-contain rounded-full shadow-[0_0_25px_rgba(99,102,241,0.5)]" 
        />
      </div>
      
      {/* Brand name/Text. isme 'Cinzel' font family lagai hai ek premium/classic look ke liye.
          tracking-wider letter spacing increase karta hai, aur text-glow class custom CSS define hogi jo text ko chamkila (glowing) banati hai. */}
      <h1 
        className="text-[22px] font-semibold text-slate-100 tracking-wider text-glow" 
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        AI-LUMA
      </h1>
      
    </div>
  );
}