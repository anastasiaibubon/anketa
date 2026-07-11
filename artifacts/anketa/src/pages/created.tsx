import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { NotebookLayout } from '@/components/layout/NotebookLayout';

export default function CreatedPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  
  const roomId = params.roomId!;
  const viewKey = params.key!;
  
  const [copiedFill, setCopiedFill] = useState(false);
  const [copiedView, setCopiedView] = useState(false);
  
  const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
  const fillLink = `${baseUrl}/fill/${roomId}`;
  const viewLink = `${baseUrl}/results/${roomId}/${viewKey}`;

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <NotebookLayout hideStamp>
      <h1 className="text-[42px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">Готово! 🎉</h1>
      <p className="text-[17px] text-pencil m-0 mb-5">Ось два посилання. Не переплутай, кому яке давати.</p>
      
      <div className="bg-white border-2 border-dashed border-pencil rounded-lg p-3 my-2.5 break-all font-space text-xs relative">
        <span className="font-patrick text-base mb-1.5 block">👯 Для друзів (щоб заповнювали):</span>
        {fillLink}
        <br/>
        <button 
          onClick={() => handleCopy(fillLink, setCopiedFill)}
          className="mt-2 font-space text-xs py-1.5 px-3 rounded-md border-2 border-ink bg-yellow cursor-pointer"
        >
          {copiedFill ? 'Скопійовано ✓' : 'Скопіювати'}
        </button>
      </div>
      
      <div className="bg-[#FFF3E0] border-l-4 border-yellow px-3.5 py-2.5 text-[15px] rounded my-4 leading-snug">
        ⚠️ Друге посилання — тільки для тебе. Збережи його собі (нотатки, закладка) — це єдиний спосіб потім побачити відповіді.
      </div>
      
      <div className="bg-white border-2 border-dashed border-pencil rounded-lg p-3 my-2.5 break-all font-space text-xs relative">
        <span className="font-patrick text-base mb-1.5 block">🔒 Для тебе (перегляд відповідей):</span>
        {viewLink}
        <br/>
        <button 
          onClick={() => handleCopy(viewLink, setCopiedView)}
          className="mt-2 font-space text-xs py-1.5 px-3 rounded-md border-2 border-ink bg-yellow cursor-pointer"
        >
          {copiedView ? 'Скопійовано ✓' : 'Скопіювати'}
        </button>
      </div>
      
      <button 
        onClick={() => setLocation(`/results/${roomId}/${viewKey}`)}
        className="action-btn secondary"
      >
        Перейти до перегляду зараз →
      </button>
    </NotebookLayout>
  );
}
