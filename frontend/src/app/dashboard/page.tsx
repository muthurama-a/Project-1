'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { lessonService } from '@/services/lessons';
import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardPage() {
  const [data, setData]: any = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await lessonService.getDashboard();
      
      // Replace Unit 1 lesson IDs with local JSON slugs but KEEP real is_completed from DB
      if (res && res.units) {
        const unit1 = res.units.find((u: any) => u.title.includes('Greetings') || u.order === 1 || u.id === 1);
        if (unit1) {
          // Grab is_completed state from DB lessons by order position
          const dbCompleted: boolean[] = (unit1.lessons ?? []).map((l: any) => Boolean(l.is_completed));
          unit1.lessons = [
            { id: 'a1_unit1_lesson01', title: 'Hello & Goodbye',                  content_type: 'theory',   order: 1, is_completed: dbCompleted[0] ?? false },
            { id: 'a1_unit1_lesson02', title: 'Who am I? — Introducing yourself', content_type: 'speaking', order: 2, is_completed: dbCompleted[1] ?? false },
            { id: 'a1_unit1_lesson03', title: 'Asking about others',              content_type: 'quiz',     order: 3, is_completed: dbCompleted[2] ?? false },
            { id: 'a1_unit1_lesson04', title: 'Family & Friends',                 content_type: 'theory',   order: 4, is_completed: dbCompleted[3] ?? false },
            { id: 'a1_unit1_lesson05', title: 'Where I live',                     content_type: 'theory',   order: 5, is_completed: dbCompleted[4] ?? false },
            { id: 'a1_unit1_lesson06', title: 'Daily Routines',                   content_type: 'quiz',     order: 6, is_completed: dbCompleted[5] ?? false },
            { id: 'a1_unit1_lesson07', title: 'Hobbies & Preferences',            content_type: 'speaking', order: 7, is_completed: dbCompleted[6] ?? false },
            { id: 'a1_unit1_lesson08', title: 'Unit 1 Review',                    content_type: 'quiz',     order: 8, is_completed: dbCompleted[7] ?? false },
          ];
        }
      }
      
      setData(res);
    } catch (err) {
      console.error('Dashboard fetch failed — using local fallback', err);
      const stored = localStorage.getItem('thingual_user');
      const userObj = stored ? JSON.parse(stored) : null;
      setData({
        user_name: userObj?.name || 'Student',
        current_level: 'A1',
        streak: 0,
        accuracy: 0,
        words_known: 500,
        hours_total: 0,
        due_cards_count: 0,
        weak_areas: [],
        units: [{
          id: 1,
          title: 'Greetings & Introductions',
          description: 'Learn how to say hello, introduce yourself, and talk about your life.',
          icon: '👋',
          order: 1,
          lessons: [
            { id: 'a1_unit1_lesson01', title: 'Hello & Goodbye', content_type: 'theory', order: 1, is_completed: false },
            { id: 'a1_unit1_lesson02', title: 'Who am I? — Introducing yourself', content_type: 'speaking', order: 2, is_completed: false },
            { id: 'a1_unit1_lesson03', title: 'Asking about others', content_type: 'quiz', order: 3, is_completed: false },
            { id: 'a1_unit1_lesson04', title: 'Family & Friends', content_type: 'theory', order: 4, is_completed: false },
            { id: 'a1_unit1_lesson05', title: 'Where I live', content_type: 'theory', order: 5, is_completed: false },
            { id: 'a1_unit1_lesson06', title: 'Daily Routines', content_type: 'quiz', order: 6, is_completed: false },
            { id: 'a1_unit1_lesson07', title: 'Hobbies & Preferences', content_type: 'speaking', order: 7, is_completed: false },
            { id: 'a1_unit1_lesson08', title: 'Unit 1 Review', content_type: 'quiz', order: 8, is_completed: false },
          ],
        }],
      });
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = (): string => {
    try {
      // Use Intl API to get accurate local hour based on user's timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const h = parseInt(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(new Date()),
        10
      );
      if (h >= 5 && h < 12) return 'Good morning,';
      if (h >= 12 && h < 17) return 'Good afternoon,';
      if (h >= 17 && h < 21) return 'Good evening,';
      return 'Good night,'; // 9 PM – 5 AM
    } catch {
      // Safe fallback
      const h = new Date().getHours();
      if (h < 12) return 'Good morning,';
      if (h < 17) return 'Good afternoon,';
      if (h < 21) return 'Good evening,';
      return 'Good night,';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563EB' }}>Loading your path…</div>
        </div>
      </DashboardLayout>
    );
  }

  let activeUnit = data?.units?.[0];
  let activeLesson = activeUnit?.lessons?.[0];
  let unitProgress = 0;

  if (data?.units) {
    outer: for (const u of data.units) {
      if (u.lessons) {
        let completedInUnit = 0;
        for (const l of u.lessons) {
          if (l.is_completed) completedInUnit++;
        }
        for (const l of u.lessons) {
          if (!l.is_completed) {
            activeUnit = u;
            activeLesson = l;
            unitProgress = u.lessons.length ? Math.round((completedInUnit / u.lessons.length) * 100) : 0;
            break outer;
          }
        }
      }
    }
  }

  return (
    <DashboardLayout title="Dashboard" user_name={data?.user_name || 'Student'}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>{getGreeting()}</p>
          <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
            {data?.user_name || 'Student'} 👋
          </h2>
        </div>

        {/* ── Streak Banner ── */}
        <div style={{
          background: 'linear-gradient(90deg, #ff8c00, #ff4500)',
          borderRadius: '14px',
          padding: '18px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          boxShadow: '0 8px 24px rgba(255,110,0,0.2)',
        }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: '16px', color: 'white', margin: '0 0 4px 0' }}>
              {data?.streak || 0}-Day Streak! {data?.streak > 0 ? '🔥' : '✊'}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
              {data?.streak > 0 ? 'Keep it up — you\'re on fire!' : 'Complete a lesson to start your streak!'}
            </p>
          </div>
          {/* Streak indicator bars */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{
                width: '3px',
                height: '20px',
                borderRadius: '3px',
                background: i < (data?.streak || 0) ? 'white' : 'rgba(255,255,255,0.28)',
              }} />
            ))}
          </div>
        </div>

        {/* ── Two-Column Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start' }}>

          {/* LEFT — Today's Focus */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Today&apos;s Focus
              </span>
              <Link href="/path" style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>
                View all
              </Link>
            </div>

            {/* Focus Card */}
            <div style={{
              background: 'white',
              borderRadius: '14px',
              padding: '24px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: '20px',
              position: 'relative',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{
                  background: '#EFF6FF',
                  color: '#2563EB',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: '1px solid #DBEAFE',
                }}>
                  AI - PERSONALIZED
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px' }}>
                  5 min
                </span>
              </div>

              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>
                {activeLesson?.title || 'Language Basics'}
              </h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', fontWeight: 500 }}>
                Unit {activeUnit?.order || 1}: {activeUnit?.title || 'Build your English foundation.'}
              </p>

              {/* Progress Bar Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ flex: 1, height: '5px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: '#2563EB', borderRadius: '99px' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${unitProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB' }}>{unitProgress}%</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #f8fafc' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
                  English · {data?.current_level || 'A1'}
                </span>
                <Link
                  href={activeLesson ? `/lesson/${activeLesson.id}` : "/path"}
                  style={{
                    width: '36px',
                    height: '36px',
                    background: '#2563EB',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '18px',
                    fontWeight: 300,
                    boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
                  }}
                >
                  ›
                </Link>
              </div>
            </div>

            {/* Sub-action Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Reviews Due */}
              <Link href="/review" style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'white',
                  borderRadius: '14px',
                  padding: '20px',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: '#dcfce7',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{data?.due_cards_count ?? 0}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', margin: '2px 0' }}>Reviews Due</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>Start Review ›</div>
                  </div>
                </div>
              </Link>

              {/* View Full Path */}
              <Link href="/path" style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'white',
                  borderRadius: '14px',
                  padding: '20px',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: '#dbeafe',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '22px'
                  }}>
                    🗺️
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>All Units</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', margin: '2px 0' }}>Learning Path</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB' }}>View ›</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* RIGHT — Stats + Upcoming */}
          <div>
            {/* Your Stats */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Your Stats
              </span>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '14px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              overflow: 'hidden',
              marginBottom: '28px',
            }}>
              {[
                { label: 'Accuracy', value: `${data?.accuracy || 0}%` },
                { label: 'Words Known', value: data?.words_known || 0 },
                { label: 'Hrs Total', value: data?.hours_total || 0 },
              ].map((stat, i, arr) => (
                <div key={stat.label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>{stat.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#2563EB' }}>{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Upcoming — real next lessons */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Up Next
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                const upcoming: { title: string; type: string; unitTitle: string; id: number }[] = [];
                let skip = true;
                for (const u of data?.units ?? []) {
                  for (const l of u.lessons ?? []) {
                    if (skip && !l.is_completed) skip = false;
                    if (!skip && !l.is_completed && upcoming.length < 3) {
                      upcoming.push({ title: l.title, type: l.content_type, unitTitle: u.title, id: l.id });
                    }
                  }
                }
                // skip the very first (it's "Today's Focus") — show next 2
                const show = upcoming.slice(1, 3);
                if (!show.length) return (
                  <div style={{ fontSize: '13px', color: '#94a3b8', padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                    🎉 All caught up!
                  </div>
                );
                const typeIcon: Record<string, string> = { theory: '📖', quiz: '✏️', speaking: '🎤', listening: '🎧' };
                return show.map((item) => (
                  <a key={item.id} href="/path" style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'white', borderRadius: '10px', padding: '12px 16px',
                      border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '20px', flexShrink: 0 }}>{typeIcon[item.type] ?? '📖'}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.unitTitle}</div>
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: '8px' }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </a>
                ));
              })()}
            </div>
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
