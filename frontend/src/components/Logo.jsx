export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 18V6l8-3 8 3v12l-8 3-8-3z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3v18M4 6l8 3 8-3M4 18l8-3 8 3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="font-display text-[15px] font-semibold tracking-tight">Meridian</span>
    </div>
  );
}
