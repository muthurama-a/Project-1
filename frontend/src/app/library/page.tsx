'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const LIBRARY_WORDS = [
  { id: 1, word: 'Serendipity', meaning: 'Finding good things without looking', progress: 4, maxProgress: 5, due: '4day' },
  { id: 2, word: 'Ephemeral', meaning: 'Lasting for a very short time', progress: 3, maxProgress: 5, due: '2day' },
  { id: 3, word: 'Ubiquitous', meaning: 'Present, appearing, or found everywhere', progress: 5, maxProgress: 5, due: '7day' },
  { id: 4, word: 'Eloquent', meaning: 'Fluent or persuasive in speaking or writing', progress: 2, maxProgress: 5, due: '1day' },
  { id: 5, word: 'Fastidious', meaning: 'Very attentive to accuracy and detail', progress: 4, maxProgress: 5, due: '4day' },
];

export default function LibraryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWords = LIBRARY_WORDS.filter(w => 
    w.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.meaning.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Library">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            Mastery Library
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            {LIBRARY_WORDS.length} words mastered · Tap to review
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="Search words, meanings"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 44px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '15px',
              color: '#1e293b',
              background: '#ffffff',
              outline: 'none',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Words List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredWords.map((item) => (
            <div 
              key={item.id} 
              style={{
                background: '#ffffff',
                border: '1px solid #f1f5f9',
                borderRadius: '12px',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              {/* Left Side: Word and Meaning */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                    {item.word}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  {item.meaning}
                </div>
              </div>

              {/* Right Side: Progress, Due Date, Expand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                
                {/* Progress Bars & Due */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {Array.from({ length: item.maxProgress }).map((_, i) => (
                      <div 
                        key={i} 
                        style={{
                          width: '6px',
                          height: '20px',
                          borderRadius: '3px',
                          background: i < item.progress ? '#3b82f6' : '#e2e8f0'
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    Due : {item.due}
                  </div>
                </div>

                {/* Arrow Down */}
                <div style={{ color: '#94a3b8' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          ))}
          
          {filteredWords.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              No words found matching "{searchTerm}"
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
