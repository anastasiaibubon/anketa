import React, { useState } from 'react';
import { useParams } from 'wouter';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotebookLayout } from '@/components/layout/NotebookLayout';

export default function FillPage() {
  const params = useParams();
  const roomId = params.roomId!;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [petOption, setPetOption] = useState<string>('');
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
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
      ts: Date.now()
    };
    
    try {
      await addDoc(collection(db, 'rooms', roomId, 'responses'), data);
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Ой, не вдалося відправити. Спробуй ще раз.');
      setIsSubmitting(false);
    }
  };
  
  if (isSubmitted) {
    return (
      <NotebookLayout>
        <div className="text-center py-10 px-2 animate-in zoom-in duration-500">
          <div className="font-caveat text-[40px] text-pink mb-4">Дякую! 🎉</div>
          <p className="text-lg">Твоя відповідь уже летить до того, хто скинув анкету.</p>
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
        <QuestionLabel num="01" text="Як тебе звати?" />
        <input type="text" name="name" required className="dashed-input" data-testid="input-name" />
        
        <QuestionLabel num="02" text="Улюблений колір" />
        <input type="text" name="color" className="dashed-input" />
        
        <QuestionLabel num="03" text="Улюблена їжа" />
        <input type="text" name="food" className="dashed-input" />
        
        <QuestionLabel num="04" text="Улюблена пісня чи гурт" />
        <input type="text" name="song" className="dashed-input" />
        
        <QuestionLabel num="05" text="Улюблений фільм або мультик" />
        <input type="text" name="movie" className="dashed-input" />
        
        <QuestionLabel num="06" text="Ким мріяв(-ла) стати в дитинстві?" />
        <input type="text" name="dream" className="dashed-input" />
        
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
        <textarea name="memory" rows={3} className="dashed-input"></textarea>
        
        <QuestionLabel num="09" text="Твоя найкраща риса характеру" />
        <input type="text" name="trait" className="dashed-input" />
        
        <QuestionLabel num="10" text="Побажання для мене 💛" />
        <textarea name="wish" rows={3} className="dashed-input"></textarea>
        
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
