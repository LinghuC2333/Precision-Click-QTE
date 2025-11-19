import React from 'react';

interface RetroButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'danger';
}

export const RetroButton: React.FC<RetroButtonProps> = ({ onClick, children, className = '', variant = 'primary' }) => {
  const baseStyles = "relative px-8 py-3 font-bold uppercase transition-all duration-100 transform active:scale-95 group overflow-hidden border-2";
  
  const variants = {
    primary: "border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 shadow-[0_0_10px_rgba(0,243,255,0.3)] hover:shadow-[0_0_20px_rgba(0,243,255,0.6)]",
    danger: "border-red-500 text-red-500 hover:bg-red-500/10 shadow-[0_0_10px_rgba(255,0,60,0.3)] hover:shadow-[0_0_20px_rgba(255,0,60,0.6)]"
  };

  return (
    <button 
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {/* Glitch effect overlay */}
      <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
    </button>
  );
};