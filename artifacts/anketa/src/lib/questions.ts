import { generateToken } from '@/lib/utils';

export type QuestionType = 'text' | 'textarea' | 'choice';

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
}

// The very first fixed set of questions anketa ever asked, before custom
// questions existed at all. IDs match the legacy top-level field names on
// old response docs (name, color, food, ...). Rooms created back then have
// no `questions` field on the room doc, so they must keep falling back to
// exactly this list (not the current default template) or their existing
// responses will no longer map to the right question.
const LEGACY_DEFAULT_QUESTIONS: Question[] = [
  { id: 'name', label: 'Як тебе звати?', type: 'text', required: true },
  { id: 'color', label: 'Улюблений колір', type: 'text' },
  { id: 'food', label: 'Улюблена їжа', type: 'text' },
  { id: 'song', label: 'Улюблена пісня чи гурт', type: 'text' },
  { id: 'movie', label: 'Улюблений фільм або мультик', type: 'text' },
  { id: 'dream', label: 'Ким мріяв(-ла) стати в дитинстві?', type: 'text' },
  { id: 'pet', label: 'Кіт чи собака?', type: 'choice', options: ['Кіт', 'Собака', 'Обидва'] },
  { id: 'memory', label: 'Найкращий спогад з дитинства', type: 'textarea' },
  { id: 'trait', label: 'Твоя найкраща риса характеру', type: 'text' },
  { id: 'wish', label: 'Побажання для мене 💛', type: 'textarea' },
];

// The current default template shown to a creator starting a new anketa.
// Only used to pre-fill the builder for *new* rooms — never as the fallback
// for old rooms, since its ids don't match any legacy response data.
export const DEFAULT_QUESTIONS: Question[] = [
  { id: 'name', label: 'Твоє імʼя', type: 'text', required: true },
  { id: 'color', label: 'Улюблений колір', type: 'text' },
  { id: 'subject', label: 'Улюблений предмет у школі', type: 'text' },
  { id: 'singer', label: 'Улюблений співак чи співачка', type: 'text' },
  { id: 'bestFriend', label: 'Хто твій найкращий друг?', type: 'text' },
  { id: 'loveAtFirstSight', label: 'Віриш у кохання з першого погляду?', type: 'text' },
  { id: 'dream', label: 'Ким хочеш стати, коли виростеш?', type: 'text' },
  { id: 'phone', label: 'Є мобільний телефон? Яка модель?', type: 'text' },
  { id: 'desertIsland', label: 'Три речі, які взяв(ла) б на безлюдний острів', type: 'text' },
  { id: 'animal', label: 'Якою твариною хотів(ла) б бути?', type: 'text' },
  { id: 'invisible', label: 'Якби став(ла) невидимкою, що б зробив(ла)?', type: 'text' },
  { id: 'hobby', label: 'Чим ти захоплюєшся?', type: 'text' },
  { id: 'motto', label: 'Який твій девіз?', type: 'text' },
  { id: 'poem', label: 'Напиши віршик або цитату', type: 'text' },
];

export function generateQuestionId(): string {
  return generateToken(8);
}

export function cloneDefaultQuestions(): Question[] {
  return DEFAULT_QUESTIONS.map((q) => ({ ...q, options: q.options ? [...q.options] : undefined }));
}

/**
 * Rooms created before custom questions existed have no `questions` field —
 * they fall back to the original legacy list so their stored responses
 * (keyed by the old ids) keep rendering correctly. Rooms created after that
 * feature shipped always have a `questions` field (even if the creator kept
 * the then-current defaults verbatim), so this legacy fallback never applies
 * to them.
 */
export function resolveQuestions(roomQuestions: Question[] | undefined | null): Question[] {
  if (roomQuestions && roomQuestions.length > 0) return roomQuestions;
  return LEGACY_DEFAULT_QUESTIONS;
}

/**
 * Reads a single answer off a response document, whichever shape it's in:
 * - new responses store everything under `answers: { [questionId]: value }`
 * - legacy responses (from before custom questions) store fixed top-level
 *   fields (name, color, food, ...) that happen to match LEGACY_DEFAULT_QUESTIONS ids
 */
export function getAnswerValue(
  response: { answers?: Record<string, string> } & Record<string, unknown>,
  question: Question
): string {
  if (response.answers && question.id in response.answers) {
    return response.answers[question.id] ?? '';
  }
  const legacy = response[question.id];
  return typeof legacy === 'string' ? legacy : '';
}
