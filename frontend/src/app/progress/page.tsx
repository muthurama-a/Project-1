'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { lessonService } from '@/services/lessons';

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

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
  border: '1px solid #f1f5f9',
};

export default function ProgressPage() {
  const [stats, setStats] = useState<VelocityStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    lessonService.getVelocityStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, []);

  const speedColor = (label: string) =>
    label === 'Fast' ? '#16a34a' : label === 'Moderate' ? '#ca8a04' : '#ef4444';

  const hesColor = (label: string) =>
    label === 'Confident' ? '#16a34a' : label === 'Some hesitation' ? '#ca8a04' : '#ef4444';

  // Velocity trend bar chart (last 7)
  const trend = stats?.trend ?? [];
  const maxTime = Math.max(...trend.map(t => t.response_time_ms), 1);

  return (
    <DashboardLayout title="Progress">
      <motion.div
        style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >

        {/* ── CEFR Level Banner ── */}
        <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Current CEFR Level
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6' }}>A1</span>
              <span style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b' }}>Beginner</span>
            </div>
            <p style={{ color: '#475569', fontSize: '15px', margin: 0 }}>30% to A2 Elementary</p>
          </div>
          <div style={{ width: '100px', height: '100px', position: 'relative' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#4f46e5" strokeWidth="4" strokeDasharray="30, 100" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '18px', fontWeight: 700, color: '#4f46e5' }}>
              30%
            </div>
          </div>
        </div>

        {/* ── Velocity Tracker ─────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              ⚡ Velocity Tracker
            </h3>
            <Link href="/review" style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>
              Go to Review →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Speed */}
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚡</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: loadingStats ? '#94a3b8' : speedColor(stats?.speed_label ?? '') }}>
                {loadingStats ? '…' : (stats?.speed_label ?? 'No data')}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Response Speed
              </div>
              {stats && (
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', fontWeight: 500 }}>
                  avg {Math.round(stats.avg_response_time_ms)}ms
                </div>
              )}
            </div>

            {/* Hesitation */}
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🧠</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: loadingStats ? '#94a3b8' : hesColor(stats?.hesitation_label ?? '') }}>
                {loadingStats ? '…' : (stats?.hesitation_label ?? 'No data')}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hesitation Level
              </div>
              {stats && (
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', fontWeight: 500 }}>
                  score: {(stats.avg_hesitation_score * 100).toFixed(0)}%
                </div>
              )}
            </div>

            {/* Reviews */}
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎯</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#4f46e5' }}>
                {loadingStats ? '…' : (stats?.total_reviews ?? 0)}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Reviews
              </div>
              {stats && (
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', fontWeight: 500 }}>
                  avg quality: {stats.avg_quality.toFixed(1)}/5
                </div>
              )}
            </div>
          </div>

          {/* Velocity Trend Chart */}
          <div style={cardStyle}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 20px 0' }}>
              Response Time Trend (last 7 reviews)
            </h4>
            {trend.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>
                Complete some flashcard reviews to see your velocity trend!
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px', padding: '0 4px' }}>
                {trend.map((t, i) => {
                  const h = Math.max(12, (t.response_time_ms / maxTime) * 100);
                  const qColor = t.quality >= 4 ? '#16a34a' : t.quality === 3 ? '#3b82f6' : '#ef4444';
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: qColor }}>Q{t.quality}</div>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.5, delay: i * 0.07 }}
                        style={{ width: '100%', background: qColor, borderRadius: '6px 6px 0 0', opacity: 0.85, minHeight: '12px' }}
                        title={`${t.response_time_ms}ms`}
                      />
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{(t.response_time_ms / 1000).toFixed(1)}s</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center' }}>
              {[{ color: '#16a34a', label: 'Fast (Q4-5)' }, { color: '#3b82f6', label: 'Good (Q3)' }, { color: '#ef4444', label: 'Slow (Q0-2)' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Weak Areas */}
          {stats && stats.weak_areas.length > 0 && (
            <div style={{ ...cardStyle, marginTop: '16px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px 0' }}>
                ⚠️ Weak Areas — Focus Here
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {stats.weak_areas.map((area, i) => (
                  <span key={i} style={{ background: '#fef9c3', color: '#854d0e', padding: '6px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, border: '1px solid #fde68a' }}>
                    {area}
                  </span>
                ))}
              </div>
              <Link href="/review" style={{ display: 'inline-block', marginTop: '16px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>
                Review Weak Cards →
              </Link>
            </div>
          )}
        </div>

        {/* ── Main Stats Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Knowledge Growth Graph */}
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Knowledge Base Growth
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b' }}>847</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>Words</span>
                </div>
              </div>
              <div style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 700 }}>↑ +18%</div>
            </div>
            <div style={{ flex: 1, position: 'relative', minHeight: '180px' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                {[0, 25, 50, 75, 100].map((v, i) => <line key={`h-${i}`} x1="30" y1={v * 2} x2="500" y2={v * 2} stroke="#f1f5f9" strokeWidth="1" />)}
                {[0,1,2,3,4,5,6,7,8].map((v, i) => <line key={`v-${i}`} x1={30 + v * 52.5} y1="0" x2={30 + v * 52.5} y2="200" stroke="#f1f5f9" strokeWidth="1" />)}
                <path d="M30 180 C 90 160, 150 130, 210 90 S 320 60, 480 20" fill="rgba(79,70,229,0.10)" />
                <path d="M30 180 C 90 160, 150 130, 210 90 S 320 60, 480 20" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
                {[[30,180],[90,160],[150,130],[210,90],[280,75],[350,55],[480,20]].map(([cx,cy],i)=>(
                  <circle key={i} cx={cx} cy={cy} r="4" fill="#4f46e5" />
                ))}
                <text x="0" y="200" fontSize="10" fill="#94a3b8">0</text>
                <text x="0" y="100" fontSize="10" fill="#94a3b8">500</text>
                <text x="0" y="5" fontSize="10" fill="#94a3b8">1k</text>
                {['W1','W2','W3','W4','W5','W6','W7','W8','W9'].map((v,i)=>(
                  <text key={`l-${i}`} x={25+i*53} y="215" fontSize="10" fill="#94a3b8">{v}</text>
                ))}
              </svg>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Quick Stats */}
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ flex: 1, ...cardStyle, textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#4f46e5' }}>92%</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase' }}>Accuracy</div>
              </div>
              <div style={{ flex: 1, ...cardStyle, textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a' }}>24.5h</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase' }}>Study Time</div>
              </div>
            </div>

            {/* Skill Breakdown */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '18px' }}>
                Skill Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Speaking', value: 72, color: '#4f46e5' },
                  { label: 'Vocabulary', value: 85, color: '#16a34a' },
                  { label: 'Listening', value: 68, color: '#3b82f6' },
                  { label: 'Grammar', value: 55, color: '#f59e0b' },
                ].map((skill) => (
                  <div key={skill.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{skill.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: skill.color }}>{skill.value}%</span>
                    </div>
                    <div style={{ width: '100%', height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.value}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', background: skill.color, borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Achievements ── */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🏅 Achievements
          </h3>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {[
              { icon: '🔥', title: '5-Day', subtitle: 'Streak', earned: true },
              { icon: '🎯', title: '90%', subtitle: 'Accuracy', earned: true },
              { icon: '📚', title: '5 Units', subtitle: 'A1 Complete', earned: false },
              { icon: '⚡', title: 'Speed', subtitle: 'Runner', earned: false },
              { icon: '🧠', title: 'No', subtitle: 'Hesitation', earned: false },
            ].map((medal, idx) => (
              <div key={idx} style={{
                background: medal.earned ? 'white' : '#f8fafc',
                border: `1px solid ${medal.earned ? '#e2e8f0' : '#f1f5f9'}`,
                borderRadius: '14px',
                padding: '18px 16px',
                width: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: medal.earned ? 1 : 0.5,
                boxShadow: medal.earned ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{ fontSize: '30px', marginBottom: '8px', filter: medal.earned ? 'none' : 'grayscale(1)' }}>{medal.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>{medal.title}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', textAlign: 'center' }}>{medal.subtitle}</div>
              </div>
            ))}
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
