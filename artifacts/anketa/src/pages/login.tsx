import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { NotebookLayout } from '@/components/layout/NotebookLayout';
import { signInWithGoogle, onAuthChange } from '@/lib/auth';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If we're already signed in (e.g. this tab was left open), skip the button.
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) setLocation('/dashboard');
    });
    return unsubscribe;
  }, [setLocation]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
      setLocation('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Не вдалося увійти через Google. Спробуй ще раз.');
      setIsSigningIn(false);
    }
  };

  return (
    <NotebookLayout>
      <h1 className="text-[42px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">Вхід ✨</h1>
      <p className="text-[17px] text-pencil m-0 mb-5">
        Увійди через Google — так ти зможеш бачити всі свої анкети в одному місці.
      </p>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSigningIn}
        className="action-btn"
        data-testid="button-google-signin"
      >
        {isSigningIn ? 'Заходжу...' : '🔑 Увійти через Google'}
      </button>

      {error && (
        <p className="font-space text-[13px] text-pink text-center mt-3" data-testid="text-login-error">
          {error}
        </p>
      )}

      <div
        className="bg-white border-2 border-dashed border-pencil rounded-lg p-3.5 mt-6 text-[15px] leading-snug"
        data-testid="section-how-it-works"
      >
        <h2 className="font-patrick text-[20px] m-0 mb-2 text-ink">Як працює анкета</h2>

        <p className="font-bold m-0 mb-0.5">1. Створення анкети</p>
        <p className="text-pencil m-0 mb-2.5">
          Заходиш на сайт, тиснеш «Увійти через Google», підтверджуєш свій акаунт у вікні Google — і
          одразу потрапляєш у свій кабінет (жодних листів чекати не треба). Там тиснеш «Створити
          анкету» — отримуєш посилання, яке можна відправити друзям.
        </p>

        <p className="font-bold m-0 mb-0.5">2. Заповнення другом</p>
        <p className="text-pencil m-0 mb-2.5">
          Друг переходить за твоїм посиланням, бачить тільки саму анкету (без чужих відповідей чи
          інших даних), заповнює і тисне «Відправити». Йому не треба нікуди входити чи реєструватись
          — навіть Google-акаунт не потрібен.
        </p>

        <p className="font-bold m-0 mb-0.5">3. Перегляд відповідей</p>
        <p className="text-pencil m-0 mb-2.5">
          Заходиш у свій кабінет (той самий вхід через Google) — бачиш список усіх своїх анкет, а в
          кожній — усі відповіді, які прийшли від друзів. Ці відповіді бачиш тільки ти.
        </p>

        <p className="font-bold m-0 mb-0.5">Якщо друг хоче створити свою анкету</p>
        <p className="text-pencil m-0">
          Заходить на той самий сайт, тисне «Увійти через Google» зі своїм акаунтом — отримує
          окремий, ізольований кабінет. Ваші анкети й відповіді одна одній не видно.
        </p>
      </div>
    </NotebookLayout>
  );
}
