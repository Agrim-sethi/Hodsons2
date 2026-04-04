import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
}

export const Icon: React.FC<IconProps> = ({ name, className = "", filled = false }) => {
  return (
    <span 
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}
    >
      {name}
    </span>
  );
};