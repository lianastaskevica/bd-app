'use client';

import { useState } from 'react';
import styles from './CallDetailTabs.module.scss';

interface Call {
  id: string;
  callTitle: string;
  callDate: Date;
  organizer: string;
  participants: string[];
  transcript: string;
  aiAnalysis: string | null;
  aiRating: number | null;
  aiSentiment: string | null;
  aiStrengths: string[];
  aiAreasForImprovement: string[];
}

export function CallDetailTabs({ call }: { call: Call }) {
  const [activeTab, setActiveTab] = useState<'transcript' | 'analysis'>('transcript');

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'transcript' ? styles.active : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          📄 Transcript
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'analysis' ? styles.active : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          ✨ AI Analysis
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'transcript' && (
          <div className={styles.transcript}>
            {call.transcript}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className={styles.analysis}>
            {call.aiAnalysis ? (
              <>
                <div className={styles.summarySection}>
                  <div className={styles.sectionHeader}>
                    <h3>✨ Summary</h3>
                  </div>
                  <p className={styles.summaryText}>{call.aiAnalysis}</p>
                  {call.aiSentiment && (
                    <div className={styles.sentiment}>
                      <span className={styles.sentimentLabel}>Sentiment:</span>
                      <span 
                        className={styles.sentimentValue}
                        style={{
                          color: call.aiSentiment === 'Positive' ? 'var(--success)' : 
                                 call.aiSentiment === 'Negative' ? 'var(--error)' : 
                                 'var(--text-secondary)'
                        }}
                      >
                        {call.aiSentiment}
                      </span>
                    </div>
                  )}
                </div>

                {call.aiStrengths && call.aiStrengths.length > 0 && (
                  <div className={styles.strengthsSection}>
                    <div className={styles.sectionHeader}>
                      <h3>👍 Strengths</h3>
                    </div>
                    <ul className={styles.bulletList}>
                      {call.aiStrengths.map((strength, index) => (
                        <li key={index} className={styles.bulletItem}>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {call.aiAreasForImprovement && call.aiAreasForImprovement.length > 0 && (
                  <div className={styles.improvementSection}>
                    <div className={styles.sectionHeader}>
                      <h3>⚠️ Areas for Improvement</h3>
                    </div>
                    <ul className={styles.bulletList}>
                      {call.aiAreasForImprovement.map((area, index) => (
                        <li key={index} className={styles.bulletItem}>
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noAnalysis}>
                <p>No AI analysis available for this call.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

