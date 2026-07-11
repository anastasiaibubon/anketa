import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotebookLayout } from '@/components/layout/NotebookLayout';

interface ResponseData {
  id: string;
  name: string;
  color: string;
  food: string;
  song: string;
  movie: string;
  dream: string;
  pet: string;
  memory: string;
  trait: string;
  wish: string;
  ts: number;
  editKey?: string;
}

// Firestore rules here only allow creating responses, not updating them, so
// a responder "editing" their answer actually creates a new document that
// shares the same editKey. Keep only the newest document per editKey (or per
// doc id, for older responses saved before editKey existed) so the creator
// only ever sees each friend's latest version.
function dedupeToLatest(entries: ResponseData[]): ResponseData[] {
  const latestByKey = new Map<string, ResponseData>();
  for (const entry of entries) {
    const key = entry.editKey || entry.id;
    const existing = latestByKey.get(key);
    if (!existing || entry.ts > existing.ts) latestByKey.set(key, entry);
  }
  return Array.from(latestByKey.values());
}

const ORIGINAL_TITLE = 'Анкета для друзів 💌';

export default function ResultsPage() {
  const params = useParams();
  const roomId = params.roomId!;
  const viewKey = params.key!;
  const seenKey = `anketa_seen_${roomId}`;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [liveNewCount, setLiveNewCount] = useState(0);

  // Snapshot of "last seen" ts taken once, before any live updates arrive — used
  // to badge responses that arrived since the creator's previous visit.
  const lastSeenTsRef = useRef<number>(Number(localStorage.getItem(seenKey) || 0));
  const hasVisitedBeforeRef = useRef<boolean>(localStorage.getItem(seenKey) !== null);
  const isFirstSnapshotRef = useRef(true);
  // Tracks editKeys already seen this session so a friend re-submitting an
  // edited answer (a new document, since responses can't be updated in
  // place) doesn't get mistaken for a brand-new response arriving live.
  const knownKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      try {
        const keyDoc = await getDoc(doc(db, 'viewKeys', viewKey));
        if (!keyDoc.exists() || keyDoc.data().roomId !== roomId) {
          setError('Невірне посилання для перегляду 🔒\nПеревір, чи скопіював(-ла) його повністю.');
          setLoading(false);
          return;
        }

        unsubscribe = onSnapshot(
          collection(db, 'rooms', roomId, 'responses'),
          (snap) => {
            // Notify about responses that arrive live, after the page already loaded —
            // this is the "know right away" moment, while the creator has the tab open.
            if (!isFirstSnapshotRef.current) {
              snap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                  const added = change.doc.data() as ResponseData;
                  const dedupeKey = added.editKey || change.doc.id;
                  // Only a genuinely new person answering should count as a
                  // "new response" — a friend fixing a typo creates a new
                  // document under the same editKey, which we've seen before.
                  if (!knownKeysRef.current.has(dedupeKey)) {
                    setLiveNewCount((c) => c + 1);
                    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                      new Notification('Нова відповідь на анкету! 🎉', {
                        body: `${added.name} щойно відповів(-ла)`,
                      });
                    }
                  }
                }
              });
            }
            isFirstSnapshotRef.current = false;

            const entries: ResponseData[] = [];
            snap.forEach((d) => entries.push({ id: d.id, ...(d.data() as Omit<ResponseData, 'id'>) }));
            entries.forEach((entry) => knownKeysRef.current.add(entry.editKey || entry.id));
            const deduped = dedupeToLatest(entries);
            deduped.sort((a, b) => b.ts - a.ts);
            setResponses(deduped);
            setLoading(false);

            // Remember the newest response we've now displayed, so a future visit
            // only badges responses that are actually new since then.
            if (deduped.length > 0) {
              localStorage.setItem(seenKey, String(deduped[0].ts));
            }
          },
          (err) => {
            console.error(err);
            setError('Не вдалося завантажити відповіді.');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error(err);
        setError('Не вдалося завантажити відповіді.');
        setLoading(false);
      }
    }
    subscribe();
    return () => unsubscribe?.();
  }, [roomId, viewKey]);

  useEffect(() => {
    document.title = liveNewCount > 0 ? `(${liveNewCount}) ${ORIGINAL_TITLE}` : ORIGINAL_TITLE;
    return () => {
      document.title = ORIGINAL_TITLE;
    };
  }, [liveNewCount]);

  const handleEnableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  };

  if (loading) {
    return (
      <NotebookLayout>
        <p className="text-[17px] text-pencil">Перевіряю доступ...</p>
      </NotebookLayout>
    );
  }

  if (error) {
    return (
      <NotebookLayout>
        <div className="text-center py-10 px-2 text-pink text-lg whitespace-pre-line">
          {error}
        </div>
      </NotebookLayout>
    );
  }

  const AnswerRow = ({ label, value }: { label: string; value: string }) => {
    if (!value) return null;
    return (
      <div className="mt-2.5">
        <div className="font-space text-[11px] text-pencil">{label}</div>
        <div className="text-[17px] mt-0.5">{value}</div>
      </div>
    );
  };

  const newSinceLastVisit = hasVisitedBeforeRef.current
    ? responses.filter((r) => r.ts > lastSeenTsRef.current).length
    : 0;

  return (
    <NotebookLayout hideStamp>
      <h1 className="text-[42px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">Відповіді друзів 📬</h1>

      {newSinceLastVisit > 0 && (
        <div className="bg-[#FFF3E0] border-l-4 border-yellow px-3.5 py-2.5 text-[15px] rounded mb-4 leading-snug" data-testid="banner-new-responses">
          ✨ {newSinceLastVisit} {newSinceLastVisit === 1 ? 'нова відповідь' : 'нових відповідей'} з твого останнього візиту!
        </div>
      )}

      {liveNewCount > 0 && (
        <div className="bg-[#FFF3E0] border-l-4 border-yellow px-3.5 py-2.5 text-[15px] rounded mb-4 leading-snug" data-testid="banner-live-new">
          🔔 Щойно з'явилось {liveNewCount} {liveNewCount === 1 ? 'нова відповідь' : 'нових відповідей'}!
        </div>
      )}

      {notifPermission === 'default' && (
        <button
          type="button"
          onClick={handleEnableNotifications}
          className="font-space text-xs py-1.5 px-3 rounded-md border-2 border-ink bg-yellow cursor-pointer mb-4"
          data-testid="button-enable-notifications"
        >
          🔔 Сповіщати миттєво, поки ця сторінка відкрита
        </button>
      )}
      {notifPermission === 'granted' && (
        <p className="font-space text-[11px] text-pencil mb-4" data-testid="text-notifications-enabled">
          🔔 Сповіщення увімкнено — поки ця сторінка відкрита в браузері, ти миттєво дізнаєшся про нові відповіді.
        </p>
      )}
      
      {responses.length === 0 ? (
        <>
          <p className="text-[17px] text-pencil m-0 mb-5">Поки що тиша...</p>
          <div className="text-center text-pencil text-lg py-10 px-2">
            Ще ніхто не відповів 🙈<br/>Кидай посилання друзям!
          </div>
        </>
      ) : (
        <>
          <p className="text-[17px] text-pencil m-0 mb-5">
            {responses.length} {responses.length === 1 ? 'відповідь' : responses.length % 10 >= 2 && responses.length % 10 <= 4 && (responses.length % 100 < 10 || responses.length % 100 >= 20) ? 'відповіді' : 'відповідей'}
          </p>
          <div className="flex flex-col gap-4">
            {responses.map((r, i) => {
              const tilt = (i % 2 === 0 ? -1 : 1) * (1 + (i % 3));
              const isNew = hasVisitedBeforeRef.current && r.ts > lastSeenTsRef.current;
              return (
                <div 
                  key={r.id} 
                  className="postcard animate-in fade-in zoom-in-95 duration-500 fill-mode-both relative"
                  style={{ 
                    transform: `rotate(${tilt}deg)`,
                    animationDelay: `${i * 100}ms`
                  }}
                >
                  {isNew && (
                    <span className="absolute -top-2 -right-2 bg-pink text-white font-space text-[10px] py-0.5 px-2 rounded-full rotate-6" data-testid="badge-new-response">
                      Нове ✨
                    </span>
                  )}
                  <h3 className="text-[28px] m-0 mb-2.5 leading-none">{r.name}</h3>
                  <AnswerRow label="Колір" value={r.color} />
                  <AnswerRow label="Їжа" value={r.food} />
                  <AnswerRow label="Пісня/гурт" value={r.song} />
                  <AnswerRow label="Фільм/мультик" value={r.movie} />
                  <AnswerRow label="Мрія дитинства" value={r.dream} />
                  <AnswerRow label="Кіт чи собака" value={r.pet} />
                  <AnswerRow label="Спогад" value={r.memory} />
                  <AnswerRow label="Риса характеру" value={r.trait} />
                  <AnswerRow label="Побажання" value={r.wish} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </NotebookLayout>
  );
}
