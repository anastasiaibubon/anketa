import React, { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotebookLayout } from '@/components/layout/NotebookLayout';
import { Question, resolveQuestions } from '@/lib/questions';

export default function FillPage() {
  const params = useParams();
  const roomId = params.roomId!;

  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await addDoc(collection(db, 'rooms', roomId, 'responses'), {
        answers: cleanedAnswers,
        ts: Date.now(),
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Ой, не вдалося відправити. Спробуй ще раз.');
      setIsSubmitting(false);
    }
  };

  if (loadingRoom) {
    return (
      <NotebookLayout>
        <p className="text-[17px] text-pencil">Завантажую анкету...</p>
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

  if (isSubmitted) {
    return (
      <NotebookLayout>
        <div className="text-center py-10 px-2 animate-in zoom-in duration-500">
          <div className="font-caveat text-[40px] text-pink mb-4">Дякую! 🎉</div>
          <p className="text-lg mb-4">Твоя відповідь уже летить до того, хто скинув анкету.</p>
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
      <h1 className="text-[42px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">Анкета для друзів 💌</h1>
      <p className="text-[17px] text-pencil m-0 mb-5">Заповни чесно, як у дитинстві!</p>

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
          {isSubmitting ? 'Відправляю...' : 'Відправити ✉️'}
        </button>
      </form>
    </NotebookLayout>
  );
}
