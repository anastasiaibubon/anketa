import React, { useEffect, useState } from 'react';
import { useParams, useSearch } from 'wouter';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotebookLayout } from '@/components/layout/NotebookLayout';
import { Question, resolveQuestions, getAnswerValue } from '@/lib/questions';

interface ResponseData {
  answers?: Record<string, string>;
  ts: number;
  editKey?: string;
  [legacyField: string]: unknown;
}

function editLinkStorageKey(roomId: string) {
  return `anketa_editlink_${roomId}`;
}

export default function FillPage() {
  const params = useParams();
  const roomId = params.roomId!;
  const search = useSearch();

  const searchParams = new URLSearchParams(search);
  const editKeyParam = searchParams.get('ek');
  const isEditMode = Boolean(editKeyParam);

  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [checkingEdit, setCheckingEdit] = useState(isEditMode);
  const [editError, setEditError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<ResponseData | null>(null);
  const [savedEditLink, setSavedEditLink] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedLink, setSubmittedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const setAnswer = (id: string, value: string) => {
    setAnswers((a) => ({ ...a, [id]: value }));
  };

  // Load the room's question set. The fill link only contains the (non-secret)
  // roomId, so this doc is publicly readable by design.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const roomSnap = await getDoc(doc(db, 'rooms', roomId));
        if (cancelled) return;
        if (!roomSnap.exists()) {
          setRoomError('Невірне посилання на анкету 🔒\nПеревір, чи скопіював(-ла) його повністю.');
        } else {
          setQuestions(resolveQuestions(roomSnap.data().questions as Question[] | undefined));
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setRoomError('Не вдалося завантажити анкету.');
      } finally {
        if (!cancelled) setLoadingRoom(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!isEditMode) {
      const stored = localStorage.getItem(editLinkStorageKey(roomId));
      if (stored) setSavedEditLink(stored);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Firestore rules for this app only allow creating responses, not
        // updating/deleting them — so an "edit" is really a newer response
        // sharing the same editKey. To load the latest version for prefill,
        // we look up every response tagged with this editKey and take the
        // most recent one; the results page dedupes the same way.
        const q = query(
          collection(db, 'rooms', roomId, 'responses'),
          where('editKey', '==', editKeyParam)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) {
          setEditError('Невірне посилання для редагування 🔒\nПеревір, чи скопіював(-ла) його повністю.');
        } else {
          let latest: ResponseData | null = null;
          snap.forEach((d) => {
            const data = d.data() as ResponseData;
            if (!latest || data.ts > latest.ts) latest = data;
          });
          setInitialData(latest);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setEditError('Не вдалося завантажити твою відповідь.');
      } finally {
        if (!cancelled) setCheckingEdit(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, roomId, editKeyParam]);

  // Once both the room's questions and (in edit mode) the prior answers are
  // loaded, seed the editable answers map for controlled inputs (choice
  // questions and textareas need this; plain text inputs use defaultValue).
  useEffect(() => {
    if (questions.length === 0) return;
    if (isEditMode && !initialData) return;
    const seeded: Record<string, string> = {};
    for (const q of questions) {
      seeded[q.id] = initialData ? getAnswerValue(initialData, q) : '';
    }
    setAnswers(seeded);
  }, [questions, initialData, isEditMode]);

  const buildLink = (editKey: string) => {
    const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
    return `${baseUrl}/fill/${roomId}?ek=${editKey}`;
  };

  const handleCopyLink = () => {
    if (!submittedLink) return;
    navigator.clipboard.writeText(submittedLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const requiredMissing = questions.find((q) => q.required && !(answers[q.id] || '').trim());
    if (requiredMissing) {
      setError(`Заповни, будь ласка: "${requiredMissing.label}"`);
      return;
    }

    setIsSubmitting(true);

    const cleanedAnswers: Record<string, string> = {};
    for (const q of questions) {
      cleanedAnswers[q.id] = (answers[q.id] || '').trim();
    }

    try {
      // Both a fresh submission and an edit are a `create` — edits are stored
      // as a new document sharing the same editKey (Firestore rules here
      // don't allow updating existing responses), and readers always resolve
      // to the newest document for a given editKey.
      const editKey = isEditMode && editKeyParam ? editKeyParam : crypto.randomUUID();
      await addDoc(collection(db, 'rooms', roomId, 'responses'), {
        answers: cleanedAnswers,
        ts: Date.now(),
        editKey,
      });
      const link = buildLink(editKey);
      localStorage.setItem(editLinkStorageKey(roomId), link);
      setSubmittedLink(link);
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Ой, не вдалося відправити. Спробуй ще раз.');
      setIsSubmitting(false);
    }
  };

  if (loadingRoom || checkingEdit) {
    return (
      <NotebookLayout>
        <p className="text-[17px] text-pencil">Завантажую{checkingEdit ? ' твою відповідь' : ' анкету'}...</p>
      </NotebookLayout>
    );
  }

  if (roomError) {
    return (
      <NotebookLayout>
        <div className="text-center py-10 px-2 text-pink text-lg whitespace-pre-line">
          {roomError}
        </div>
      </NotebookLayout>
    );
  }

  if (editError) {
    return (
      <NotebookLayout>
        <div className="text-center py-10 px-2 text-pink text-lg whitespace-pre-line">
          {editError}
        </div>
      </NotebookLayout>
    );
  }

  if (isSubmitted) {
    return (
      <NotebookLayout>
        <div className="text-center py-10 px-2 animate-in zoom-in duration-500">
          <div className="font-caveat text-[40px] text-pink mb-4">
            {isEditMode ? 'Оновлено! ✏️' : 'Дякую! 🎉'}
          </div>
          <p className="text-lg mb-4">
            {isEditMode
              ? 'Твою відповідь виправлено.'
              : 'Твоя відповідь уже летить до того, хто скинув анкету.'}
          </p>
          {submittedLink && (
            <div className="bg-white border-2 border-dashed border-pencil rounded-lg p-3 my-2.5 break-all font-space text-xs text-left">
              <span className="font-patrick text-base mb-1.5 block">
                ✏️ Хочеш виправити типо пізніше? Збережи це посилання:
              </span>
              {submittedLink}
              <br />
              <button
                type="button"
                onClick={handleCopyLink}
                className="mt-2 font-space text-xs py-1.5 px-3 rounded-md border-2 border-ink bg-yellow cursor-pointer"
                data-testid="button-copy-edit-link"
              >
                {copied ? 'Скопійовано ✓' : 'Скопіювати'}
              </button>
            </div>
          )}
        </div>
      </NotebookLayout>
    );
  }

  const QuestionLabel = ({ num, text }: { num: string; text: string }) => (
    <label className="block text-[19px] mt-[22px] mb-1.5">
      <span className="font-space text-[13px] text-pink mr-1.5">{num}</span>
      {text}
    </label>
  );

  return (
    <NotebookLayout hideStamp>
      <h1 className="text-[42px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">
        {isEditMode ? 'Виправити відповідь ✏️' : 'Анкета для друзів 💌'}
      </h1>
      <p className="text-[17px] text-pencil m-0 mb-5">
        {isEditMode ? 'Онови те, що хочеш змінити, і відправ ще раз.' : 'Заповни чесно, як у дитинстві!'}
      </p>

      {!isEditMode && savedEditLink && (
        <div className="bg-[#FFF3E0] border-l-4 border-yellow px-3.5 py-2.5 text-[15px] rounded mb-4 leading-snug" data-testid="banner-already-answered">
          Здається, ти вже відповідав(-ла) на цю анкету.{' '}
          <a href={savedEditLink} className="underline font-bold" data-testid="link-edit-existing">
            Виправити свою відповідь
          </a>
          {' '}замість нової.
        </div>
      )}

      {error && (
        <div className="text-center p-4 text-pink text-lg mb-4 bg-pink/10 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col">
        {questions.map((q, i) => {
          const num = String(i + 1).padStart(2, '0');
          const value = answers[q.id] ?? '';
          return (
            <div key={q.id}>
              <QuestionLabel num={num} text={q.label} />
              {q.type === 'text' && (
                <input
                  type="text"
                  required={q.required}
                  value={value}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="dashed-input"
                  data-testid={`input-question-${i}`}
                />
              )}
              {q.type === 'textarea' && (
                <textarea
                  rows={3}
                  required={q.required}
                  value={value}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="dashed-input"
                  data-testid={`input-question-${i}`}
                />
              )}
              {q.type === 'choice' && (
                <div className="flex gap-2.5 flex-wrap mt-1" data-testid={`input-question-${i}`}>
                  {(q.options || []).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`sticker-btn ${value === opt ? 'selected' : ''}`}
                      onClick={() => setAnswer(q.id, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={isSubmitting}
          className="action-btn"
          data-testid="button-submit"
        >
          {isSubmitting ? 'Відправляю...' : isEditMode ? 'Оновити ✏️' : 'Відправити ✉️'}
        </button>
      </form>
    </NotebookLayout>
  );
}
