import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onAuthChange, signOut } from '@/lib/auth';
import { NotebookLayout } from '@/components/layout/NotebookLayout';
import { Question, resolveQuestions, getAnswerValue } from '@/lib/questions';
import type { User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';

interface RoomSummary {
  id: string;
  createdAt: number;
  questions?: Question[];
}

interface ResponseData {
  id: string;
  answers?: Record<string, string>;
  ts: number;
  editKey?: string;
  [legacyField: string]: unknown;
}

// Firestore rules only allow creating responses, not updating them, so a
// responder "editing" their answer actually creates a new document sharing
// the same editKey. Keep only the newest document per editKey (or per doc
// id, for older responses saved before editKey existed) so the creator only
// ever sees each friend's latest version.
function dedupeToLatest(entries: ResponseData[]): ResponseData[] {
  const latestByKey = new Map<string, ResponseData>();
  for (const entry of entries) {
    const key = entry.editKey || entry.id;
    const existing = latestByKey.get(key);
    if (!existing || entry.ts > existing.ts) latestByKey.set(key, entry);
  }
  return Array.from(latestByKey.values());
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [responsesByRoom, setResponsesByRoom] = useState<Record<string, ResponseData[]>>({});
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesError, setResponsesError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

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
          where('ownerUid', '==', user.uid),
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

  // Only one room's responses are subscribed to at a time — opening another
  // (or leaving the page) tears down the previous listener first.
  useEffect(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    if (!expandedRoomId) return;

    setResponsesLoading(true);
    setResponsesError(null);
    unsubscribeRef.current = onSnapshot(
      collection(db, 'rooms', expandedRoomId, 'responses'),
      (snap) => {
        const entries: ResponseData[] = [];
        snap.forEach((d) => entries.push({ id: d.id, ...(d.data() as Omit<ResponseData, 'id'>) } as ResponseData));
        const deduped = dedupeToLatest(entries);
        deduped.sort((a, b) => b.ts - a.ts);
        setResponsesByRoom((prev) => ({ ...prev, [expandedRoomId]: deduped }));
        setResponsesLoading(false);
      },
      (err) => {
        console.error(err);
        setResponsesError('Не вдалося завантажити відповіді.');
        setResponsesLoading(false);
      }
    );

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [expandedRoomId]);

  const toggleRoom = (roomId: string) => {
    setExpandedRoomId((current) => (current === roomId ? null : roomId));
  };

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
          {rooms.map((room, i) => {
            const isExpanded = expandedRoomId === room.id;
            const responses = responsesByRoom[room.id] ?? [];
            const questions = resolveQuestions(room.questions);
            const headerQuestion = questions[0];
            const detailQuestions = questions.slice(1);

            return (
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
                  <button
                    type="button"
                    onClick={() => toggleRoom(room.id)}
                    className="font-space text-xs py-1.5 px-3 rounded-md border-2 border-ink bg-yellow cursor-pointer"
                    data-testid={`button-toggle-results-${i}`}
                  >
                    {isExpanded ? 'Сховати відповіді' : '📬 Переглянути відповіді'}
                  </button>
                  <a
                    href={`${baseUrl}/fill/${room.id}`}
                    className="font-space text-xs py-1.5 px-3 rounded-md border-2 border-ink bg-transparent cursor-pointer no-underline text-ink"
                    data-testid={`link-fill-${i}`}
                  >
                    👯 Посилання для друзів
                  </a>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t-2 border-dashed border-pencil">
                    {responsesLoading && responses.length === 0 && (
                      <p className="font-space text-[13px] text-pencil" data-testid={`text-responses-loading-${i}`}>
                        Завантажую відповіді...
                      </p>
                    )}
                    {responsesError && (
                      <p className="font-space text-[13px] text-pink" data-testid={`text-responses-error-${i}`}>
                        {responsesError}
                      </p>
                    )}
                    {!responsesLoading && !responsesError && responses.length === 0 && (
                      <p className="font-space text-[13px] text-pencil" data-testid={`text-no-responses-${i}`}>
                        Ще ніхто не відповів 🙈
                      </p>
                    )}
                    {responses.length > 0 && (
                      <div className="flex flex-col gap-3" data-testid={`list-responses-${i}`}>
                        {responses.map((r) => {
                          const headerValue = headerQuestion ? getAnswerValue(r, headerQuestion) : '';
                          return (
                            <div key={r.id} className="bg-[#FFF9EE] border-2 border-dashed border-pencil rounded-lg p-2.5">
                              <div className="text-[17px] font-bold mb-1.5">{headerValue || 'Анонім'}</div>
                              {detailQuestions.map((q) => {
                                const value = getAnswerValue(r, q);
                                if (!value) return null;
                                return (
                                  <div key={q.id} className="mt-1.5">
                                    <div className="font-space text-[11px] text-pencil">{q.label}</div>
                                    <div className="text-[15px] mt-0.5">{value}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
