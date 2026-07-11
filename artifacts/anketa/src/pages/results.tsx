import React, { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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
}

export default function ResultsPage() {
  const params = useParams();
  const roomId = params.roomId!;
  const viewKey = params.key!;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);

  useEffect(() => {
    async function fetchResponses() {
      try {
        const keyDoc = await getDoc(doc(db, 'viewKeys', viewKey));
        if (!keyDoc.exists() || keyDoc.data().roomId !== roomId) {
          setError('Невірне посилання для перегляду 🔒\nПеревір, чи скопіював(-ла) його повністю.');
          setLoading(false);
          return;
        }

        const responsesSnap = await getDocs(collection(db, 'rooms', roomId, 'responses'));
        const entries: ResponseData[] = [];
        responsesSnap.forEach(d => {
          entries.push(d.data() as ResponseData);
        });
        
        entries.sort((a, b) => b.ts - a.ts);
        setResponses(entries);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Не вдалося завантажити відповіді.');
        setLoading(false);
      }
    }
    fetchResponses();
  }, [roomId, viewKey]);

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

  return (
    <NotebookLayout hideStamp>
      <h1 className="text-[42px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">Відповіді друзів 📬</h1>
      
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
              return (
                <div 
                  key={r.ts} 
                  className="postcard animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
                  style={{ 
                    transform: `rotate(${tilt}deg)`,
                    animationDelay: `${i * 100}ms`
                  }}
                >
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
