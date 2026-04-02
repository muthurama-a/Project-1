'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { lessonService } from '@/services/lessons';

export default function ProfilePage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // In a real app we'd fetch full profile details
    // Here we can use the dashboard data + local storage as a mock
    const fetchProfileData = async () => {
      try {
        const res = await lessonService.getDashboard();
        
        // Calculate lessons completed from units
        let completedCount = 0;
        if (res.units) {
          res.units.forEach((u: any) => {
            if (u.lessons) {
              u.lessons.forEach((l: any) => {
                if (l.is_completed) completedCount++;
              });
            }
          });
        }
        res.lessons_completed = completedCount;
        
        setData(res);
      } catch (err) {
        const stored = localStorage.getItem('thingual_user');
        const userObj = stored ? JSON.parse(stored) : null;
        setData({
          user_name: userObj?.name || 'Student',
          current_level: 'A1',
          streak: 0,
          words_known: 0,
          lessons_completed: 0,
          accuracy: 0,
          created_at: userObj?.created_at || new Date().toISOString()
        });
      }
    };
    fetchProfileData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('thingual_user');
    localStorage.removeItem('thingual_token');
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const userName = data?.user_name || 'Student';
  const initial = userName.charAt(0).toUpperCase();

  return (
    <DashboardLayout title="Profile" user_name={userName}>
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
        style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}
      >
        
        {/* Profile Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700,
            marginBottom: '16px', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            {initial}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>{userName}</h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px 0' }}>
            Member since {new Date(data?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          
          <div style={{
             background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '100px',
             padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600
          }}>
             <span style={{ color: '#f59e0b', fontWeight: 700 }}>{data?.current_level || 'A1'}</span>
             <span style={{ color: '#cbd5e1' }}>|</span>
             <span style={{ color: '#2563eb' }}>English 🎗️</span>
          </div>
        </div>

        {/* Stats Banner */}
        <div style={{
          background: 'linear-gradient(90deg, #3b82f6, #0ea5e9)',
          borderRadius: '16px',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          color: 'white',
          marginBottom: '40px',
          boxShadow: '0 10px 25px rgba(59,130,246,0.25)'
        }}>
           {[
             { val: data?.streak ?? 0, label: 'Day Streak' },
             { val: data?.words_known ?? 0, label: 'Words' },
             { val: data?.lessons_completed ?? 0, label: 'Lessons' },
             { val: (data?.accuracy ?? 0) + '%', label: 'Accuracy' }
           ].map(stat => (
             <div key={stat.label} style={{ textAlign: 'center' }}>
               <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.2 }}>{stat.val}</div>
               <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>{stat.label}</div>
             </div>
           ))}
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Account Settings */}
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Account</h3>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
               {[
                 { icon: '⚙️', title: 'Account Settings', desc: 'Password, email, privacy' },
                 { icon: '📖', title: 'Adjust Curriculum', desc: 'Update your interests' },
                 { icon: '👑', title: 'Subscription', desc: 'Pro • Renews Feb 21, 2027', pro: true }
               ].map((item, i, arr) => (
                 <div key={item.title} style={{
                   display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px',
                   borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer'
                 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <div style={{ width: '36px', height: '36px', background: '#eff6ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{item.icon}</div>
                     <div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{item.title}</span>
                         {item.pro && <span style={{ background: '#e0e7ff', color: '#4f46e5', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>PRO</span>}
                       </div>
                       <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                     </div>
                   </div>
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                 </div>
               ))}
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Preferences</h3>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
               {[
                 { icon: '🔔', title: 'Notifications', desc: 'Reminders & alerts' },
                 { icon: '🔒', title: 'Privacy', desc: 'Data & permissions' }
               ].map((item, i, arr) => (
                 <div key={item.title} style={{
                   display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px',
                   borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer'
                 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <div style={{ width: '36px', height: '36px', background: '#eff6ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{item.icon}</div>
                     <div>
                       <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{item.title}</div>
                       <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                     </div>
                   </div>
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                 </div>
               ))}
            </div>
          </div>

        </div>

        {/* Logout */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
           <button 
             onClick={handleLogout}
             style={{
               display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '14px', fontWeight: 600,
               background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 16px', transition: 'opacity 0.2s'
             }}
             onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
             onMouseOut={e => e.currentTarget.style.opacity = '1'}
           >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
             </svg>
             Log out
           </button>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
