'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lessonService } from '@/services/lessons';
import DashboardLayout from '@/components/DashboardLayout';
import '@/styles/path.css';

/* ─── Types ──────────────────────────────────────────────────── */
type Lesson = {
  id: number;
  title: string;
  content_type: 'theory' | 'quiz' | 'speaking' | 'listening';
  order: number;
  is_completed: boolean;
};

type Unit = {
  id: number;
  title: string;
  description: string;
  icon: string;
  order: number;
  lessons: Lesson[];
};

type DashData = {
  user_name: string;
  current_level: string;
  units: Unit[];
};

/* ─── Content type meta ─────────────────────────────────────── */
const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  theory:    { icon: '📖', label: 'Lesson',    color: 'theory'    },
  quiz:      { icon: '✏️', label: 'Quiz',      color: 'quiz'      },
  speaking:  { icon: '🎤', label: 'Speaking',  color: 'speaking'  },
  listening: { icon: '🎧', label: 'Listening', color: 'listening' },
};

/* ─── AI interest labels (pulled from localStorage if set) ───── */
const getInterestLabel = () => {
  try {
    const stored = localStorage.getItem('thingual_user');
    if (stored) {
      const u = JSON.parse(stored);
      const cats: string[] = u.interest_categories || u.categories || [];
      if (cats.length > 0) return cats.slice(0, 2).join(' & ');
    }
  } catch { /* ignore */ }
  return 'Your Interests';
};

/* ─── Unit progress helper ───────────────────────────────────── */
const unitProgress = (unit: Unit) => {
  const total = unit.lessons.length;
  if (!total) return 0;
  const done = unit.lessons.filter(l => l.is_completed).length;
  return Math.round((done / total) * 100);
};

/* ─── Is unit locked? First lesson of next unit not yet active ─ */
const isUnitLocked = (units: Unit[], uIndex: number) => {
  if (uIndex === 0) return false;
  const prev = units[uIndex - 1];
  const prevDone = prev.lessons.every(l => l.is_completed);
  return !prevDone;
};

export default function PathPage() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [interestLabel, setInterestLabel] = useState('Your Interests');
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; unitTitle: string } | null>(null);

  useEffect(() => {
    setInterestLabel(getInterestLabel());
    lessonService.getDashboard()
      .then((res: DashData) => setData(res))
      .catch(() => setData(FALLBACK_DATA))
      .finally(() => setLoading(false));
  }, []);

  /* Find first active lesson (first not completed) */
  let firstActiveId: number | null = null;
  if (data?.units) {
    outer: for (const u of data.units) {
      for (const l of u.lessons) {
        if (!l.is_completed) { firstActiveId = l.id; break outer; }
      }
    }
  }

  /* Total progress across all units */
  const totalLessons = data?.units?.reduce((s, u) => s + u.lessons.length, 0) ?? 0;
  const doneLessons  = data?.units?.reduce((s, u) => s + u.lessons.filter(l => l.is_completed).length, 0) ?? 0;
  const overallPct   = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;

  return (
    <DashboardLayout title="Learning Path" user_name={data?.user_name}>
      <div className="path-wrapper">

        {/* ── Hero ─────────────────────────────────────────── */}
        <motion.div
          className="path-hero"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <p className="path-hero-label">AI-Personalized Curriculum</p>
            <h1 className="path-hero-title">
              {data?.current_level ?? 'A1'} English Journey
            </h1>
            <p className="path-hero-sub">Tailored to {interestLabel}</p>
            <div style={{ marginTop: '14px' }}>
              <span className="ai-tag">✨ AI Personalized</span>
            </div>
          </div>
          <div className="path-hero-badge">
            <div className="path-hero-level">{data?.current_level ?? 'A1'}</div>
            <div className="path-hero-level-label">CEFR Level</div>
          </div>
        </motion.div>

        {/* ── Overall Progress ─────────────────────────────── */}
        {!loading && (
          <motion.div
            className="path-overall-progress"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="path-progress-info">
              <p className="path-progress-label">Overall Progress</p>
              <div className="path-progress-bar-track">
                <motion.div
                  className="path-progress-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
            </div>
            <div className="path-progress-pct">{overallPct}%</div>
          </motion.div>
        )}

        {/* ── Loading skeletons ─────────────────────────────── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[1,2,3].map(i => <div key={i} className="path-skeleton-unit" />)}
          </div>
        )}

        {/* ── Units + Lessons Path ─────────────────────────── */}
        {!loading && data?.units?.map((unit, uIndex) => {
          const locked   = isUnitLocked(data.units, uIndex);
          const progress = unitProgress(unit);
          const allDone  = progress === 100;
          const colorIdx = uIndex % 5;

          return (
            <motion.div
              key={unit.id}
              className="unit-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + uIndex * 0.08, duration: 0.4 }}
            >
              {/* Unit Banner */}
              <div className={`unit-banner color-${colorIdx} ${locked ? 'unit-banner-locked' : ''}`}>
                <div className="unit-banner-icon">{locked ? '🔒' : unit.icon}</div>
                <div className="unit-banner-info">
                  <p className="unit-banner-num">Unit {unit.order} · {data.current_level}</p>
                  <h2 className="unit-banner-title">{unit.title}</h2>
                  <p className="unit-banner-desc">{unit.description}</p>
                  {!locked && (
                    <div className="unit-progress-bar" style={{ marginTop: '10px' }}>
                      <div className="unit-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  {locked ? (
                    <span className="unit-banner-chip">🔒 Locked</span>
                  ) : allDone ? (
                    <span className="unit-banner-chip">✅ Complete</span>
                  ) : (
                    <span className="unit-banner-chip">{unit.lessons.filter(l=>l.is_completed).length}/{unit.lessons.length} done</span>
                  )}
                </div>
              </div>

              {/* Lesson Snake Path */}
              {!locked && (
                <div className="lesson-path">
                  {unit.lessons.map((lesson, lIndex) => {
                    const isCompleted = lesson.is_completed;
                    const isActive    = lesson.id === firstActiveId;
                    const isLocked    = !isCompleted && !isActive && lIndex > 0
                      && !unit.lessons[lIndex - 1]?.is_completed
                      && unit.lessons[lIndex - 1]?.id !== firstActiveId;

                    const meta = TYPE_META[lesson.content_type] ?? TYPE_META.theory;

                    return (
                      <div
                        key={lesson.id}
                        className="lesson-node-wrap"
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedLesson({ lesson, unitTitle: unit.title });
                          }
                        }}
                      >
                        {/* Active "START" tooltip */}
                        {isActive && (
                          <div style={{ position: 'relative', width: '88px', marginBottom: '8px' }}>
                            <div className="active-label-arrow">▶  Start</div>
                          </div>
                        )}

                        {/* Circle node */}
                        <div
                          className={`lesson-node ${isCompleted ? 'completed' : isActive ? 'active' : isLocked ? 'locked' : 'active'}`}
                        >
                          <span className="node-icon">
                            {isCompleted ? '✓' : isLocked ? '🔒' : meta.icon}
                          </span>
                        </div>

                        {/* Label bubble */}
                        <div className={`lesson-label-bubble ${isLocked ? 'locked-label' : ''}`}>
                          {lesson.title}
                          <div className={`lesson-label-type ${isLocked ? 'locked' : meta.color}`}>
                            {isLocked ? '🔒 Locked' : meta.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Unit completion badge */}
                  {allDone && (
                    <motion.div
                      className="unit-complete-badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                    >
                      🏆 Unit Complete!
                    </motion.div>
                  )}
                </div>
              )}

              {/* Locked unit placeholder */}
              {locked && (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>
                  Complete Unit {unit.order - 1} to unlock this unit
                </div>
              )}
            </motion.div>
          );
        })}

      </div>

      {/* ── Lesson Preview Modal ─────────────────────────────── */}
      <AnimatePresence>
        {selectedLesson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              zIndex: 1000, backdropFilter: 'blur(4px)',
            }}
            onClick={() => setSelectedLesson(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                background: 'white',
                borderRadius: '28px 28px 0 0',
                padding: '32px 32px 48px',
                width: '100%',
                maxWidth: '680px',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '99px', margin: '0 auto 28px' }} />

              {/* Type pill */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{
                  background: '#eef2ff', color: '#4f46e5', fontSize: '11px', fontWeight: 800,
                  padding: '5px 14px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.08em'
                }}>
                  {TYPE_META[selectedLesson.lesson.content_type]?.icon} {TYPE_META[selectedLesson.lesson.content_type]?.label}
                </span>
                <span style={{ marginLeft: '8px', background: '#f1f5f9', color: '#64748b', fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '99px' }}>
                  AI Personalized
                </span>
              </div>

              <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0' }}>
                {selectedLesson.lesson.title}
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px 0', fontWeight: 500 }}>
                {selectedLesson.unitTitle}
              </p>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                {[
                  { icon: '⏱️', label: `${3 + selectedLesson.lesson.order * 2} min` },
                  { icon: '🌟', label: `+${20 + selectedLesson.lesson.order * 5} XP` },
                  { icon: '📋', label: selectedLesson.lesson.is_completed ? 'Completed ✓' : 'Not started' },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: 1, background: '#f8fafc', border: '1px solid #f1f5f9',
                    borderRadius: '12px', padding: '14px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  style={{
                    flex: 1, padding: '18px', background: '#f1f5f9', color: '#64748b',
                    border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer'
                  }}
                  onClick={() => setSelectedLesson(null)}
                >
                  Cancel
                </button>
                <button
                  style={{
                    flex: 2, padding: '18px',
                    background: selectedLesson.lesson.is_completed
                      ? 'linear-gradient(135deg, #16a34a, #15803d)'
                      : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: 'white', border: 'none', borderRadius: '16px',
                    fontSize: '16px', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(79,70,229,0.35)'
                  }}
                  onClick={() => {
                    setSelectedLesson(null);
                    router.push(`/lesson/${selectedLesson.lesson.id}`);
                  }}
                >
                  {selectedLesson.lesson.is_completed ? '🔁 Review Again' : '▶  Start Lesson'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

/* ── Fallback data (offline / API down) ─────────────────────── */
const FALLBACK_DATA: DashData = {
  user_name: 'Student',
  current_level: 'A1',
  units: [
    {
      id: 1, title: 'Greetings & Introductions', description: 'Learn hello, goodbye and introduce yourself.',
      icon: '👋', order: 1,
      lessons: [
        { id: 1, title: 'Basic Greetings', content_type: 'theory', order: 1, is_completed: true },
        { id: 2, title: 'Introducing Yourself', content_type: 'speaking', order: 2, is_completed: false },
        { id: 3, title: 'Asking About Someone', content_type: 'quiz', order: 3, is_completed: false },
        { id: 4, title: 'Greetings Listening', content_type: 'listening', order: 4, is_completed: false },
        { id: 5, title: 'Polite Expressions', content_type: 'theory', order: 5, is_completed: false },
      ]
    },
    {
      id: 2, title: 'Numbers, Colors & Descriptions', description: 'Count, name colors and describe objects.',
      icon: '🎨', order: 2,
      lessons: [
        { id: 6, title: 'Numbers 1–20', content_type: 'theory', order: 1, is_completed: false },
        { id: 7, title: 'Colors in English', content_type: 'theory', order: 2, is_completed: false },
        { id: 8, title: 'Describing Objects', content_type: 'quiz', order: 3, is_completed: false },
        { id: 9, title: 'Numbers Listening', content_type: 'listening', order: 4, is_completed: false },
        { id: 10, title: 'Describe Your Room', content_type: 'speaking', order: 5, is_completed: false },
      ]
    },
    {
      id: 3, title: 'Daily Routines & Time', description: 'Talk about your day and tell the time.',
      icon: '⏰', order: 3,
      lessons: [
        { id: 11, title: 'Telling the Time', content_type: 'theory', order: 1, is_completed: false },
        { id: 12, title: 'My Daily Routine', content_type: 'theory', order: 2, is_completed: false },
        { id: 13, title: 'Days of the Week', content_type: 'quiz', order: 3, is_completed: false },
        { id: 14, title: 'A Day in the Life', content_type: 'listening', order: 4, is_completed: false },
        { id: 15, title: 'Describe Your Routine', content_type: 'speaking', order: 5, is_completed: false },
      ]
    },
    {
      id: 4, title: 'Food & Shopping', description: 'Order food and shop at the market.',
      icon: '🛒', order: 4,
      lessons: [
        { id: 16, title: 'Food Vocabulary', content_type: 'theory', order: 1, is_completed: false },
        { id: 17, title: 'Ordering at a Restaurant', content_type: 'speaking', order: 2, is_completed: false },
        { id: 18, title: 'Shopping Expressions', content_type: 'quiz', order: 3, is_completed: false },
        { id: 19, title: 'At the Market', content_type: 'listening', order: 4, is_completed: false },
        { id: 20, title: 'Likes & Dislikes', content_type: 'speaking', order: 5, is_completed: false },
      ]
    },
    {
      id: 5, title: 'Family & Describing People', description: 'Talk about family and describe people.',
      icon: '👨‍👩‍👧‍👦', order: 5,
      lessons: [
        { id: 21, title: 'Family Members', content_type: 'theory', order: 1, is_completed: false },
        { id: 22, title: 'Describing Appearance', content_type: 'theory', order: 2, is_completed: false },
        { id: 23, title: 'Personality Adjectives', content_type: 'quiz', order: 3, is_completed: false },
        { id: 24, title: 'Meet the Family', content_type: 'listening', order: 4, is_completed: false },
        { id: 25, title: 'Describe Your Family', content_type: 'speaking', order: 5, is_completed: false },
      ]
    },
  ]
};
