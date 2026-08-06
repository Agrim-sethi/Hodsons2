import React from 'react';
import { useAppContext } from '../context/AppContext';

export const NotificationBanner: React.FC = () => {
  const { notifications, removeNotification } = useAppContext();

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none pt-6 px-4">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            pointer-events-auto
            flex items-center gap-3 px-8 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl border animate-fade-up
            ${notification.type === 'success' ? 'bg-accent-green/90 text-deep-charcoal border-accent-green' : ''}
            ${notification.type === 'error' ? 'bg-red-500/90 text-white border-red-400' : ''}
            ${notification.type === 'info' ? 'bg-accent-blue/90 text-deep-charcoal border-accent-blue' : ''}
          `}
          style={{ animationDuration: '0.4s' }}
        >
          <div className={`
             w-6 h-6 rounded-full flex items-center justify-center
             ${notification.type === 'success' ? 'bg-deep-charcoal/20' : 'bg-white/20'}
          `}>
             <span className="material-symbols-outlined text-base font-bold">
                {notification.type === 'success' ? 'check' : notification.type === 'error' ? 'priority_high' : 'info'}
            </span>
          </div>
          <span className="font-bold text-sm tracking-wide uppercase">{notification.message}</span>
          <button 
            onClick={() => removeNotification(notification.id)} 
            className="ml-4 opacity-50 hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};