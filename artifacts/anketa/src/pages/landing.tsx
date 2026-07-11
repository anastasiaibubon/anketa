import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateToken } from '@/lib/utils';
import { NotebookLayout } from '@/components/layout/NotebookLayout';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    const roomId = generateToken(8);
    const viewKey = generateToken(16);
    
    try {
      const createdAt = Date.now();
      const batch = writeBatch(db);
      // The room doc holds no secret — it's reachable via the public "fill" link,
      // so it must not leak the private view key to anyone who only has that link.
      batch.set(doc(db, 'rooms', roomId), { createdAt });
      // The view key maps to its room in a separate collection keyed by the
      // high-entropy secret itself, so there is no path from roomId -> viewKey.
      batch.set(doc(db, 'viewKeys', viewKey), { roomId, createdAt });
      await batch.commit();
      setLocation(`/created/${roomId}/${viewKey}`);
    } catch (err) {
      console.error(err);
      setIsCreating(false);
      setError('Не вдалося створити анкету. Спробуй ще раз.');
    }
  };

  return (
    <NotebookLayout>
      <h1 className="text-[42px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">Анкета для друзів 💌</h1>
      <p className="text-[17px] text-pencil m-0 mb-5">Створи свою анкету й розішли друзям — відповіді прийдуть тобі.</p>
      
      <button 
        onClick={handleCreate}
        disabled={isCreating}
        className="action-btn"
        data-testid="button-create"
      >
        {isCreating ? 'Створюю...' : 'Створити свою анкету 🆕'}
      </button>

      {error && (
        <p className="font-space text-[13px] text-pink text-center mt-3" data-testid="text-create-error">
          {error}
        </p>
      )}
      
      <p className="font-space text-[11px] text-pencil text-center mt-4">
        Кожна створена анкета — окрема, ізольована кімната. Твої друзі не побачать чужі відповіді, і навпаки.
      </p>
    </NotebookLayout>
  );
}
