import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onAuthChange, signOut } from '@/lib/auth';
import { NotebookLayout } from '@/components/layout/NotebookLayout';
import type { User } from 'firebase/auth';
import type { Question } from '@/lib/questions';

interface RoomSummary {
  id: string;
  createdAt: number;
  viewKey: string;
  questions?: Question[];
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      if (!u) setLocation('/login');
    });
    return unsubscribe;
  }, [setLocation]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, 'rooms'),
          where('createdBy', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const loaded: RoomSummary[] = [];
        snap.forEach((d) => {
          const data = d.data();
          loaded.push({
            id: d.id,
            createdAt: data.createdAt,
            viewKey: data.viewKey,
            questions: data.questions,
          });
        });
        setRooms(loaded);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError('Не вдалося завантажити твої анкети.');
      } finally {
        if (!cancelled) setLoadingRooms(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');

  const handleSignOut = async () => {
    await signOut();
    setLocation('/login');
  };

  if (user === undefined || (user && loadingRooms)) {
    return (
      <NotebookLayout>
        <p className="text-[17px] text-pencil">Завантажую твої анкети...</p>
      </NotebookLayout>
    );
  }

  return (
    <NotebookLayout hideStamp>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h1 className="text-[36px] font-bold m-0 -rotate-1 text-ink leading-none">Мої анкети 🗂️</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="font-space text-[11px] py-1 px-2 rounded-md border-2 border-ink bg-transparent cursor-pointer whitespace-nowrap"
          data-testid="button-sign-out"
        >
          Вийти
        </button>
      </div>
      <p className="text-[17px] text-pencil m-0 mb-5">{user?.email}</p>

      {error && (
        <p className="font-space text-[13px] text-pink text-center mb-4" data-testid="text-dashboard-error">
          {error}
        </p>
      )}

      {rooms.length === 0 ? (
        <div className="text-center text-pencil text-lg py-10 px-2">
          Тут поки порожньо 🙈
          <br />
          Створи свою першу анкету!
        </div>
      ) : (
        <div className="flex flex-col gap-3.5" data-testid="list-rooms">
          {rooms.map((room, i) => (
            <div
              key={room.id}
              className="bg-white border-2 border-dashed border-pencil rounded-lg p-3"
              data-testid={`room-card-${i}`}
            >
              <div className="font-space text-[11px] text-pencil mb-1">
                {new Date(room.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="text-[15px] mb-2.5">
                {(room.questions?.length ?? 0)} {room.questions?.length === 1 ? 'питання' : 'питань'}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`${baseUrl}/results/${room.id}/${room.viewKey}`}
                  className="font-space text-xs py-1.5 px-3 rounded-md border-2 border-ink bg-yellow cursor-pointer no-underline text-ink"
                  data-testid={`link-view-results-${i}`}
                >
                  📬 Переглянути відповіді
                </a>
                <a
                  href={`${baseUrl}/fill/${room.id}`}
                  className="font-space text-xs py-1.5 px-3 rounded-md border-2 border-ink bg-transparent cursor-pointer no-underline text-ink"
                  data-testid={`link-fill-${i}`}
                >
                  👯 Посилання для друзів
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setLocation('/')}
        className="action-btn secondary mt-4"
        data-testid="button-create-new"
      >
        ➕ Створити ще одну анкету
      </button>
    </NotebookLayout>
  );
}
