'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { lessonService } from '@/services/lessons';
import '@/styles/lesson.css';

const speak = (text: string) => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// buildSteps — maps every JSON task type to an internal step type
// ─────────────────────────────────────────────────────────────────────────────
function buildSteps(lesson: any): any[] {
  const steps: any[] = [];

  // New JSON format (A1-unit 1 files) — tasks array at root
  const tasks: any[] = lesson.tasks ?? lesson.content_data?.tasks ?? [];

  if (tasks.length > 0) {
    for (const task of tasks) {
      const c = task.content ?? {};

      switch (task.type) {
        // ── Teaching cards ──────────────────────────────────────────────────
        case 'learn_card':
          steps.push({
            type: 'LEARN_CARD',
            data: {
              title: task.title,
              explanation: c.explanation,
              items: c.items,               // [{phrase, note}]
              groups: c.groups,             // [{group, items}]
              table: c.table,               // [{subject, verb, example}]
              short_forms: c.short_forms,
              examples: c.examples,         // [{statement, question, yes_reply, no_reply}]
              rule: c.rule,                 // grammar rule string
              rules: c.rules,               // [{rule, examples}]
              patterns: c.patterns,         // [{pattern, examples}]
              summary: c.summary,           // [{lesson, topic}] — for review cards
              congratulations: c.congratulations,
              all_grammar_covered: c.all_grammar_covered,
              all_vocabulary_covered: c.all_vocabulary_covered,
              what_you_learned: c.what_you_learned,
              tip: c.tip,
              time_patterns: c.time_patterns,
              ordinals: c.ordinals,
              saying_dates: c.saying_dates,
              formation: c.formation,
              structure: c.structure,
              negative: c.negative,
              question: c.question,
              comparison: c.comparison,
              key_signal_words: c.key_signal_words,
            },
          });
          break;

        case 'listen_repeat':
          // Show as a LEARN_CARD with pronunciation instructions + speak buttons
          steps.push({
            type: 'LISTEN_REPEAT',
            data: {
              title: task.title,
              instruction: c.instruction,
              phrases: c.phrases, // [{text, audio_key}]
            },
          });
          break;

        // ── Multiple choice ─────────────────────────────────────────────────
        case 'mcq':
        case 'scenario_mcq': {
          const correctIdx = c.correct_index ?? 0;
          steps.push({
            type: 'MULTIPLE_CHOICE',
            data: {
              question: c.scenario
                ? `📍 ${c.scenario}\n\n${c.question}`
                : c.question,
              options: c.options,
              correct_index: correctIdx,
              explanation: c.explanation,
            },
          });
          break;
        }

        // ── Fill in the blank ────────────────────────────────────────────────
        case 'fill_blank': {
          if (c.blanks && Array.isArray(c.blanks)) {
            // Multi-blank → ONE combined step so user fills all blanks before checking
            steps.push({
              type: 'FILL_BLANK_MULTI',
              data: {
                sentence: c.sentence,   // original with _+ placeholders
                blanks: c.blanks,       // [{ position, options, correct }]
                explanation: c.explanation,
              },
            });
          } else {
            // Single blank
            let sentence = c.sentence;
            if (/_+/.test(sentence)) {
              sentence = sentence.replace(/_+/, '[___]');
            }
            steps.push({
              type: 'FILL_BLANK',
              data: {
                sentence,
                options: c.options,
                correct: c.correct,
                explanation: c.explanation,
                full_sentence: c.sentence,
              },
            });
          }
          break;
        }

        // ── Sort / scramble words ────────────────────────────────────────────
        case 'sort_words': {
          const shuffled = [...(c.words ?? [])].sort(() => Math.random() - 0.5);
          steps.push({
            type: 'SCRAMBLE',
            data: {
              instruction: c.instruction,
              shuffled_words: shuffled,
              correct_sequence: c.correct_sentence,
              alternative_correct: c.alternative_correct,
              explanation: c.explanation,
            },
          });
          break;
        }

        // ── Matching pairs ──────────────────────────────────────────────────
        case 'match_pairs': {
          const pairs = (c.pairs ?? []).map((p: any) => ({
            left: p.prompt,
            right: p.answer,
          }));
          // Shuffle the right column
          const rights = pairs.map((p: any) => p.right).sort(() => Math.random() - 0.5);
          const shuffledPairs = pairs.map((p: any, i: number) => ({
            left: p.left,
            right: rights[i],
          }));
          steps.push({
            type: 'MATCHING',
            data: {
              instruction: c.instruction,
              pairs: shuffledPairs,
              // correct pairs keyed by left text
              correct_map: Object.fromEntries(pairs.map((p: any) => [p.left, p.right])),
            },
          });
          break;
        }

        case 'dialogue':
          steps.push({
            type: 'DIALOGUE',
            data: {
              title: task.title,
              context: c.context,
              dialogue: c.dialogue,
              questions: c.comprehension_questions,
            },
          });
          break;

        // ── Speaking ────────────────────────────────────────────────────────
        case 'speaking':
          steps.push({
            type: 'SPEAKING',
            data: {
              title: task.title,
              instruction: c.instruction,
              script: c.example_response || c.prompt,
              prompt: c.prompt,
              key_phrases: c.key_phrases,
              min_words: c.min_words,
            },
          });
          break;

        // ── Error correction ────────────────────────────────────────────────
        case 'error_correction': {
          const correctIdx = c.correct_index ?? 0;
          steps.push({
            type: 'ERROR_CORRECTION',
            data: {
              sentence: c.wrong_sentence ?? c.wrong_text ?? '',
              question: c.instruction ?? 'Choose the correct version:',
              options: c.options,
              correct_index: correctIdx,
              explanation: c.explanation,
            },
          });
          break;
        }

        // ── Lesson summary ───────────────────────────────────────────────────
        case 'lesson_summary':
          // We handle this as the SUMMARY step — skip, we add one at the end
          break;

        // ── Family tree ──────────────────────────────────────────────────────
        case 'family_tree':
          steps.push({
            type: 'FAMILY_TREE',
            data: {
              title: task.title,
              explanation: c.explanation,
              members: c.members,
            },
          });
          break;

        default:
          break;
      }
      
      // Attach category to the last added step
      if (steps.length > 0 && steps[steps.length - 1].type !== 'SUMMARY') {
        steps[steps.length - 1].category = task.category || (task.type === 'speaking' ? 'speaking' : 'vocabulary');
      }
    }

    // Fix MULTIPLE_CHOICE — ensure correct_index is resolved
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.type === 'MULTIPLE_CHOICE' && s.data.correct_index === undefined && s.data.correct_answer) {
        s.data.correct_index = s.data.options.indexOf(s.data.correct_answer);
      }
    }

    steps.push({ type: 'SUMMARY', data: { lesson } });
    return steps;
  }

  // ── Legacy API format fallback ──────────────────────────────────────────────
  const d = lesson.content_data ?? {};
  const legacySteps: any[] = [];
  if (d.tasks && Array.isArray(d.tasks)) {
    legacySteps.push(...d.tasks);
  } else {
    if (d.text) legacySteps.push({ type: 'LEARNING_TIP', data: { title: lesson.title, explanation: d.text } });
    if (d.vocabulary?.length > 0) legacySteps.push({ type: 'OLD_VOCAB', data: { words: d.vocabulary } });
    if (d.examples?.length > 0) legacySteps.push({ type: 'OLD_EXAMPLE', data: { examples: d.examples } });
    if (d.questions?.length > 0) {
      d.questions.forEach((q: any) => legacySteps.push({ type: 'MULTIPLE_CHOICE', data: { question: q.question, options: q.options, correct_answer: q.answer } }));
    }
  }
  legacySteps.forEach(s => {
    if ((s.type === 'MULTIPLE_CHOICE' || s.type === 'REVIEW') && s.data.correct_index === undefined && s.data.correct_answer) {
      s.data.correct_index = s.data.options.indexOf(s.data.correct_answer);
    }
  });
  legacySteps.push({ type: 'SUMMARY', data: {} });
  return legacySteps;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING — uses correct_map to validate, right column is pre-shuffled
// ─────────────────────────────────────────────────────────────────────────────
export default function LessonPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [canContinue, setCanContinue] = useState(false);

  const [lessonStartTime, setLessonStartTime] = useState<number>(0);
  const [timeSpentStr, setTimeSpentStr] = useState<string>('');
  
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [totalQuiz, setTotalQuiz] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const accuracy_percent = Math.round((correctCount / Math.max(1, totalQuiz)) * 100);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');
  const [scrambleAnswer, setScrambleAnswer] = useState<string[]>([]);

  // Matching state
  const [matchingSelections, setMatchingSelections] = useState<number[]>([]);
  const [matchingMatched, setMatchingMatched] = useState<number[]>([]);
  const [matchingWrongPairs, setMatchingWrongPairs] = useState<number[]>([]);
  const [matchingMistakes, setMatchingMistakes] = useState(0);

  // Fill-blank (single) state
  const [fillSelected, setFillSelected] = useState<number | null>(null);

  // Fill-blank (multi) state
  const [multiBlankAnswers, setMultiBlankAnswers] = useState<(number | null)[]>([]);
  const [activeBlankIdx, setActiveBlankIdx] = useState(0);

  const [quizChecked, setQuizChecked] = useState(false);
  const [feedback, setFeedback] = useState<{ show: boolean; status: 'correct' | 'wrong' | 'almost'; title: string; msg: string; }>({ 
    show: false, status: 'correct', title: '', msg: '' 
  });
  const [masteredSkills, setMasteredSkills] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Listen-repeat: which phrases have been played
  const [playedPhrases, setPlayedPhrases] = useState<number[]>([]);
  const [useTypingFallback, setUseTypingFallback] = useState(false);

  useEffect(() => {
    // ── Reset step position for every new lesson ──
    setCurrentStep(0);
    setLesson(null);
    setSteps([]);
    setLoading(true);
    setTotalQuiz(0);
    setCorrectCount(0);
    setMasteredSkills(new Set());
    setFeedback({ show: false, status: 'correct', title: '', msg: '' });

    lessonService.getLesson(id)
      .then((data: any) => {
        setLesson(data);
        setSteps(buildSteps(data));
        setLessonStartTime(Date.now());
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (event: any) => {
          const result = event.results[0][0].transcript;
          setInputText(result);
          setIsRecording(false);
        };
        recognitionRef.current.onerror = () => setIsRecording(false);
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
  }, [id]);

  useEffect(() => {
    setStepStartTime(Date.now());
    setCanContinue(false);
    setSelectedOption(null);
    setFillSelected(null);
    setMultiBlankAnswers([]);
    setActiveBlankIdx(0);
    setInputText('');
    setScrambleAnswer([]);
    setMatchingSelections([]);
    setMatchingWrongPairs([]);
    setMatchingMistakes(0);
    setQuizChecked(false);
    setFeedback({ show: false, status: 'correct', title: '', msg: '' });
    setPlayedPhrases([]);
    setUseTypingFallback(false);

    if (steps[currentStep]?.type !== 'MATCHING') {
      setMatchingMatched([]);
    }

    const step = steps[currentStep];
    if (!step) return;

    if (step.type === 'SUMMARY' && lessonStartTime && !timeSpentStr) {
      const ms = Date.now() - lessonStartTime;
      const totalSec = Math.max(1, Math.floor(ms / 1000));
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setTimeSpentStr(m > 0 ? `${m}m ${s}s` : `${s}s`);
    }

    // Non-quiz steps: allow immediate continue
    if (['LEARNING_TIP', 'FLASHCARD', 'LEARN_CARD', 'LISTEN_REPEAT', 'FAMILY_TREE', 'SUMMARY', 'OLD_VOCAB', 'OLD_EXAMPLE'].includes(step.type)) {
      setCanContinue(true);
    }
  }, [currentStep, steps]);

  const step = steps[currentStep];
  const progress = steps.length > 1 ? ((currentStep) / (steps.length - 1)) * 100 : 0;

  const logStats = async (isCorrect: boolean) => {
    const rTime = Date.now() - stepStartTime;
    try { await lessonService.logVelocity({ lesson_id: Number(id), response_time_ms: rTime }); } catch (e) {}
  };

  const handleSkipSpeaking = () => {
    if (!step._isRetry) {
      setSteps(prev => {
        const clone = { ...step, _isRetry: true };
        const newArr = [...prev];
        const summaryIdx = newArr.findIndex(s => s.type === 'SUMMARY');
        if (summaryIdx >= 0) newArr.splice(summaryIdx, 0, clone);
        else newArr.push(clone);
        return newArr;
      });
    }
    goNext();
  };

  const checkAnswer = async () => {
    let isCorrect = false;
    let correctMsg = 'Correct!';

    if (step.type === 'MULTIPLE_CHOICE' || step.type === 'REVIEW') {
      isCorrect = selectedOption === step.data.correct_index;
      correctMsg = step.data.explanation || step.data.options?.[step.data.correct_index];
    } else if (step.type === 'FILL_BLANK') {
      const correctOpt = step.data.options?.[fillSelected as number];
      isCorrect = correctOpt?.toLowerCase() === step.data.correct?.toLowerCase();
      correctMsg = step.data.explanation || `Correct answer: ${step.data.correct}`;
    } else if (step.type === 'TRANSLATE' || step.type === 'LISTENING') {
      const ans = step.type === 'TRANSLATE' ? step.data.correct_variants : [step.data.correct_answer];
      isCorrect = ans.some((a: string) => a.toLowerCase().trim() === inputText.toLowerCase().trim());
      correctMsg = ans[0];
    } else if (step.type === 'SCRAMBLE') {
      // Normalize both sides: lowercase + strip leading/trailing punctuation
      const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;:'"]+$/g, '').trim();
      const userStr = normalize(scrambleAnswer.join(' '));
      const targetStr = normalize(step.data.correct_sequence ?? '');
      const altStr = normalize(step.data.alternative_correct ?? '');
      isCorrect = userStr === targetStr || (altStr.length > 0 && userStr === altStr);
      correctMsg = step.data.correct_sequence + (step.data.explanation ? ` (${step.data.explanation})` : '');
    } else if (step.type === 'FILL_BLANK_MULTI') {
      const blanks: any[] = step.data.blanks ?? [];
      isCorrect = blanks.every((blank: any, i: number) => {
        const selIdx = multiBlankAnswers[i];
        if (selIdx == null) return false;
        return (blank.options?.[selIdx] ?? '').toLowerCase() === (blank.correct ?? '').toLowerCase();
      });
      correctMsg = step.data.explanation || 'Check your answers!';
    } else if (step.type === 'SPEAKING') {
      const target = (step.data.script || '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
      const actual = inputText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
      const keyPhrases: string[] = step.data.key_phrases ?? [];
      const phraseHits = keyPhrases.filter(kp => actual.includes(kp.toLowerCase().replace(/[.,]/g, '')));
      isCorrect = actual.length > 5 && (phraseHits.length >= Math.ceil(keyPhrases.length * 0.4) || actual.includes(target) || target.includes(actual));
      correctMsg = step.data.script;

      if (useTypingFallback && !step._isRetry) {
        setSteps(prev => {
          const clone = { ...step, _isRetry: true };
          const newArr = [...prev];
          const summaryIdx = newArr.findIndex(s => s.type === 'SUMMARY');
          if (summaryIdx >= 0) newArr.splice(summaryIdx, 0, clone);
          else newArr.push(clone);
          return newArr;
        });
      }
    } else if (step.type === 'ERROR_CORRECTION') {
      isCorrect = selectedOption === step.data.correct_index;
      correctMsg = step.data.explanation || '';
    } else if (step.type === 'SENTENCE_BUILDER') {
      const normalize2 = (s: string) => s.toLowerCase().replace(/[.,!?;:'"]+$/g, '').trim();
      isCorrect = normalize2(scrambleAnswer.join(' ')) === normalize2(step.data.correct_answer ?? '');
      correctMsg = step.data.correct_answer;
    }

    setQuizChecked(true);
    setTotalQuiz(prev => prev + 1);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      if (step.category) {
        setMasteredSkills(prev => new Set(prev).add(step.category));
      }
      const comps = ['Awesome!', 'Good!', 'Quite well!', 'Perfect!', 'Excellent!', 'Great job!', 'Spot on!'];
      const randomTitle = comps[Math.floor(Math.random() * comps.length)];
      setFeedback({ show: true, status: 'correct', title: randomTitle, msg: step.data.explanation ? `Explanation: ${step.data.explanation}` : '' });
    } else {
      setFeedback({ show: true, status: 'wrong', title: 'Correct answer:', msg: correctMsg });
    }
    setCanContinue(true);
    logStats(isCorrect);
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
  };

  const completeLesson = async () => {
    const accuracy = totalQuiz > 0 ? (correctCount / totalQuiz) : 1.0;
    try { await lessonService.completeLesson(id, { accuracy }); } catch (e) {}
    router.push('/dashboard');
  };

  // ── MATCHING logic — uses correct_map for validation ──────────────────────
  const handleMatchingClick = (idx: number, isLeft: boolean) => {
    if (quizChecked) return;
    const items = step.data.pairs;
    const globalIdx = isLeft ? idx : idx + items.length;

    if (matchingMatched.includes(globalIdx)) return;

    let newSel = [...matchingSelections];
    if (newSel.includes(globalIdx)) {
      newSel = newSel.filter(i => i !== globalIdx);
    } else {
      if (newSel.length === 2) newSel = [globalIdx];
      else newSel.push(globalIdx);
    }
    setMatchingSelections(newSel);

    if (newSel.length === 2) {
      const [i1, i2] = newSel;
      const isI1Left = i1 < items.length;
      const isI2Left = i2 < items.length;

      if (isI1Left !== isI2Left) {
        const leftIdx = isI1Left ? i1 : i2;
        const rightIdx = isI1Left ? i2 - items.length : i1 - items.length;
        const leftText = items[leftIdx].left;
        const rightText = items[rightIdx].right;
        const correctRight = step.data.correct_map?.[leftText];
        const isMatch = correctRight ? correctRight === rightText : leftIdx === rightIdx;

        if (isMatch) {
          setMatchingMatched(prev => [...prev, i1, i2]);
          setMatchingSelections([]);
          const newMatched = matchingMatched.length + 2;
          if (newMatched === items.length * 2) {
            setCanContinue(true);
            setQuizChecked(true);
            setTotalQuiz(prev => prev + 1);
            if (matchingMistakes === 0) setCorrectCount(prev => prev + 1);
            logStats(matchingMistakes === 0);
            
            if (matchingMistakes === 0) {
              const comps = ['Awesome!', 'Good!', 'Quite well!', 'Perfect!', 'Excellent!', 'Great job!', 'Spot on!'];
              const randomTitle = comps[Math.floor(Math.random() * comps.length)];
              setFeedback({ show: true, status: 'correct', title: randomTitle, msg: 'All pairs matched flawlessly!' });
            } else {
              setFeedback({ show: true, status: 'almost', title: 'Good try!', msg: 'You matched them all, but made some mistakes.' });
            }
          }
        } else {
          setMatchingMistakes(prev => prev + 1);
          setMatchingWrongPairs([i1, i2]);
          setMatchingSelections([]);
          setTimeout(() => setMatchingWrongPairs([]), 800);
        }
      } else {
        setMatchingSelections([globalIdx]);
      }
    }
  };

  if (loading) return <div className="lesson-loading">Loading the fun...</div>;
  if (!lesson || !step) return <div className="lesson-loading">Lesson not found.</div>;

  const isCheckableTask = !['LEARNING_TIP', 'LEARN_CARD', 'LISTEN_REPEAT', 'FLASHCARD', 'FAMILY_TREE', 'MATCHING', 'OLD_VOCAB', 'OLD_EXAMPLE', 'SUMMARY', 'DIALOGUE', 'lesson_summary'].includes(step.type);

  const isInputEmpty =
    step.type === 'SCRAMBLE' ? scrambleAnswer.length === 0 :
    step.type === 'FILL_BLANK' ? fillSelected === null :
    step.type === 'FILL_BLANK_MULTI' ? (
      multiBlankAnswers.length < (step.data.blanks?.length ?? 0) ||
      multiBlankAnswers.some((a) => a == null)
    ) :
    (step.type === 'TRANSLATE' || step.type === 'LISTENING') ? inputText.trim() === '' :
    (step.type === 'MULTIPLE_CHOICE' || step.type === 'REVIEW' || step.type === 'ERROR_CORRECTION') ? selectedOption === null :
    step.type === 'SPEAKING' ? inputText.trim() === '' :
    step.type === 'SENTENCE_BUILDER' ? scrambleAnswer.length === 0 : false;

  return (
    <div className="lesson-shell">
      {/* Top Progress Bar */}
      <div className="lesson-topbar">
        <button className="lesson-close-btn" onClick={() => router.push('/dashboard')}>✕</button>
        <div className="lesson-progress-track">
          <motion.div className="lesson-progress-fill" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="lesson-body">
        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>

            {/* ── LEARN CARD ────────────────────────────────────────────── */}
            {step.type === 'LEARN_CARD' && (() => {
              const d = step.data;
              return (
                <div style={{ width: '100%' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#4f46e5', margin: '0 0 6px 0' }}>
                    {d.title}
                  </h2>
                  {d.explanation && (
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>
                      {d.explanation}
                    </p>
                  )}
                  {d.congratulations && (
                    <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px', color: 'white' }}>
                      <p style={{ fontSize: '15px', lineHeight: 1.7, margin: 0 }}>{d.congratulations}</p>
                    </div>
                  )}

                  {/* Time Patterns */}
                  {d.time_patterns && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      {d.time_patterns.map((tp: any, i: number) => (
                        <div key={i} style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '14px', padding: '14px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 900, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{tp.pattern}</p>
                          <p style={{ fontSize: '13px', color: '#4c1d95', fontWeight: 600, marginBottom: '8px' }}>{tp.use}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(tp.examples ?? []).map((ex: string, j: number) => (
                              <span key={j} onClick={() => speak(ex)} style={{ background: 'white', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '3px 8px', fontSize: '12px', fontWeight: 700, color: '#6d28d9', cursor: 'pointer' }}>{ex}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ordinal Numbers */}
                  {d.ordinals && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                      {d.ordinals.map((ord: any, i: number) => (
                        <div key={i} style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                          <p style={{ fontSize: '15px', fontWeight: 800, color: '#be185d', margin: 0 }}>{ord.number}</p>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: '#db2777', margin: 0 }}>{ord.say}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Saying Dates */}
                  {d.saying_dates && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: '#be185d', textTransform: 'uppercase', marginBottom: '4px' }}>How to say dates:</p>
                      {d.saying_dates.map((sd: any, i: number) => (
                        <div key={i} onClick={() => speak(sd.spoken)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: '1.5px solid #fbcfe8', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer' }}>
                          <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px', minWidth: '80px' }}>{sd.written}</span>
                          <span style={{ color: '#94a3b8' }}>→</span>
                          <span style={{ fontWeight: 700, color: '#be185d', fontSize: '14px' }}>"{sd.spoken}"</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grammar Structure */}
                  {d.structure && (
                    <div style={{ background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', fontWeight: 900, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Structure</p>
                      {typeof d.structure === 'string' ? (
                        <p style={{ fontSize: '18px', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>{d.structure}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                          {Object.entries(d.structure).map(([key, val]: [string, any]) => (
                            <div key={key} style={{ background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
                              <span style={{ fontSize: '10px', fontWeight: 900, color: '#4338ca', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>{key}</span>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e1b4b' }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grammar Formation */}
                  {d.formation && (
                    <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1.5px solid #e2e8f0', marginBottom: '16px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>How to form it:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Array.isArray(d.formation) ? d.formation.map((f: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                            <span style={{ fontWeight: 800, color: '#4f46e5', minWidth: '40px' }}>{f.subject}</span>
                            <span style={{ color: '#94a3b8' }}>+</span>
                            <span style={{ fontWeight: 700, color: '#16a34a' }}>{f.helper}</span>
                            <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>→</span>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{f.example}</span>
                          </div>
                        )) : typeof d.formation === 'string' ? (
                          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{d.formation}</p>
                        ) : (
                          Object.entries(d.formation).map(([k, v]: [string, any]) => (
                            <div key={k} style={{ background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                               <span style={{ fontSize: '10px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase' }}>{k}</span>
                               <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{v}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary (Lesson 8 Style) */}
                  {d.summary && Array.isArray(d.summary) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      {d.summary.map((s: any, i: number) => (
                        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', marginBottom: '4px' }}>{s.lesson}</p>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{s.topic}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grammar Negative/Question Forms */}
                  {(d.negative || d.question) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      {d.negative && (
                        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '14px', padding: '12px 16px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 900, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' }}>Negative Form:</p>
                          {typeof d.negative === 'string' ? (
                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', margin: 0 }}>{d.negative}</p>
                          ) : (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                               {Object.entries(d.negative).map(([k, v]: [string, any]) => (
                                 <p key={k} style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#991b1b' }}><span style={{ textTransform: 'uppercase', fontSize: '10px', opacity: 0.7 }}>{k}:</span> {v}</p>
                               ))}
                             </div>
                          )}
                        </div>
                      )}
                      {d.question && (
                        <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '14px', padding: '12px 16px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 900, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>Question Form:</p>
                          {typeof d.question === 'string' ? (
                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#065f46', margin: 0 }}>{d.question}</p>
                          ) : (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                               {Object.entries(d.question).map(([k, v]: [string, any]) => (
                                 <p key={k} style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#065f46' }}><span style={{ textTransform: 'uppercase', fontSize: '10px', opacity: 0.7 }}>{k}:</span> {v}</p>
                               ))}
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comparison */}
                  {d.comparison && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      {d.comparison.map((c: any, i: number) => (
                        <div key={i} style={{ background: i === 0 ? '#eff6ff' : '#f0fdf4', border: `1.5px solid ${i === 0 ? '#bfdbfe' : '#bbf7d0'}`, borderRadius: '16px', padding: '16px' }}>
                          <p style={{ fontSize: '14px', fontWeight: 800, color: i === 0 ? '#1e40af' : '#166534', marginBottom: '4px' }}>{c.tense}</p>
                          <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '10px' }}>{c.use}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(c.examples ?? []).map((ex: string, j: number) => (
                              <span key={j} onClick={() => speak(ex)} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>{ex}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Signal Words */}
                  {d.key_signal_words && (
                    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', marginBottom: '12px' }}>Signal Words:</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {Object.entries(d.key_signal_words).map(([key, words]: [string, any], i) => (
                          <div key={i}>
                            <p style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '6px' }}>{key.replace('_', ' ')}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {words.map((w: string, j: number) => (
                                <span key={j} style={{ background: 'white', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, color: '#92400e', border: '1px solid #fef3c7' }}>{w}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phrase items */}
                  {d.items && d.items.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {d.items.map((item: any, i: number) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                          background: 'white', borderRadius: '12px', padding: '13px 16px',
                          border: '1.5px solid #e0e7ff', boxShadow: '0 2px 6px rgba(79,70,229,0.06)',
                          cursor: 'pointer', gap: '12px',
                        }}
                          onClick={() => speak(item.phrase)}
                        >
                          <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{item.phrase}</span>
                          {item.note && <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, textAlign: 'right', flexShrink: 0, maxWidth: '45%' }}>{item.note}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vocabulary groups */}
                  {d.groups && d.groups.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {d.groups.map((g: any, i: number) => (
                        <div key={i} style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1.5px solid #e2e8f0' }}>
                          <p style={{ fontSize: '12px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>{g.group}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(g.items ?? []).map((word: string, j: number) => (
                              <button key={j} style={{ background: 'white', border: '1.5px solid #e0e7ff', borderRadius: '10px', padding: '6px 14px', fontSize: '14px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }} onClick={() => speak(word)}>{word}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grammar table */}
                  {d.table && d.table.length > 0 && (
                    <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: '#eef2ff' }}>
                            {Object.keys(d.table[0]).map((k) => (
                              <th key={k} style={{ padding: '10px 14px', fontWeight: 800, color: '#4f46e5', textAlign: 'left', textTransform: 'capitalize' }}>{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {d.table.map((row: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              {Object.values(row).map((val: any, j: number) => (
                                <td key={j} style={{ padding: '10px 14px', color: '#1e293b', fontWeight: j === 1 ? 800 : 500 }}>{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Grammar Examples — supports both {sentence,structure} and {statement,question,...} formats */}
                  {d.examples && d.examples.length > 0 && (() => {
                    const firstEx = d.examples[0];
                    const isSentenceFormat = firstEx?.sentence !== undefined;
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        {d.examples.map((ex: any, i: number) => {
                          if (typeof ex === 'string') {
                            return (
                              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '13px 16px', border: '1.5px solid #e0e7ff', cursor: 'pointer' }} onClick={() => speak(ex)}>
                                <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>💬 {ex}</span>
                              </div>
                            );
                          }
                          
                          return isSentenceFormat ? (
                            <div key={i} style={{
                              background: 'white', borderRadius: '12px', padding: '13px 16px',
                              border: '1.5px solid #e0e7ff', display: 'flex', flexDirection: 'column', gap: '4px',
                              cursor: 'pointer',
                            }} onClick={() => speak(ex.sentence)}>
                              <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>💬 {ex.sentence}</span>
                              {ex.structure && <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>{ex.structure}</span>}
                            </div>
                          ) : (
                            <div key={i} style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => speak(ex.question || ex.statement || '')}>
                              {ex.statement && <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>Statement: <strong style={{ color: '#1e293b' }}>{ex.statement}</strong></p>}
                              {ex.question && <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4f46e5', fontWeight: 'bold' }}>Question: {ex.question}</p>}
                              <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                                {(ex.yes_reply || ex.yes) && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Yes: {ex.yes_reply || ex.yes}</span>}
                                {(ex.no_reply || ex.no) && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>No: {ex.no_reply || ex.no}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Grammar Pattern(s) */}
                  {d.patterns && d.patterns.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                      {d.patterns.map((p: any, i: number) => (
                        <div key={i} style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '16px', padding: '16px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 900, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Pattern: {p.pattern}</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(p.examples ?? []).map((ex: any, j: number) => (
                              <div key={j} style={{ background: 'white', border: '1px solid #e0f2fe', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer' }} onClick={() => speak(ex.phrase || ex)}>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{ex.phrase || ex}</span>
                                {ex.note && <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>— {ex.note}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grammar Rule(s) */}
                  {d.rules && d.rules.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      {d.rules.map((r: any, i: number) => (
                        <div key={i} style={{ background: '#fffbeb', borderLeft: '4px solid #fbbf24', padding: '14px 16px', borderRadius: '0 12px 12px 0' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#92400e', fontWeight: 800 }}>💡 {r.rule}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(r.examples ?? []).map((ex: string, j: number) => (
                              <span key={j} style={{ background: 'white', border: '1px solid #fde68a', borderRadius: '8px', padding: '4px 10px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', cursor: 'pointer' }} onClick={() => speak(ex)}>{ex}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {d.rule && (
                    <div style={{ background: '#fffbeb', borderLeft: '4px solid #fbbf24', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: '16px' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#92400e', fontWeight: 600 }}>💡 {d.rule}</p>
                    </div>
                  )}

                  {/* Tip */}
                  {d.tip && (
                    <div style={{ background: '#f0fdfa', border: '1.5px dashed #5eead4', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#0d9488', fontWeight: 600 }}>🌟 <strong>Tip:</strong> {d.tip}</p>
                    </div>
                  )}

                  {/* Short forms */}
                  {d.short_forms && d.short_forms.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                      {d.short_forms.map((sf: any, i: number) => (
                        <div key={i} style={{
                          background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                          borderRadius: '10px', padding: '8px 14px',
                          fontSize: '13px', fontWeight: 700, color: '#16a34a',
                        }}>
                          {sf.full} → <strong>{sf.short}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary list (review card) */}
                  {d.summary && d.summary.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {d.summary.map((s: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '12px', background: '#f8fafc', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '13px', minWidth: '64px' }}>{s.lesson}</span>
                          <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{s.topic}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* What you learned */}
                  {d.what_you_learned && d.what_you_learned.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {d.what_you_learned.map((item: string, i: number) => (
                        <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                          <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span> {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* All grammar/vocab (unit summary) */}
                  {d.all_grammar_covered && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontWeight: 800, color: '#4f46e5', fontSize: '13px', marginBottom: '8px' }}>Grammar covered:</p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {d.all_grammar_covered.map((g: string, i: number) => (
                          <li key={i} style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>📌 {g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {d.all_vocabulary_covered && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontWeight: 800, color: '#0ea5e9', fontSize: '13px', marginBottom: '8px' }}>Vocabulary covered:</p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {d.all_vocabulary_covered.map((v: string, i: number) => (
                          <li key={i} style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>📝 {v}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p style={{ fontSize: '12px', color: '#c4c4c4', marginTop: '20px', textAlign: 'center' }}>🔊 Tap any phrase to hear it</p>
                </div>
              );
            })()}

            {/* ── LISTEN & REPEAT ───────────────────────────────────────── */}
            {step.type === 'LISTEN_REPEAT' && (() => {
              const d = step.data;
              return (
                <div style={{ width: '100%' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#4f46e5', margin: '0 0 6px 0' }}>{d.title}</h2>
                  {d.instruction && <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>{d.instruction}</p>}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(d.phrases ?? []).map((p: any, i: number) => {
                      const isPlayed = playedPhrases.includes(i);
                      return (
                        <div key={i} 
                          onClick={() => {
                            speak(p.text);
                            if (!isPlayed) setPlayedPhrases(prev => [...prev, i]);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'white', borderRadius: '16px', padding: '16px 20px',
                            border: `2px solid ${isPlayed ? '#e0e7ff' : '#f1f5f9'}`,
                            boxShadow: isPlayed ? '0 4px 12px rgba(79,70,229,0.08)' : 'none',
                            cursor: 'pointer', transition: 'all 0.2s',
                            transform: isPlayed ? 'scale(1.02)' : 'scale(1)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: isPlayed ? '#4f46e5' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                              {isPlayed ? '🔊' : '🔈'}
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '16px', color: isPlayed ? '#4f46e5' : '#1e293b' }}>{p.text}</span>
                          </div>
                          {isPlayed && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: '#16a34a', fontWeight: 900, fontSize: '12px' }}>READY! ✓</motion.span>}
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '20px', fontWeight: 600 }}>Tap each phrase to listen and practice repeating it aloud.</p>
                </div>
              );
            })()}

            {/* ── FAMILY TREE ─────────────────────────────────────────────── */}
            {step.type === 'FAMILY_TREE' && (() => {
              const d = step.data;
              const members: any[] = d.members ?? [];
              // Build a mini tree: grandparents row → parents row → siblings+you row
              const grandparents = members.filter((m: any) => m.generation === 0);
              const parents      = members.filter((m: any) => m.generation === 1);
              const siblings     = members.filter((m: any) => m.generation === 2);
              const renderRow = (people: any[]) => (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {people.map((m: any, i: number) => (
                    <div key={i} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      background: m.isYou ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'white',
                      border: `2px solid ${m.isYou ? '#4f46e5' : '#e0e7ff'}`,
                      borderRadius: '14px', padding: '10px 14px', minWidth: '80px',
                      boxShadow: '0 2px 8px rgba(79,70,229,0.10)',
                    }}>
                      <span style={{ fontSize: '26px' }}>{m.emoji ?? '🧑'}</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: m.isYou ? 'white' : '#1e293b' }}>{m.name}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: m.isYou ? 'rgba(255,255,255,0.8)' : '#4f46e5', background: m.isYou ? 'rgba(255,255,255,0.15)' : '#eef2ff', borderRadius: '6px', padding: '2px 6px' }}>{m.role}</span>
                    </div>
                  ))}
                </div>
              );
              const connectorLine = () => (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                  <div style={{ width: '2px', height: '20px', background: '#c7d2fe' }} />
                </div>
              );
              return (
                <div style={{ width: '100%' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#4f46e5', margin: '0 0 6px 0' }}>{d.title ?? 'Family Tree'}</h2>
                  {d.explanation && <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>{d.explanation}</p>}
                  <div style={{ background: 'linear-gradient(135deg, #eef2ff, #f0fdf4)', borderRadius: '20px', padding: '24px 16px', border: '1.5px solid #e0e7ff' }}>
                    {grandparents.length > 0 && <>{renderRow(grandparents)}{connectorLine()}</>}
                    {parents.length > 0 && <>{renderRow(parents)}{connectorLine()}</>}
                    {siblings.length > 0 && renderRow(siblings)}
                    {grandparents.length === 0 && parents.length === 0 && members.length > 0 && renderRow(members)}
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {members.map((m: any, i: number) => (
                      <div key={i} style={{
                        display: 'flex', gap: '10px', alignItems: 'center',
                        background: 'white', borderRadius: '10px', padding: '10px 14px',
                        border: '1px solid #e0e7ff',
                      }}>
                        <span style={{ fontSize: '20px' }}>{m.emoji ?? '🧑'}</span>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', minWidth: '60px' }}>{m.name}</span>
                        <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, background: '#eef2ff', borderRadius: '6px', padding: '2px 8px' }}>{m.role}</span>
                        {m.relation && <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, marginLeft: 'auto' }}>"Your {m.relation}"</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── LESSON SUMMARY ────────────────────────────────────────── */}
            {step.type === 'lesson_summary' && (() => {
              const sd = step.data;
              return (
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <span style={{ fontSize: '40px' }}>🏆</span>
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>{sd.title || 'Lesson Complete!'}</h2>
                  <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '24px' }}>Excellent work! You've mastered these concepts.</p>
                  
                  {sd.what_you_learned && (
                    <div style={{ textAlign: 'left', background: '#f8fafc', borderRadius: '20px', padding: '24px', border: '1.5px solid #e2e8f0', marginBottom: '24px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>What you learned:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sd.what_you_learned.map((item: string, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ width: '20px', height: '20px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                              <div style={{ width: '8px', height: '8px', background: '#4f46e5', borderRadius: '50%' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#334155', fontWeight: 600, lineHeight: 1.5 }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sd.next_lesson_title && (
                    <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>Next: <span style={{ color: '#6366f1' }}>{sd.next_lesson_title}</span></p>
                  )}
                </div>
              );
            })()}

            {/* ── LISTEN & REPEAT ────────────────────────────────────────── */}
            {step.type === 'LISTEN_REPEAT' && (
              <div style={{ width: '100%' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1cb0f6', margin: '0 0 6px 0' }}>{step.data.title}</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>{step.data.instruction}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(step.data.phrases ?? []).map((ph: any, i: number) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      background: playedPhrases.includes(i) ? '#f0fdf4' : 'white',
                      border: `1.5px solid ${playedPhrases.includes(i) ? '#86efac' : '#e0e7ff'}`,
                      borderRadius: '14px', padding: '14px 18px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                      onClick={() => {
                        speak(ph.text);
                        setPlayedPhrases(prev => prev.includes(i) ? prev : [...prev, i]);
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{playedPhrases.includes(i) ? '✅' : '🔊'}</span>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b', flex: 1 }}>{ph.text}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#c4c4c4', marginTop: '16px', textAlign: 'center' }}>Tap each phrase to listen. Repeat it aloud!</p>
              </div>
            )}

            {/* ── LEGACY LEARNING_TIP ────────────────────────────────────── */}
            {step.type === 'LEARNING_TIP' && (() => {
              const exampleStr: string = step.data.example || '';
              const dialogueLines = exampleStr.includes(' | ')
                ? exampleStr.split(' | ').map((part: string) => {
                    const colonIdx = part.indexOf(': ');
                    return colonIdx > -1 ? { speaker: part.slice(0, colonIdx).trim(), line: part.slice(colonIdx + 2).trim() } : { speaker: '', line: part.trim() };
                  })
                : null;
              return (
                <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1cb0f6', margin: '0 0 8px 0' }}>{step.data.title || 'Tip'}</h2>
                  <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>{step.data.explanation}</p>
                  {dialogueLines ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {dialogueLines.map((dl: any, idx: number) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: isEven ? 'row' : 'row-reverse', alignItems: 'flex-end', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: isEven ? '#4f46e5' : '#1cb0f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'white' }}>{dl.speaker ? dl.speaker[0].toUpperCase() : '?'}</div>
                            <div style={{ maxWidth: '75%', background: isEven ? '#eef2ff' : '#f0fdf4', border: `1.5px solid ${isEven ? '#c7d2fe' : '#bbf7d0'}`, borderRadius: isEven ? '18px 18px 18px 4px' : '18px 18px 4px 18px', padding: '10px 16px' }}>
                              {dl.speaker && <p style={{ fontSize: '11px', fontWeight: 800, color: isEven ? '#4f46e5' : '#16a34a', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dl.speaker}</p>}
                              <p style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{dl.line}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : exampleStr ? (
                    <div style={{ background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: '14px', padding: '16px 20px', fontSize: '16px', fontWeight: 700, color: '#4f46e5', lineHeight: 1.6 }}>{exampleStr}</div>
                  ) : null}
                </div>
              );
            })()}

            {/* ── FLASHCARD (legacy) ─────────────────────────────────────── */}
            {step.type === 'FLASHCARD' && (
              <>
                <h2 className="step-instruction">Tap to reveal the meaning</h2>
                <div className="vocab-grid">
                  <div className={`vocab-item ${selectedOption === 1 ? 'revealed' : ''}`} onClick={() => { setSelectedOption(1); speak(step.data.primary_text); }}>
                    <div className="vocab-word" style={{ fontSize: '32px' }}>{step.data.primary_text}</div>
                    <div className="vocab-divider" />
                    <div className="vocab-info">
                      {selectedOption === 1 ? <p className="vocab-definition" style={{ fontSize: '28px', color: '#1cb0f6' }}>{step.data.secondary_text}</p> : <p className="vocab-definition" style={{ color: '#c4c4c4', fontSize: '24px' }}>?</p>}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── MULTIPLE CHOICE ────────────────────────────────────────── */}
            {(step.type === 'MULTIPLE_CHOICE' || step.type === 'REVIEW') && (
              <>
                {/* Scenario / multi-line question support */}
                {step.data.question?.includes('\n\n') ? (
                  <>
                    <div style={{ 
                      background: '#fffbeb', 
                      border: '2px solid #fde68a', 
                      borderRadius: '20px', 
                      padding: '20px 24px', 
                      marginBottom: '28px', 
                      position: 'relative',
                      boxShadow: '0 4px 12px rgba(251,191,36,0.08)'
                    }}>
                      <span style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '24px',
                        background: '#f59e0b',
                        color: 'white',
                        padding: '2px 14px',
                        borderRadius: '99px',
                        fontSize: '11px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Context</span>
                      <p style={{ fontSize: '16px', color: '#92400e', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
                        {step.data.question.split('\n\n')[0].replace('📍 ', '')}
                      </p>
                    </div>
                    <h2 className="quiz-question" style={{ fontSize: '24px', marginBottom: '24px' }}>
                      {step.data.question.split('\n\n')[1]}
                    </h2>
                  </>
                ) : (
                  <h2 className="quiz-question">{step.data.question}</h2>
                )}
                <div className="quiz-options">
                  {step.data.options.map((opt: string, i: number) => {
                    let cls = 'quiz-option';
                    if (quizChecked) {
                      if (i === step.data.correct_index) cls += ' correct';
                      else if (i === selectedOption) cls += ' wrong';
                    } else if (i === selectedOption) cls += ' selected';
                    return (
                      <button key={i} className={cls} onClick={() => !quizChecked && setSelectedOption(i)}>
                        <span className="quiz-option-num">{i + 1}</span> {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── FILL IN THE BLANK ──────────────────────────────────────── */}
            {step.type === 'FILL_BLANK' && (
              <>
                <div style={{ background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: '16px', padding: '18px 22px', marginBottom: '24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Fill in the blank</p>
                  <p style={{ fontSize: '19px', fontWeight: 700, color: '#1e293b', lineHeight: 1.7, margin: 0 }}>
                    {step.data.sentence.split(/(_+|\[___\])/).map((part: string, i: number) => {
                      if (part === '[___]') {
                        return (
                          <span key={i} style={{
                            display: 'inline-block', minWidth: '70px', borderBottom: '3px solid #6366f1',
                            color: quizChecked
                              ? (step.data.options?.[fillSelected as number]?.toLowerCase() === step.data.correct?.toLowerCase() ? '#16a34a' : '#dc2626')
                              : (fillSelected !== null ? '#4f46e5' : 'transparent'),
                            fontWeight: 900, padding: '0 8px', margin: '0 4px',
                          }}>
                            {fillSelected !== null ? step.data.options?.[fillSelected] : '___'}
                          </span>
                        );
                      } else if (/^_+$/.test(part)) {
                        return (
                          <span key={i} style={{
                            display: 'inline-block', minWidth: '50px', borderBottom: '2px solid #cbd5e1',
                            margin: '0 4px', color: 'transparent',
                          }}>
                            ___
                          </span>
                        );
                      } else {
                        return <span key={i}>{part}</span>;
                      }
                    })}
                  </p>
                </div>
                <div className="quiz-options">
                  {(step.data.options ?? []).map((opt: string, i: number) => {
                    let cls = 'quiz-option';
                    if (quizChecked) {
                      if (opt.toLowerCase() === step.data.correct?.toLowerCase()) cls += ' correct';
                      else if (i === fillSelected) cls += ' wrong';
                    } else if (i === fillSelected) cls += ' selected';
                    return (
                      <button key={i} className={cls} onClick={() => !quizChecked && setFillSelected(i)}>
                        <span className="quiz-option-num">{i + 1}</span> {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── FILL IN THE BLANK (MULTI) ──────────────────────────────── */}
            {step.type === 'FILL_BLANK_MULTI' && (() => {
              const blanks: any[] = step.data.blanks ?? [];
              let blankCount = 0;
              const parts: string[] = step.data.sentence.split(/(_+)/);

              return (
                <div style={{ width: '100%' }}>
                  {/* Sentence with all blanks visible */}
                  <div style={{ background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: '16px', padding: '18px 22px', marginBottom: '24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                      Fill in the blanks
                    </p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', lineHeight: 1.8, margin: 0 }}>
                      {parts.map((part, i) => {
                        if (/^_+$/.test(part)) {
                          const bIdx = blankCount++;
                          const blank = blanks[bIdx];
                          const selIdx = multiBlankAnswers[bIdx];
                          const filledWord = selIdx != null ? blank?.options?.[selIdx] : null;
                          const isActive = !quizChecked && bIdx === activeBlankIdx;
                          const isCorrectBlank = quizChecked && (blank?.options?.[selIdx as number] ?? '').toLowerCase() === (blank?.correct ?? '').toLowerCase();
                          return (
                            <span
                              key={i}
                              onClick={() => !quizChecked && setActiveBlankIdx(bIdx)}
                              style={{
                                display: 'inline-block',
                                minWidth: '72px',
                                borderBottom: `3px solid ${quizChecked ? (isCorrectBlank ? '#16a34a' : '#dc2626') : isActive ? '#6366f1' : filledWord ? '#a5b4fc' : '#cbd5e1'}`,
                                color: quizChecked ? (isCorrectBlank ? '#16a34a' : '#dc2626') : filledWord ? '#4f46e5' : '#94a3b8',
                                fontWeight: 900,
                                padding: '0 8px',
                                margin: '0 4px',
                                background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                                borderRadius: '6px',
                                cursor: quizChecked ? 'default' : 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              {filledWord ?? (isActive ? '___' : '_ _')}
                            </span>
                          );
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </p>
                  </div>

                  {/* Options for the CURRENT active blank */}
                  {!quizChecked && (
                    <div>
                      <p style={{ textAlign: 'center', fontSize: '13px', color: '#6366f1', fontWeight: 700, marginBottom: '14px' }}>
                        ✏️ Blank {activeBlankIdx + 1} of {blanks.length} — choose the correct word
                      </p>
                      <div className="quiz-options">
                        {(blanks[activeBlankIdx]?.options ?? []).map((opt: string, i: number) => {
                          const isChosen = multiBlankAnswers[activeBlankIdx] === i;
                          return (
                            <button
                              key={i}
                              className={`quiz-option${isChosen ? ' selected' : ''}`}
                              onClick={() => {
                                const updated = [...multiBlankAnswers];
                                updated[activeBlankIdx] = i;
                                setMultiBlankAnswers(updated);
                                // Auto-advance to next unanswered blank
                                const nextUnanswered = updated.findIndex((a, idx) => idx > activeBlankIdx && a == null);
                                if (nextUnanswered !== -1) {
                                  setActiveBlankIdx(nextUnanswered);
                                } else if (activeBlankIdx < blanks.length - 1) {
                                  setActiveBlankIdx(activeBlankIdx + 1);
                                }
                              }}
                            >
                              <span className="quiz-option-num">{i + 1}</span> {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Blank navigation pills */}
                      {blanks.length > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                          {blanks.map((_: any, bIdx: number) => (
                            <button
                              key={bIdx}
                              onClick={() => setActiveBlankIdx(bIdx)}
                              style={{
                                padding: '5px 14px',
                                borderRadius: '99px',
                                border: `2px solid ${bIdx === activeBlankIdx ? '#6366f1' : multiBlankAnswers[bIdx] != null ? '#a5b4fc' : '#e2e8f0'}`,
                                background: bIdx === activeBlankIdx ? '#eef2ff' : 'white',
                                fontSize: '12px', fontWeight: 700,
                                color: bIdx === activeBlankIdx ? '#6366f1' : multiBlankAnswers[bIdx] != null ? '#4f46e5' : '#94a3b8',
                                cursor: 'pointer',
                              }}
                            >
                              Blank {bIdx + 1} {multiBlankAnswers[bIdx] != null ? '✓' : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* After check: show result per blank */}
                  {quizChecked && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {blanks.map((blank: any, bIdx: number) => {
                        const ansIdx = multiBlankAnswers[bIdx];
                        const ansWord = ansIdx != null ? blank.options?.[ansIdx] : '—';
                        const ok = (ansWord ?? '').toLowerCase() === (blank.correct ?? '').toLowerCase();
                        return (
                          <div key={bIdx} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px 16px', borderRadius: '12px',
                            background: ok ? '#f0fdf4' : '#fef2f2',
                            border: `1.5px solid ${ok ? '#86efac' : '#fca5a5'}`,
                          }}>
                            <span style={{ fontSize: '18px' }}>{ok ? '✅' : '❌'}</span>
                            <div>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: ok ? '#16a34a' : '#dc2626' }}>
                                {ansWord}
                              </span>
                              {!ok && (
                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginLeft: '8px' }}>
                                  → Correct: <strong style={{ color: '#16a34a' }}>{blank.correct}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── DIALOGUE ──────────────────────────────────────────────── */}
            {step.type === 'DIALOGUE' && (() => {
              const d = step.data;
              return (
                <div style={{ width: '100%' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#4f46e5', margin: '0 0 6px 0' }}>{d.title}</h2>
                  {d.context && <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6, fontStyle: 'italic' }}>📍 {d.context}</p>}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1.5px solid #e2e8f0', marginBottom: '24px' }}>
                    {d.dialogue.map((line: any, i: number) => {
                      const isLeft = i % 2 === 0;
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: isLeft ? 'row' : 'row-reverse', alignItems: 'flex-end', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isLeft ? '#4f46e5' : '#1cb0f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                            {line.speaker?.[0].toUpperCase()}
                          </div>
                          <div style={{ maxWidth: '80%', background: 'white', border: '1px solid #e2e8f0', borderRadius: isLeft ? '14px 14px 14px 4px' : '14px 14px 4px 14px', padding: '10px 14px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onClick={() => speak(line.line)}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 900, color: isLeft ? '#4f46e5' : '#1cb0f6', textTransform: 'uppercase' }}>{line.speaker}</p>
                            <p style={{ margin: 0, fontSize: '15px', color: '#1e293b', fontWeight: 500, lineHeight: 1.5 }}>{line.line}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {d.questions && d.questions.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '16px' }}>Comprehension Questions:</p>
                      {d.questions.map((q: any, i: number) => (
                        <div key={i} style={{ background: '#eef2ff', borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1.5px solid #c7d2fe' }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>{q.question}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {q.options.map((opt: string, j: number) => (
                              <div key={j} style={{ 
                                background: 'white', padding: '8px 12px', borderRadius: '10px', 
                                fontSize: '13px', fontWeight: 600, color: '#475569',
                                border: '1px solid #e2e8f0'
                              }}>
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: '12px', color: '#c4c4c4', textAlign: 'center', marginTop: '16px' }}>🔊 Tap any bubble to hear the speaker</p>
                </div>
              );
            })()}

            {/* ── SCRAMBLE / SORT WORDS ──────────────────────────────────── */}
            {step.type === 'SCRAMBLE' && (
              <>
                {step.data.instruction && (
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', textAlign: 'center', fontWeight: 600 }}>{step.data.instruction}</p>
                )}
                <h2 className="quiz-question">Arrange the words into the correct order</h2>
                <div style={{ minHeight: '60px', borderBottom: '2px solid #e5e5e5', marginBottom: '32px', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '12px' }}>
                  {scrambleAnswer.map((w, i) => {
                    let cls = 'quiz-option';
                    if (quizChecked) cls += feedback.status === 'correct' ? ' correct' : ' wrong';
                    return (
                      <button key={`ans-${i}`} className={cls} style={{ padding: '12px 20px', width: 'auto' }} onClick={() => {
                        if (!quizChecked) setScrambleAnswer(prev => prev.filter((_, idx) => idx !== i));
                      }}>{w}</button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {step.data.shuffled_words.map((w: string, i: number) => {
                    const isUsed = scrambleAnswer.includes(w);
                    return (
                      <button key={`bank-${i}`} className="quiz-option" style={{ padding: '12px 20px', width: 'auto', background: isUsed ? '#e5e5e5' : '', borderColor: isUsed ? '#e5e5e5' : '', color: isUsed ? 'transparent' : '', pointerEvents: isUsed ? 'none' : 'auto' }} onClick={() => {
                        if (!quizChecked && !isUsed) setScrambleAnswer(prev => [...prev, w]);
                      }}>{w}</button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── TRANSLATE (legacy) ─────────────────────────────────────── */}
            {step.type === 'TRANSLATE' && (
              <>
                <div className="mascot-bubble-container">
                  <svg className="mascot-svg" viewBox="0 0 100 100" fill="none">
                    <path d="M50 90C72.0914 90 90 67.6142 90 40C90 12.3858 72.0914 10 50 10C27.9086 10 10 12.3858 10 40C10 67.6142 27.9086 90 50 90Z" fill="#4f46e5" />
                    <circle cx="35" cy="40" r="5" fill="white" />
                    <circle cx="65" cy="40" r="5" fill="white" />
                    <path d="M40 60Q50 70 60 60" stroke="white" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  <div className="mascot-bubble"><p className="theory-text" style={{ fontSize: '24px' }}>{step.data.source_text}</p></div>
                </div>
                <input type="text" autoFocus className={`lesson-input ${quizChecked ? (feedback.status === 'correct' ? 'correct' : 'wrong') : ''}`} placeholder={`Translate to ${step.data.target_language}...`} value={inputText} onChange={e => setInputText(e.target.value)} disabled={quizChecked} />
              </>
            )}

            {/* ── LISTENING (legacy) ─────────────────────────────────────── */}
            {step.type === 'LISTENING' && (
              <>
                <h2 className="quiz-question">Tap to listen and type what you hear</h2>
                <button className="mic-button" onClick={() => speak(step.data.correct_answer)}>🔊</button>
                <div style={{ height: '32px' }} />
                <input type="text" autoFocus className={`lesson-input ${quizChecked ? (feedback.status === 'correct' ? 'correct' : 'wrong') : ''}`} placeholder="Type here..." value={inputText} onChange={e => setInputText(e.target.value)} disabled={quizChecked} />
              </>
            )}

            {/* ── SPEAKING ──────────────────────────────────────────────── */}
            {step.type === 'SPEAKING' && (
              <>
                {step.data.title && <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#4f46e5', marginBottom: '6px' }}>{step.data.title}</h2>}
                {step.data.instruction && <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>{step.data.instruction}</p>}
                {step.data.prompt && (
                  <div style={{ background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', cursor: 'pointer' }}
                    onClick={() => speak(step.data.script)}
                  >
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#4f46e5', margin: 0 }}>📌 {step.data.prompt}</p>
                  </div>
                )}
                {step.data.key_phrases && step.data.key_phrases.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                    {step.data.key_phrases.map((kp: string, i: number) => (
                      <span key={i} style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                        {kp}
                      </span>
                    ))}
                  </div>
                )}
                {useTypingFallback ? (
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <input type="text" autoFocus className={`lesson-input ${quizChecked ? (feedback.status === 'correct' ? 'correct' : 'wrong') : ''}`} placeholder="Type what you meant to say..." value={inputText} onChange={e => setInputText(e.target.value)} disabled={quizChecked} />
                    {!quizChecked && (
                      <button onClick={() => setUseTypingFallback(false)} style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', marginTop: '12px', cursor: 'pointer', fontWeight: 600 }}>Use microphone instead</button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      {isRecording
                        ? <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity }} style={{ color: '#ff4b4b', fontWeight: 800 }}>Listening...</motion.p>
                        : <p style={{ color: '#afafaf', fontWeight: 700 }}>Tap the mic to start recording</p>}
                    </div>
                    <button className={`mic-button ${isRecording ? 'active' : ''}`}
                      style={{ background: isRecording ? '#ff4b4b' : '#4f46e5', borderBottomColor: isRecording ? '#ea2b2b' : '#3730a3' }}
                      onClick={() => {
                        if (isRecording) { recognitionRef.current?.stop(); }
                        else { setInputText(''); recognitionRef.current?.start(); setIsRecording(true); }
                      }}>
                      {isRecording ? '⏹️' : '🎙️'}
                    </button>
                    {inputText && !quizChecked && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '24px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', color: '#4f46e5', fontWeight: 800 }}>I heard: "{inputText}"</p>
                      </motion.div>
                    )}

                    {!quizChecked && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
                        <button onClick={() => setUseTypingFallback(true)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>⌨️ Type instead</button>
                        <button onClick={handleSkipSpeaking} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>⏭️ Skip for now</button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── ERROR CORRECTION ─────────────────────────────────────── */}
            {step.type === 'ERROR_CORRECTION' && (
              <>
                <div style={{ background: '#fef9ec', border: '2px solid #ffd700', borderRadius: '16px', padding: '20px 24px', marginBottom: '28px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Find the error</p>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', lineHeight: 1.6 }}>{step.data.sentence}</p>
                </div>
                <h2 className="quiz-question" style={{ marginBottom: '20px' }}>{step.data.question}</h2>
                <div className="quiz-options">
                  {step.data.options.map((opt: string, i: number) => {
                    let cls = 'quiz-option';
                    if (quizChecked) {
                      if (i === step.data.correct_index) cls += ' correct';
                      else if (i === selectedOption) cls += ' wrong';
                    } else if (i === selectedOption) cls += ' selected';
                    return (
                      <button key={i} className={cls} onClick={() => !quizChecked && setSelectedOption(i)}>
                        <span className="quiz-option-num">{i + 1}</span> {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── SENTENCE BUILDER (legacy) ──────────────────────────────── */}
            {step.type === 'SENTENCE_BUILDER' && (
              <>
                <div style={{ background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: '16px', padding: '16px 24px', marginBottom: '28px', textAlign: 'center' }}>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#4f46e5' }}>{step.data.prompt}</p>
                </div>
                <h2 className="quiz-question">Build the sentence</h2>
                <div style={{ minHeight: '60px', borderBottom: '2px solid #e5e5e5', marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '12px' }}>
                  {scrambleAnswer.map((w, i) => {
                    let cls = 'quiz-option';
                    if (quizChecked) cls += feedback.status === 'correct' ? ' correct' : ' wrong';
                    return (
                      <button key={`sb-ans-${i}`} className={cls} style={{ padding: '12px 20px', width: 'auto' }} onClick={() => { if (!quizChecked) setScrambleAnswer(prev => prev.filter((_, idx) => idx !== i)); }}>{w}</button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {step.data.options.map((w: string, i: number) => {
                    const isUsed = scrambleAnswer.includes(w);
                    return (
                      <button key={`sb-bank-${i}`} className="quiz-option" style={{ padding: '12px 20px', width: 'auto', background: isUsed ? '#e5e5e5' : '', borderColor: isUsed ? '#e5e5e5' : '', color: isUsed ? 'transparent' : '', pointerEvents: isUsed ? 'none' : 'auto' }} onClick={() => { if (!quizChecked && !isUsed) setScrambleAnswer(prev => [...prev, w]); }}>{w}</button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── MATCHING ─────────────────────────────────────────────── */}
            {step.type === 'MATCHING' && (
              <>
                {step.data.instruction && <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', textAlign: 'center', fontWeight: 600 }}>{step.data.instruction}</p>}
                <h2 className="quiz-question">Match the pairs</h2>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '50%' }}>
                    {step.data.pairs.map((p: any, i: number) => {
                      const isSel = matchingSelections.includes(i);
                      const isWrong = matchingWrongPairs.includes(i);
                      const selCls = isWrong ? 'wrong' : (isSel ? 'selected' : '');
                      const matCls = matchingMatched.includes(i) ? 'correct' : '';
                      return (
                        <button key={`L-${i}`} className={`quiz-option ${selCls} ${matCls}`} style={{ justifyContent: 'center' }} onClick={() => handleMatchingClick(i, true)} disabled={matCls !== '' || matchingWrongPairs.length > 0}>{p.left}</button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '50%' }}>
                    {step.data.pairs.map((p: any, i: number) => {
                      const globalIdx = i + step.data.pairs.length;
                      const isSel = matchingSelections.includes(globalIdx);
                      const isWrong = matchingWrongPairs.includes(globalIdx);
                      const selCls = isWrong ? 'wrong' : (isSel ? 'selected' : '');
                      const matCls = matchingMatched.includes(globalIdx) ? 'correct' : '';
                      return (
                        <button key={`R-${i}`} className={`quiz-option ${selCls} ${matCls}`} style={{ justifyContent: 'center' }} onClick={() => handleMatchingClick(i, false)} disabled={matCls !== '' || matchingWrongPairs.length > 0}>{p.right}</button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── SUMMARY ─────────────────────────────────────────────── */}
            {step.type === 'SUMMARY' && (
              <div className="lesson-done-wrap" style={{ padding: '20px 0' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }} style={{ fontSize: '120px', marginBottom: '10px' }}>
                  {accuracy_percent >= 80 ? '👑' : accuracy_percent >= 50 ? '🥈' : '🥉'}
                </motion.div>
                
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lesson-done-title" style={{ fontSize: '32px' }}>
                  {accuracy_percent === 100 ? 'Perfect Lesson!' : accuracy_percent >= 80 ? 'Amazing Job!' : 'Lesson Complete!'}
                </motion.h2>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ fontSize: '16px', color: '#64748b', fontWeight: 700, marginBottom: '24px' }}>
                  You just finished <span style={{ color: '#4f46e5' }}>{lesson?.title || 'this lesson'}</span>
                </motion.p>

                <div className="lesson-done-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', marginBottom: '24px' }}>
                  <div className="lesson-done-stat" style={{ padding: '16px 12px' }}>
                    <div className="lesson-done-val" style={{ fontSize: '24px' }}>{totalQuiz}</div>
                    <div className="lesson-done-label" style={{ fontSize: '11px' }}>Questions</div>
                  </div>
                  <div className="lesson-done-stat" style={{ padding: '16px 12px', borderColor: '#86efac', background: '#f0fdf4' }}>
                    <div className="lesson-done-val" style={{ fontSize: '24px', color: '#16a34a' }}>{accuracy_percent}%</div>
                    <div className="lesson-done-label" style={{ color: '#16a34a', fontSize: '11px' }}>Accuracy</div>
                  </div>
                  <div className="lesson-done-stat" style={{ padding: '16px 12px' }}>
                    <div className="lesson-done-val" style={{ fontSize: '24px', color: '#0ea5e9' }}>{timeSpentStr}</div>
                    <div className="lesson-done-label" style={{ color: '#0ea5e9', fontSize: '11px' }}>Time Spent</div>
                  </div>
                </div>

                {lesson?.xp_reward && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                    style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', borderRadius: '24px', padding: '20px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 8px 24px rgba(245,158,11,0.2)' }}>
                    <span style={{ fontSize: '32px' }}>🏆</span>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, color: 'white', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9 }}>Daily Goal Progress</p>
                      <p style={{ margin: 0, color: 'white', fontSize: '24px', fontWeight: 900 }}>+{lesson.xp_reward} XP Earned</p>
                    </div>
                  </motion.div>
                )}

                <div style={{ marginTop: '32px', width: '100%', borderTop: '2px solid #f1f5f9', paddingTop: '24px', textAlign: 'left' }}>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px' }}>Mastered Skills</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Array.from(masteredSkills).length > 0 ? Array.from(masteredSkills).map(skill => (
                      <div key={skill} style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize' }}>
                        <span style={{ color: '#10b981' }}>✓</span> {skill}
                      </div>
                    )) : (
                      <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Keep practicing to master new skills!</p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom Bar — always visible ── */}
      <AnimatePresence mode="wait">
        {feedback.show ? (
          <motion.div
            key="feedback"
            className={`feedback-banner-area ${feedback.status}`}
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
          >
            <div className="feedback-content">
              <div className={`feedback-icon ${feedback.status}`}>
                {feedback.status === 'correct' ? '✓' : feedback.status === 'almost' ? '💡' : '✗'}
              </div>
              <div className={`feedback-text ${feedback.status}`}>
                <h2>{feedback.title}</h2>
                {feedback.msg && <p>{feedback.msg}</p>}
              </div>
              <button 
                autoFocus 
                className={`lesson-continue-btn ${feedback.status === 'correct' ? 'primary' : feedback.status === 'almost' ? 'almost-btn' : 'wrong-btn'}`} 
                style={{ marginLeft: 'auto', marginBottom: 0 }} 
                onClick={goNext}
              >
                CONTINUE
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="bottombar" className="lesson-bottom-bar" initial={{ y: 0 }} animate={{ y: 0 }}>
            <div className="lesson-bottom-bar-inner">
              {step.type === 'SUMMARY' ? (
                <button className="lesson-continue-btn success" onClick={completeLesson}>FINISH LESSON</button>
              ) : isCheckableTask && !quizChecked ? (
                <button className="lesson-continue-btn primary" disabled={isInputEmpty} onClick={checkAnswer}>CHECK</button>
              ) : (
                <button className="lesson-continue-btn primary" disabled={!canContinue} onClick={goNext}>CONTINUE</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
