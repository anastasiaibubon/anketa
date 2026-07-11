import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { NotebookLayout } from '@/components/layout/NotebookLayout';
import { sendMagicLink, isMagicLinkUrl, getPendingEmail, completeMagicLinkSignIn, onAuthChange } from '@/lib/auth';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If we're already signed in (e.g. this tab was left open), skip the form.
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) setLocation('/dashboard');
    });
    return unsubscribe;
  }, [setLocation]);

  // Completing the round trip: the creator clicked the emailed link and
  // landed back here with a one-time sign-in code in the URL.
  const [isCompleting, setIsCompleting] = useState(false);
  const [needsEmailPrompt, setNeedsEmailPrompt] = useState(false);

  useEffect(() => {
    if (!isMagicLinkUrl(window.location.href)) return;

    const pendingEmail = getPendingEmail();
    if (!pendingEmail) {
      // Most likely the link was opened on a different device/browser than
      // the one that requested it, so we don't have the email remembered —
      // ask for it again before finishing sign-in.
      setNeedsEmailPrompt(true);
      return;
    }

    setIsCompleting(true);
    completeMagicLinkSignIn(pendingEmail, window.location.href)
      .then(() => setLocation('/dashboard'))
      .catch((err) => {
        console.error(err);
        setError('Посилання недійсне або вже використане. Спробуй увійти ще раз.');
        setIsCompleting(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsSending(true);
    setError(null);
    try {
      await sendMagicLink(trimmed);
      setLinkSent(true);
    } catch (err) {
      console.error(err);
      setError('Не вдалося надіслати посилання. Перевір адресу і спробуй ще раз.');
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsCompleting(true);
    setError(null);
    try {
      await completeMagicLinkSignIn(trimmed, window.location.href);
      setLocation('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Не вдалося увійти з цією адресою. Перевір, чи це та сама пошта.');
      setIsCompleting(false);
    }
  };

  if (isCompleting) {
    return (
      <NotebookLayout>
        <p className="text-[17px] text-pencil">Заходжу...</p>
      </NotebookLayout>
    );
  }

  if (needsEmailPrompt) {
    return (
      <NotebookLayout>
        <h1 className="text-[36px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">Підтверди пошту 📬</h1>
        <p className="text-[17px] text-pencil m-0 mb-5">
          Це посилання відкрито в іншому браузері чи пристрої — введи ще раз пошту, на яку його надсилали.
        </p>
        <form onSubmit={handleConfirmEmail} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="твоя@пошта.com"
            className="dashed-input"
            data-testid="input-confirm-email"
          />
          <button type="submit" className="action-btn" data-testid="button-confirm-email">
            Увійти
          </button>
        </form>
        {error && (
          <p className="font-space text-[13px] text-pink text-center mt-3" data-testid="text-login-error">
            {error}
          </p>
        )}
      </NotebookLayout>
    );
  }

  if (linkSent) {
    return (
      <NotebookLayout>
        <h1 className="text-[36px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">Перевір пошту 💌</h1>
        <p className="text-[17px] text-pencil m-0 mb-5">
          Ми надіслали посилання для входу на <strong>{email}</strong>. Відкрий його — і ти опинишся тут, уже увійшовши.
        </p>
      </NotebookLayout>
    );
  }

  return (
    <NotebookLayout>
      <h1 className="text-[42px] font-bold m-0 mb-1 -rotate-1 text-ink leading-none">Вхід ✨</h1>
      <p className="text-[17px] text-pencil m-0 mb-5">
        Введи свою пошту — надішлемо посилання для входу, без паролів. Так ти зможеш бачити всі свої анкети в одному місці.
      </p>
      <form onSubmit={handleSend} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="твоя@пошта.com"
          className="dashed-input"
          data-testid="input-email"
        />
        <button type="submit" disabled={isSending} className="action-btn" data-testid="button-send-link">
          {isSending ? 'Надсилаю...' : 'Надіслати посилання для входу'}
        </button>
      </form>
      {error && (
        <p className="font-space text-[13px] text-pink text-center mt-3" data-testid="text-login-error">
          {error}
        </p>
      )}
    </NotebookLayout>
  );
}
