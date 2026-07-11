import { generateToken } from '@/lib/utils';

export type QuestionType = 'text' | 'textarea' | 'choice';

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
}

// The fixed 10 questions every anketa used to ask. IDs match the legacy
// top-level field names on old response docs (name, color, food, ...), so
// rooms created before custom questions existed keep rendering correctly:
// they simply have no `questions` field on the room doc and fall back to this.
export const DEFAULT_QUESTIONS: Question[] = [
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

export function generateQuestionId(): string {
  return generateToken(8);
}

export function cloneDefaultQuestions(): Question[] {
  return DEFAULT_QUESTIONS.map((q) => ({ ...q, options: q.options ? [...q.options] : undefined }));
}

/**
 * Rooms created before this feature have no `questions` field. Rooms created
 * after it always have one (even if the creator kept the defaults verbatim).
 */
export function resolveQuestions(roomQuestions: Question[] | undefined | null): Question[] {
  if (roomQuestions && roomQuestions.length > 0) return roomQuestions;
  return DEFAULT_QUESTIONS;
}

/**
 * Reads a single answer off a response document, whichever shape it's in:
 * - new responses store everything under `answers: { [questionId]: value }`
 * - legacy responses (from before custom questions) store fixed top-level
 *   fields (name, color, food, ...) that happen to match DEFAULT_QUESTIONS ids
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
