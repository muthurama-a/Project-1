'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { lessonService } from '@/services/lessons';
import '@/styles/review.css';

type Card = {
  id: number;
  front: string;
  back: string;
  is_weak: boolean;
  interval: number;
  repetitions: number;
  easiness: number;
  correct_count: number;
  incorrect_count: number;
};

type SessionSummary = {
  total: number;
  correct: number;
  avgTime: number;
  avgHesitation: number;
};

export default function ReviewPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'due' | 'weak'>('due');
  const [cards, setCards] = useState<Card[]>([]);
  const [weakCards, setWeakCards] = useState<Card[]>([]);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [results, setResults] = useState<{ id: number; correct: boolean; time: number; hes: number }[]>([]);
  
  // Velocity tracking
  const cardStartRef = useRef<number>(0);
  const flipTimeRef = useRef<number>(0);
  const hesitationRef = useRef<number>(0);

  useEffect(() => { fetchCards(); }, []);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const [due, weak] = await Promise.all([
        lessonService.getDueCards(30),
        lessonService.getWeakCards()
      ]);
      setCards(due || []);
      setWeakCards(weak || []);
    } catch (e) {
      setCards(MOCK_CARDS);
      setWeakCards(MOCK_WEAK_CARDS);
    }
    setLoading(false);
  };

  const startSession = (type: 'due' | 'weak') => {
    const source = type === 'due' ? cards : weakCards;
    if (!source.length) return;
    setSessionCards(source.slice(0, 20));
    setCurrentIndex(0);
    setFlipped(false);
    setAnswered(false);
    setSessionDone(false);
    setResults([]);
    setSessionActive(true);
    cardStartRef.current = Date.now();
    hesitationRef.current = 0;
  };

  const handleFlip = () => {
    if (!flipped) {
      flipTimeRef.current = Date.now();
      setFlipped(true);
    }
  };

  const handleAnswer = useCallback(async (correct: boolean) => {
    if (answered) return;
    setAnswered(true);

    const now = Date.now();
    const responseTimeMs = flipTimeRef.current - cardStartRef.current;
    const answerDurationMs = now - flipTimeRef.current;
    const hesCount = hesitationRef.current;
    const card = sessionCards[currentIndex];

    // Log result
    setResults(prev => [...prev, {
      id: card.id,
      correct,
      time: responseTimeMs,
      hes: hesCount
    }]);

    // Submit to backend (don't await to keep UI snappy)
    try {
      await lessonService.submitSM2({
        card_id: card.id,
        is_correct: correct,
        response_time_ms: Math.max(0, responseTimeMs),
        answer_duration_ms: Math.max(0, answerDurationMs),
        hesitation_count: hesCount,
      });
    } catch (e) { /* offline mode ok */ }

    // Move to next card after a brief delay
    setTimeout(() => {
      if (currentIndex + 1 >= sessionCards.length) {
        endSession();
      } else {
        setCurrentIndex(idx => idx + 1);
        setFlipped(false);
        setAnswered(false);
        cardStartRef.current = Date.now();
        hesitationRef.current = 0;
      }
    }, 600);
  }, [answered, currentIndex, sessionCards]);

  const endSession = () => {
    const allResults = results;
    const correct = allResults.filter(r => r.correct).length + (allResults.length > 0 ? 0 : 0);
    const total = sessionCards.length;
    const avgTime = allResults.length ? allResults.reduce((s, r) => s + r.time, 0) / allResults.length : 0;
    const avgHes = allResults.length ? allResults.reduce((s, r) => s + r.hes, 0) / allResults.length : 0;
    setSummary({ total, correct: allResults.filter(r => r.correct).length, avgTime, avgHesitation: avgHes });
    setSessionDone(true);
    setSessionActive(false);
    fetchCards(); // Refresh counts
  };

  // ── Intensity calendar (last 35 days mock) ──────────────────────────────
  const intensityData = Array.from({ length: 35 }, (_, i) => Math.random() > 0.45 ? Math.ceil(Math.random() * 3) : 0);

  // ── Session card ────────────────────────────────────────────────────────
  if (sessionActive && !sessionDone) {
    const card = sessionCards[currentIndex];
    const progress = ((currentIndex) / sessionCards.length) * 100;

    return (
      <DashboardLayout title="Flashcard Review">
        <div className="review-session-wrapper">
          {/* Progress bar */}
          <div className="review-progress-bar-wrap">
            <div className="review-progress-bar-track">
              <motion.div className="review-progress-bar-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
            </div>
            <span className="review-progress-count">{currentIndex + 1} / {sessionCards.length}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={card.id + '-' + currentIndex}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -80 }}
              className="flashcard-scene"
              onClick={!flipped ? handleFlip : undefined}
            >
              {/* Flashcard */}
              <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
                {/* Front */}
                <div className="flashcard-face flashcard-front">
                  {card.is_weak && <span className="weak-badge">⚠️ Weak Area</span>}
                  <p className="flashcard-label">What does this mean?</p>
                  <h2 className="flashcard-word">{card.front}</h2>
                  {!flipped && <p className="flashcard-hint">Tap to reveal answer</p>}
                </div>
                {/* Back */}
                <div className="flashcard-face flashcard-back">
                  <p className="flashcard-label">Answer</p>
                  <h2 className="flashcard-word">{card.back}</h2>
                  <p className="flashcard-stats-mini">
                    EF: {card.easiness?.toFixed(1)} · Interval: {card.interval}d · Reps: {card.repetitions}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Answer buttons */}
          <AnimatePresence>
            {flipped && !answered && (
              <motion.div
                className="review-answer-buttons"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  className="review-btn review-btn-wrong"
                  onClick={() => handleAnswer(false)}
                >
                  <span className="review-btn-icon">✗</span>
                  Didn&apos;t Know
                </button>
                <button
                  className="review-btn review-btn-hard"
                  onClick={() => { hesitationRef.current += 2; handleAnswer(true); }}
                >
                  <span className="review-btn-icon">〜</span>
                  Hard
                </button>
                <button
                  className="review-btn review-btn-good"
                  onClick={() => { hesitationRef.current += 1; handleAnswer(true); }}
                >
                  <span className="review-btn-icon">✓</span>
                  Good
                </button>
                <button
                  className="review-btn review-btn-easy"
                  onClick={() => handleAnswer(true)}
                >
                  <span className="review-btn-icon">⚡</span>
                  Easy
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {answered && (
            <motion.div className="review-answer-feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Next card…
            </motion.div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ── Session done ────────────────────────────────────────────────────────
  if (sessionDone && summary) {
    const accuracy = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;
    const speedLabel = summary.avgTime < 1500 ? '⚡ Fast' : summary.avgTime < 3500 ? '📘 Moderate' : '🐢 Slow';
    return (
      <DashboardLayout title="Review Complete">
        <motion.div
          className="review-done-wrapper"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="review-done-emoji">{accuracy >= 80 ? '🏆' : accuracy >= 50 ? '💪' : '📚'}</div>
          <h1 className="review-done-title">Session Complete!</h1>
          <p className="review-done-subtitle">{accuracy >= 80 ? 'Outstanding work!' : accuracy >= 50 ? 'Good effort! Keep going!' : 'Review these cards again soon.'}</p>

          <div className="review-done-stats">
            <div className="review-done-stat">
              <div className="review-done-stat-val">{accuracy}%</div>
              <div className="review-done-stat-label">Accuracy</div>
            </div>
            <div className="review-done-stat">
              <div className="review-done-stat-val">{summary.correct}/{summary.total}</div>
              <div className="review-done-stat-label">Cards Correct</div>
            </div>
            <div className="review-done-stat">
              <div className="review-done-stat-val">{speedLabel}</div>
              <div className="review-done-stat-label">Speed</div>
            </div>
          </div>

          <div className="review-done-actions">
            <button className="review-done-btn-primary" onClick={() => { setSessionDone(false); startSession(tab); }}>
              Review Again
            </button>
            <button className="review-done-btn-secondary" onClick={() => router.push('/dashboard')}>
              Back to Home
            </button>
          </div>
        </motion.div>
      </DashboardLayout>
    );
  }

  // ── Main Review Page ─────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Review">
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>

        {/* Hero Header */}
        <div className="review-header-card">
          <div className="review-info">
            <h3 className="review-header-title">Ready to Review 🧠</h3>
            <p className="review-header-sub">
              {loading ? 'Loading cards…' : `${cards.length} due · ${weakCards.length} weak areas`}
            </p>
          </div>
          <button
            className="review-start-btn"
            onClick={() => startSession(tab)}
            disabled={loading || (tab === 'due' ? !cards.length : !weakCards.length)}
          >
            ▶
          </button>
        </div>

        {/* Tabs */}
        <div className="review-tabs">
          <button className={`review-tab ${tab === 'due' ? 'active' : ''}`} onClick={() => setTab('due')}>
            📅 Due Now <span className="review-tab-badge">{cards.length}</span>
          </button>
          <button className={`review-tab ${tab === 'weak' ? 'active' : ''}`} onClick={() => setTab('weak')}>
            ⚠️ Weak Areas <span className="review-tab-badge weak">{weakCards.length}</span>
          </button>
        </div>

        <div className="review-grid">

          {/* Intensity Calendar */}
          <section className="intensity-calendar">
            <h4 className="intensity-title">Review Intensity Calendar</h4>
            <div className="calendar-grid">
              {intensityData.map((lvl, i) => (
                <div
                  key={i}
                  className={`calendar-cell lvl-${lvl}`}
                  title={`${lvl === 0 ? 'No reviews' : lvl === 1 ? 'Light' : lvl === 2 ? 'Moderate' : 'Heavy'}`}
                />
              ))}
            </div>
            <div className="calendar-legend">
              <span>LESS</span>
              <div className="calendar-legend-dots">
                {[0, 1, 2, 3].map(l => <div key={l} className={`legend-dot lvl-${l}`} />)}
              </div>
              <span>MORE</span>
            </div>
          </section>

          {/* Card List */}
          <section className="review-card-list">
            {loading ? (
              <div className="review-loading">Loading your cards…</div>
            ) : (
              <>
                {/* Due Cards */}
                {tab === 'due' && (
                  <div>
                    <h4 className="review-section-title due">
                      <span className="dot-pulse" />
                      Due Now ({cards.length})
                    </h4>
                    {cards.length === 0 ? (
                      <div className="review-empty">🎉 All caught up! No cards due.</div>
                    ) : (
                      <div className="card-list">
                        {cards.slice(0, 8).map((c) => (
                          <div key={c.id} className="card-list-item">
                            <div>
                              <div className="card-list-front">{c.front}</div>
                              <div className="card-list-meta">
                                Interval: {c.interval}d · EF: {c.easiness?.toFixed(1)}
                              </div>
                            </div>
                            <span className="card-list-due">Due</span>
                          </div>
                        ))}
                        {cards.length > 8 && (
                          <div className="card-list-more">+{cards.length - 8} more cards</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Weak Areas */}
                {tab === 'weak' && (
                  <div>
                    <h4 className="review-section-title weak-title">
                      <span className="dot-weak" />
                      Weak Areas ({weakCards.length})
                    </h4>
                    {weakCards.length === 0 ? (
                      <div className="review-empty">✅ No weak areas detected yet. Keep reviewing!</div>
                    ) : (
                      <div className="card-list">
                        {weakCards.map((c) => (
                          <div key={c.id} className="card-list-item weak">
                            <div>
                              <div className="card-list-front">{c.front}</div>
                              <div className="card-list-meta">
                                Wrong: {c.incorrect_count}x · Right: {c.correct_count}x
                              </div>
                            </div>
                            <span className="card-list-weak-badge">⚠️ Weak</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

        </div>
      </motion.div>
    </DashboardLayout>
  );
}

// Mock data for offline / empty state
const MOCK_CARDS: Card[] = [
  { id: 1, front: 'Hello', back: 'A standard greeting used anytime', is_weak: false, interval: 1, repetitions: 0, easiness: 2.5, correct_count: 0, incorrect_count: 0 },
  { id: 2, front: 'Good morning', back: 'Used before 12 PM', is_weak: false, interval: 1, repetitions: 0, easiness: 2.5, correct_count: 2, incorrect_count: 0 },
  { id: 3, front: 'Thank you', back: 'Showing gratitude', is_weak: false, interval: 6, repetitions: 2, easiness: 2.6, correct_count: 4, incorrect_count: 0 },
];
const MOCK_WEAK_CARDS: Card[] = [
  { id: 4, front: 'Quarter past', back: '15 minutes past the hour', is_weak: true, interval: 1, repetitions: 0, easiness: 1.7, correct_count: 1, incorrect_count: 3 },
  { id: 5, front: 'Excuse me', back: 'Getting someone\'s attention', is_weak: true, interval: 1, repetitions: 0, easiness: 1.9, correct_count: 2, incorrect_count: 4 },
];
