import React from 'react';

interface AgentProps {
  message: string;
  isSpeaking: boolean;
}

export const Agent: React.FC<AgentProps> = ({ message, isSpeaking }) => {
  return (
    <div className="flex flex-col items-center gap-8 mb-20">
      <div className="relative w-48 h-48 md:w-56 md:h-56">
        <div className={`absolute inset-0 rounded-full bg-cyan-400 blur-3xl transition-all duration-1000 ${isSpeaking ? 'opacity-100 scale-125' : 'opacity-50'}`}></div>
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-2xl flex items-center justify-center">
          <div className="w-2/3 h-2/3 rounded-full bg-white/10 backdrop-blur-md">
            <div className="w-1/2 h-1/2 rounded-full bg-white/20 absolute top-1/4 left-1/4 animate-blink"></div>
          </div>
        </div>
      </div>
      <div className="relative max-w-2xl text-center p-6 bg-gray-900/80 rounded-xl shadow-lg backdrop-blur-md border border-cyan-400/30">
        <p className="text-2xl md:text-3xl text-slate-100 font-medium">{message}</p>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-12 border-l-transparent border-r-12 border-r-transparent border-b-12 border-gray-900/80" style={{borderLeftWidth: '12px', borderRightWidth: '12px', borderBottomWidth: '12px'}}></div>
      </div>
    </div>
  );
};