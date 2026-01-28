interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-16 h-16 text-3xl',
  };

  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center shadow-lg relative overflow-hidden`}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-pink-600 animate-pulse opacity-75" />
      
      {/* Logo content */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <span className="font-bold text-white drop-shadow-lg">
          PB
        </span>
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-20 transform -skew-x-12 translate-x-full animate-shine" />
    </div>
  );
}
