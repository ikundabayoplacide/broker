import Link from 'next/link';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  href?: string;
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  className = '',
  type = 'button',
  disabled = false,
  href
}: ButtonProps) {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100';
  
  const variants = {
    primary: 'gradient-primary text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    outline: 'border-2 border-[#004F64] text-[#004F64] hover:gradient-primary hover:text-white'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const handleLogout = async () => {
    if (href === '/auth/logout') {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        sessionStorage.setItem('santech:logoutRedirect', 'true');
        window.location.href = '/';
      } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/';
      }
    } else if (onClick) {
      onClick();
    }
  };
  
  if (href && href !== '/auth/logout') {
    return (
      <Link
        href={href}
        className={`inline-block ${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'pointer-events-none' : ''}`}
      >
        {children}
      </Link>
    );
  }
  
  return (
    <button
      type={type}
      onClick={href === '/auth/logout' ? handleLogout : onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}