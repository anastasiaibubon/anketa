import React, { useEffect, useState } from 'react';
import { useParams, useSearch } from 'wouter';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotebookLayout } from '@/components/layout/NotebookLayout';

interface ResponseData {
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

  const [checkingEdit, setCheckingEdit] = useState(isEditMode);
  const [editError, setEditError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<ResponseData | null>(null);
  const [savedEditLink, setSavedEditLink] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedLink, setSubmittedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [petOption, setPetOption] = useState<string>('');

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
          setPetOption(latest!.pet || '');
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
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const answers = {
      name: (formData.get('name') as string).trim() || 'Анонім',
      color: (formData.get('color') as string).trim(),
      food: (formData.get('food') as string).trim(),
      song: (formData.get('song') as string).trim(),
      movie: (formData.get('movie') as string).trim(),
      dream: (formData.get('dream') as string).trim(),
      pet: petOption,
      memory: (formData.get('memory') as string).trim(),
      trait: (formData.get('trait') as string).trim(),
      wish: (formData.get('wish') as string).trim(),
    };

    try {
      // Both a fresh submission and an edit are a `create` — edits are stored
      // as a new document sharing the same editKey (Firestore rules here
      // don't allow updating existing responses), and readers always resolve
      // to the newest document for a given editKey.
      const editKey = isEditMode && editKeyParam ? editKeyParam : crypto.randomUUID();
      await addDoc(collection(db, 'rooms', roomId, 'responses'), {
        ...answers,
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

  if (checkingEdit) {
    return (
      <NotebookLayout>
        <p className="text-[17px] text-pencil">Завантажую твою відповідь...</p>
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
        <QuestionLabel num="01" text="Як тебе звати?" />
        <input type="text" name="name" required defaultValue={initialData?.name} className="dashed-input" data-testid="input-name" />
        
        <QuestionLabel num="02" text="Улюблений колір" />
        <input type="text" name="color" defaultValue={initialData?.color} className="dashed-input" />
        
        <QuestionLabel num="03" text="Улюблена їжа" />
        <input type="text" name="food" defaultValue={initialData?.food} className="dashed-input" />
        
        <QuestionLabel num="04" text="Улюблена пісня чи гурт" />
        <input type="text" name="song" defaultValue={initialData?.song} className="dashed-input" />
        
        <QuestionLabel num="05" text="Улюблений фільм або мультик" />
        <input type="text" name="movie" defaultValue={initialData?.movie} className="dashed-input" />
        
        <QuestionLabel num="06" text="Ким мріяв(-ла) стати в дитинстві?" />
        <input type="text" name="dream" defaultValue={initialData?.dream} className="dashed-input" />
        
        <QuestionLabel num="07" text="Кіт чи собака?" />
        <div className="flex gap-2.5 flex-wrap mt-1">
          {['Кіт', 'Собака', 'Обидва'].map(opt => (
            <button
              key={opt}
              type="button"
              className={`sticker-btn ${petOption === opt ? 'selected' : ''}`}
              onClick={() => setPetOption(opt)}
            >
              {opt === 'Кіт' ? '🐱 ' : opt === 'Собака' ? '🐶 ' : '🐾 '}
              {opt}
            </button>
          ))}
        </div>
        
        <QuestionLabel num="08" text="Найкращий спогад з дитинства" />
        <textarea name="memory" rows={3} defaultValue={initialData?.memory} className="dashed-input"></textarea>
        
        <QuestionLabel num="09" text="Твоя найкраща риса характеру" />
        <input type="text" name="trait" defaultValue={initialData?.trait} className="dashed-input" />
        
        <QuestionLabel num="10" text="Побажання для мене 💛" />
        <textarea name="wish" rows={3} defaultValue={initialData?.wish} className="dashed-input"></textarea>
        
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
