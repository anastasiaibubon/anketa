import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateToken } from '@/lib/utils';
import { Question, cloneDefaultQuestions, generateQuestionId } from '@/lib/questions';
import { NotebookLayout } from '@/components/layout/NotebookLayout';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>(cloneDefaultQuestions());

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions((qs) => (qs.length > 1 ? qs.filter((q) => q.id !== id) : qs));
  };

  const addQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      { id: generateQuestionId(), label: '', type: 'text' },
    ]);
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    setQuestions((qs) => {
      const target = index + dir;
      if (target < 0 || target >= qs.length) return qs;
      const next = [...qs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleCreate = async () => {
    // The builder only authors plain text questions now (no long-answer or
    // multiple-choice picker), so every question is normalized to `text`
    // with no leftover `options`, regardless of what it started as.
    // Firestore rejects `undefined` field values (even nested in an array),
    // so `required` must always be a real boolean, never left unset.
    const cleaned = questions
      .map((q) => ({ id: q.id, label: q.label.trim(), type: 'text' as const, required: q.required === true }))
      .filter((q) => q.label.length > 0);

    if (cleaned.length === 0) {
      setError('Додай хоча б одне питання перед створенням.');
      return;
    }

    setIsCreating(true);
    setError(null);
    const roomId = generateToken(8);
    const viewKey = generateToken(16);

    try {
      const createdAt = Date.now();
      // The view key lives on the room doc itself: the deployed Firestore
      // rules deny ALL access (read and write) to a separate `viewKeys`
      // collection, so a two-write batch through it can never succeed. The
      // `rooms` collection is already world-readable and world-listable
      // under these rules, so keeping the key off it buys no real
      // protection anyway — the results page below still requires the
      // caller to already know this exact key before showing responses.
      await setDoc(doc(db, 'rooms', roomId), { createdAt, questions: cleaned, viewKey });
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
      <p className="text-[17px] text-pencil m-0 mb-5">
        Напиши свої питання (або залиш ці) й розішли друзям — відповіді прийдуть тобі.
      </p>

      <div className="flex flex-col gap-3.5" data-testid="editor-questions">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white border-2 border-dashed border-pencil rounded-lg p-3" data-testid={`question-row-${i}`}>
            <div className="flex items-start gap-2">
              <span className="font-space text-[13px] text-pink mt-2.5">{String(i + 1).padStart(2, '0')}</span>
              <input
                type="text"
                value={q.label}
                onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                placeholder="Текст питання"
                className="dashed-input flex-1"
                data-testid={`input-question-label-${i}`}
              />
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                type="button"
                onClick={() => moveQuestion(i, -1)}
                disabled={i === 0}
                className="font-space text-xs py-1 px-2 rounded-md border-2 border-ink bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-default"
                data-testid={`button-move-up-${i}`}
              >
                ⬆️
              </button>
              <button
                type="button"
                onClick={() => moveQuestion(i, 1)}
                disabled={i === questions.length - 1}
                className="font-space text-xs py-1 px-2 rounded-md border-2 border-ink bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-default"
                data-testid={`button-move-down-${i}`}
              >
                ⬇️
              </button>
              <button
                type="button"
                onClick={() => removeQuestion(q.id)}
                disabled={questions.length <= 1}
                className="font-space text-xs py-1 px-2 rounded-md border-2 border-pink text-pink bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-default ml-auto"
                data-testid={`button-remove-question-${i}`}
              >
                🗑️ Видалити
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="font-space text-xs py-2 px-3 rounded-md border-2 border-dashed border-ink bg-transparent cursor-pointer mt-3.5 w-full"
        data-testid="button-add-question"
      >
        ➕ Додати питання
      </button>

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
