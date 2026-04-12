'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { lessonService } from '@/services/lessons';

/* ── Types ───────────────────────────────────────────────────────────────── */
type ProgressData = {
  user_name: string;
  level: string;
  streak: number;
  accuracy: number;
  words_known: number;
  overall_pct: number;
  total_lessons: number;
  total_completed: number;
  due_cards: number;
  units: { id: number; title: string; icon: string; order: number; total: number; completed: number; pct: number }[];
  skills: { speaking: number; vocabulary: number; grammar: number; listening: number };
  study_time: { today: number; week: number; month: number; year: number; total: number };
  heatmap: { date: string; day: string; count: number; level: number }[];
};

type VelocityStats = {
  avg_response_time_ms: number;
  avg_hesitation_score: number;
  avg_quality: number;
  total_reviews: number;
  speed_label: string;
  hesitation_label: string;
  trend: { index: number; response_time_ms: number; hesitation_score: number; quality: number }[];
  weak_areas: string[];
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmtHours = (h: number) =>
  h < 0.017 ? `${Math.round(h * 3600)}s` :
  h < 1     ? `${Math.round(h * 60)}m`   :
              `${h.toFixed(1)}h`;

const speedColor  = (l: string) => l === 'Fast' ? '#16a34a' : l === 'Moderate' ? '#f59e0b' : l === 'No data' ? '#94a3b8' : '#ef4444';
const hesColor    = (l: string) => l === 'Confident' ? '#16a34a' : l === 'Some hesitation' ? '#f59e0b' : l === 'No data' ? '#94a3b8' : '#ef4444';
const heatColors  = ['#f1f5f9', '#bfdbfe', '#60a5fa', '#2563eb'];

const CARD: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -2px rgba(0,0,0,0.05)',
  border: '1px solid #f1f5f9',
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.1em',
};

const Dots = () => (
  <span style={{ color: '#94a3b8', fontSize: '20px', letterSpacing: '4px' }}>•••</span>
);

/* ── Component ───────────────────────────────────────────────────────────── */
export default function ProgressPage() {
  const [prog,    setProg]    = useState<ProgressData | null>(null);
  const [vel,     setVel]     = useState<VelocityStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Live clock — refreshes "Today" label every minute
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Promise.all([
      lessonService.getProgress().catch(() => null),
      lessonService.getVelocityStats().catch(() => null),
    ]).then(([p, v]) => { setProg(p); setVel(v); setLoading(false); });
  }, []);

  const trend  = vel?.trend ?? [];
  const maxRt  = Math.max(...trend.map(t => t.response_time_ms), 1);

  const pct  = prog?.overall_pct ?? 0;
  const circumference = 2 * Math.PI * 45; // r=45

  const todayLabel = now.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  return (
    <DashboardLayout title="Progress" user_name={prog?.user_name}>
      <motion.div
        style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >

        {/* ══ 1. CEFR LEVEL ═══════════════════════════════════════════════ */}
        <div style={CARD}>
          <p style={{ ...SECTION_LABEL, marginBottom: '14px' }}>Current CEFR Level</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '36px', fontWeight: 900, color: '#4f46e5' }}>
                  {prog?.level ?? 'A1'}
                </span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>Beginner</span>
              </div>
              <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 16px 0' }}>
                {pct}% to A2 Elementary
              </p>

              {/* Study-time pills row */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[
                  { label: todayLabel, value: fmtHours(prog?.study_time?.today ?? 0), icon: '☀️', color: '#f59e0b' },
                  { label: 'This week',  value: fmtHours(prog?.study_time?.week  ?? 0), icon: '📅', color: '#3b82f6' },
                  { label: 'This month', value: fmtHours(prog?.study_time?.month ?? 0), icon: '🗓️', color: '#8b5cf6' },
                  { label: 'This year',  value: fmtHours(prog?.study_time?.year  ?? 0), icon: '📆', color: '#10b981' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} style={{
                    background: '#f8fafc', borderRadius: '10px', padding: '8px 14px',
                    border: '1px solid #f1f5f9', textAlign: 'center', minWidth: '80px',
                  }}>
                    <div style={{ fontSize: '16px' }}>{icon}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color }}>{loading ? '…' : value}</div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Circular progress ring */}
            <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke="#4f46e5" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
                  transition={{ duration: 1.3, ease: 'easeOut' }}
                />
              </svg>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                fontSize: '22px', fontWeight: 900, color: '#4f46e5',
              }}>
                {loading ? '…' : `${pct}%`}
              </div>
            </div>
          </div>
        </div>

        {/* ══ 2. QUICK STATS ROW ══════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
          {[
            { icon: '🎯', value: loading ? '…' : `${Math.round(prog?.accuracy ?? 0)}%`, label: 'Accuracy',    color: '#4f46e5' },
            { icon: '📚', value: loading ? '…' : (prog?.words_known ?? 0),               label: 'Words Known', color: '#16a34a' },
            { icon: '🔥', value: loading ? '…' : `${prog?.streak ?? 0}d`,                label: 'Streak',      color: '#f59e0b' },
            { icon: '🃏', value: loading ? '…' : (prog?.due_cards ?? 0),                 label: 'Reviews Due', color: '#ef4444' },
          ].map(({ icon, value, label, color }) => (
            <div key={label} style={{ ...CARD, textAlign: 'center', padding: '20px 16px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color }}>{value}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ══ 3. VELOCITY TRACKER ════════════════════════════════════════ */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ ...SECTION_LABEL, margin: 0 }}>⚡ Velocity Tracker</p>
            <Link href="/review" style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>
              Go to Review →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {/* Response Speed */}
            <div style={{ ...CARD, textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>⚡</div>
              <div style={{
                fontSize: '20px', fontWeight: 900,
                color: loading ? '#94a3b8' : speedColor(vel?.speed_label ?? ''),
                minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {loading ? <Dots /> : (vel?.speed_label ?? 'No data')}
              </div>
              <div style={{ ...SECTION_LABEL, marginTop: '6px' }}>Response Speed</div>
              {vel && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
                  avg {Math.round(vel.avg_response_time_ms)}ms
                </div>
              )}
            </div>

            {/* Hesitation Level */}
            <div style={{ ...CARD, textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🧠</div>
              <div style={{
                fontSize: '16px', fontWeight: 900,
                color: loading ? '#94a3b8' : hesColor(vel?.hesitation_label ?? ''),
                minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {loading ? <Dots /> : (vel?.hesitation_label ?? 'No data')}
              </div>
              <div style={{ ...SECTION_LABEL, marginTop: '6px' }}>Hesitation Level</div>
              {vel && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
                  score {(vel.avg_hesitation_score * 100).toFixed(0)}%
                </div>
              )}
            </div>

            {/* Total Reviews */}
            <div style={{ ...CARD, textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎯</div>
              <div style={{
                fontSize: '28px', fontWeight: 900, color: '#4f46e5',
                minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {loading ? <Dots /> : (vel?.total_reviews ?? 0)}
              </div>
              <div style={{ ...SECTION_LABEL, marginTop: '6px' }}>Total Reviews</div>
              {vel && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
                  avg quality {vel.avg_quality.toFixed(1)}/5
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ 4. RESPONSE TIME TREND ══════════════════════════════════════ */}
        <div style={CARD}>
          <p style={{ ...SECTION_LABEL, marginBottom: '20px' }}>Response Time Trend (last 7 reviews)</p>
          {trend.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>
              Complete some flashcard reviews to see your velocity trend!
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px', padding: '0 4px' }}>
              {trend.map((t, i) => {
                const h = Math.max(12, (t.response_time_ms / maxRt) * 100);
                const qc = t.quality >= 4 ? '#16a34a' : t.quality === 3 ? '#3b82f6' : '#ef4444';
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: qc }}>Q{t.quality}</div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.5, delay: i * 0.07 }}
                      style={{ width: '100%', background: qc, borderRadius: '6px 6px 0 0', opacity: 0.85, minHeight: '12px' }}
                      title={`${t.response_time_ms}ms`}
                    />
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                      {(t.response_time_ms / 1000).toFixed(1)}s
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center' }}>
            {[
              { color: '#16a34a', label: 'Fast (Q4-5)' },
              { color: '#3b82f6', label: 'Good (Q3)' },
              { color: '#ef4444', label: 'Slow (Q0-2)' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* ══ 5. UNIT PROGRESS + SKILL BREAKDOWN ══════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>

          {/* Unit Progress */}
          <div style={CARD}>
            <p style={{ ...SECTION_LABEL, marginBottom: '20px' }}>📋 Unit Progress</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {(prog?.units ?? []).map((u, i) => (
                <div key={u.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                      {u.icon} Unit {u.order}: {u.title}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: u.pct === 100 ? '#16a34a' : '#4f46e5' }}>
                      {u.completed}/{u.total} · {u.pct}%
                    </span>
                  </div>
                  <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${u.pct}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                      style={{
                        height: '100%', borderRadius: '99px',
                        background: u.pct === 100
                          ? 'linear-gradient(90deg,#16a34a,#15803d)'
                          : 'linear-gradient(90deg,#4f46e5,#7c3aed)',
                      }}
                    />
                  </div>
                </div>
              ))}
              {!prog?.units?.length && (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', padding: '20px 0' }}>
                  Complete lessons to see progress!
                </p>
              )}
            </div>
          </div>

          {/* Skill Breakdown */}
          <div style={CARD}>
            <p style={{ ...SECTION_LABEL, marginBottom: '20px' }}>🧠 Skill Breakdown</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { key: 'grammar',    label: 'Grammar',    icon: '📖', color: '#4f46e5' },
                { key: 'vocabulary', label: 'Vocabulary', icon: '📝', color: '#16a34a' },
                { key: 'speaking',   label: 'Speaking',   icon: '🎤', color: '#7c3aed' },
                { key: 'listening',  label: 'Listening',  icon: '🎧', color: '#0ea5e9' },
              ].map(({ key, label, icon, color }) => {
                const value = (prog?.skills as any)?.[key] ?? 0;
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{icon} {label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color }}>{value}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        style={{ height: '100%', background: color, borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ 6. ACTIVITY HEATMAP ════════════════════════════════════════ */}
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ ...SECTION_LABEL, margin: 0 }}>🔥 Activity — Last 30 Days</p>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>📅 Real-time</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: '5px' }}>
            {(prog?.heatmap ?? Array.from({ length: 30 }, (_, i) => ({
              date: '', day: '', count: 0, level: 0
            }))).map((day, i) => (
              <div
                key={i}
                title={day.date ? `${day.date} (${day.day}): ${day.count} activities` : ''}
                style={{
                  height: '24px', borderRadius: '4px',
                  background: heatColors[day.level],
                  border: `1px solid ${day.level > 0 ? heatColors[Math.min(day.level + 1, 3)] : '#e2e8f0'}`,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Less</span>
            {heatColors.map((c, i) => (
              <div key={i} style={{ width: '12px', height: '12px', background: c, borderRadius: '3px', border: '1px solid #e2e8f0' }} />
            ))}
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>More</span>
          </div>
        </div>

        {/* ══ 7. WEAK AREAS ══════════════════════════════════════════════ */}
        {vel && vel.weak_areas.length > 0 && (
          <div style={CARD}>
            <p style={{ ...SECTION_LABEL, color: '#f59e0b', marginBottom: '16px' }}>⚠️ Weak Areas — Focus Here</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              {vel.weak_areas.map((area, i) => (
                <span key={i} style={{
                  background: '#fef9c3', color: '#854d0e',
                  padding: '6px 14px', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 700, border: '1px solid #fde68a',
                }}>
                  {area}
                </span>
              ))}
            </div>
            <Link href="/review" style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>
              Review Weak Cards →
            </Link>
          </div>
        )}

        {/* ══ 8. ACHIEVEMENTS ════════════════════════════════════════════ */}
        <div>
          <p style={{ ...SECTION_LABEL, color: '#1e293b', marginBottom: '14px' }}>🏅 Achievements</p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {[
              { icon: '🔥', title: `${prog?.streak ?? 0}d`,                  subtitle: 'Streak',       earned: (prog?.streak ?? 0) >= 1 },
              { icon: '🎯', title: `${Math.round(prog?.accuracy ?? 0)}%`,    subtitle: 'Accuracy',     earned: (prog?.accuracy ?? 0) >= 70 },
              { icon: '📚', title: `${prog?.total_completed ?? 0}`,          subtitle: 'Lessons Done', earned: (prog?.total_completed ?? 0) > 0 },
              { icon: '⚡', title: vel?.speed_label ?? '—',                  subtitle: 'Speed',        earned: vel?.speed_label === 'Fast' },
              { icon: '🏆', title: `${prog?.overall_pct ?? 0}%`,             subtitle: 'Progress',     earned: (prog?.overall_pct ?? 0) >= 25 },
            ].map((m, idx) => (
              <div key={idx} style={{
                background: m.earned ? 'white' : '#f8fafc',
                border: `1px solid ${m.earned ? '#e0e7ff' : '#f1f5f9'}`,
                borderRadius: '14px', padding: '18px 16px', minWidth: '96px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: m.earned ? 1 : 0.45,
                boxShadow: m.earned ? '0 2px 8px rgba(79,70,229,0.08)' : 'none',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px', filter: m.earned ? 'none' : 'grayscale(1)' }}>{m.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>{m.title}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', textAlign: 'center' }}>{m.subtitle}</div>
              </div>
            ))}
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
