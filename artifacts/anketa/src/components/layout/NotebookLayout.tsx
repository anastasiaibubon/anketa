import React from 'react';

export function NotebookLayout({ children, hideStamp = false }: { children: React.ReactNode; hideStamp?: boolean }) {
  return (
    <div className="min-h-screen flex justify-center py-6 px-3 pb-16">
      <div className="w-full max-w-[520px] relative animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-paper rounded shadow-[0_12px_30px_rgba(44,62,92,0.25),0_2px_6px_rgba(44,62,92,0.15)] relative px-7 py-8 pl-14 notebook-lines min-h-[600px]">
          
          {/* Binder holes */}
          <div className="absolute left-[18px] top-10 bottom-10 w-[14px] flex flex-col justify-between">
            <span className="w-[14px] h-[14px] rounded-full bg-bg-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] block"></span>
            <span className="w-[14px] h-[14px] rounded-full bg-bg-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] block"></span>
            <span className="w-[14px] h-[14px] rounded-full bg-bg-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] block"></span>
            <span className="w-[14px] h-[14px] rounded-full bg-bg-green shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] block"></span>
          </div>
          
          {/* Margin line */}
          <div className="absolute left-[46px] top-0 bottom-0 w-[2px] bg-pink opacity-35"></div>
          
          {/* Stamp */}
          {!hideStamp && (
            <div className="absolute top-6 right-6 w-[74px] h-[74px] border-[3px] border-pink rounded-full flex items-center justify-center text-center font-space text-[10px] text-pink rotate-12 opacity-75 leading-tight pointer-events-none">
              ДРУЖБА<br/>НАЗАВЖДИ
            </div>
          )}
          
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
