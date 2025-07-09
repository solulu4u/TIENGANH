import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProgressesByUser, createProgress, updateProgress as updateProgressApi } from '../utils/api';

interface LessonProgress {
  lessonId: string;
  skillType: string;
  currentSentence: number;
  completedSentences: number;
  totalSentences: number;
  score: number;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
  attempts: SentenceAttempt[];
}

interface SentenceAttempt {
  sentenceIndex: number;
  userAnswer: string;
  correctAnswer: string;
  aiFeedback: any;
  score: number;
  attemptNumber: number;
  createdAt: Date;
}

interface ProgressContextType {
  progress: { [lessonId: string]: LessonProgress };
  startLesson: (lessonId: string, skillType: string, totalSentences: number) => void;
  updateProgress: (lessonId: string, updates: Partial<LessonProgress>) => void;
  addAttempt: (lessonId: string, attempt: SentenceAttempt) => void;
  getProgress: (lessonId: string) => LessonProgress | null;
  getOverallStats: () => {
    totalLessons: number;
    completedLessons: number;
    averageScore: number;
    totalSentences: number;
  };
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

export const ProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<{ [lessonId: string]: LessonProgress }>({});

  useEffect(() => {
    const userId = localStorage.getItem('ielts_user_id');
    if (userId) {
      getProgressesByUser(userId).then(res => {
        if (res.success && Array.isArray(res.data)) {
          const progressMap: { [lessonId: string]: LessonProgress } = {};
          res.data.forEach((item: any) => {
            progressMap[item.lessonId] = {
              lessonId: item.lessonId,
              skillType: item.skillType || '',
              currentSentence: item.currentSentence || 0,
              completedSentences: item.completedSentences || 0,
              totalSentences: item.totalSentences || 0,
              score: item.score || 0,
              status: item.status || 'not_started',
              startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
              completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
              attempts: []
            }
          });
          setProgress(progressMap);
        }
      });
    }
  }, []);

  const startLesson = async (lessonId: string, skillType: string, totalSentences: number) => {
    const userId = localStorage.getItem('ielts_user_id');
    if (!userId) return;
    const res = await createProgress({ userId, lessonId, skillType, totalSentences });
    if (res.success) {
      setProgress(prev => ({
        ...prev,
        [lessonId]: {
          lessonId,
          skillType,
          currentSentence: 0,
          completedSentences: 0,
          totalSentences,
          score: 0,
          status: 'in_progress',
          startedAt: new Date(),
          attempts: []
        }
      }));
    }
  };

  const updateProgress = async (lessonId: string, updates: Partial<LessonProgress>) => {
    const userId = localStorage.getItem('ielts_user_id');
    if (!userId) return;
    await updateProgressApi({ userId, lessonId, ...updates });
    setProgress(prev => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        ...updates
      }
    }));
  };

  const addAttempt = (lessonId: string, attempt: SentenceAttempt) => {
    const lessonProgress = progress[lessonId];
    if (lessonProgress) {
      const newAttempts = [...lessonProgress.attempts, attempt];
      const avgScore = newAttempts.reduce((sum, att) => sum + att.score, 0) / newAttempts.length;
      
      updateProgress(lessonId, {
        attempts: newAttempts,
        score: avgScore,
        completedSentences: lessonProgress.completedSentences + 1,
        currentSentence: Math.min(lessonProgress.currentSentence + 1, lessonProgress.totalSentences),
        status: lessonProgress.completedSentences + 1 >= lessonProgress.totalSentences ? 'completed' : 'in_progress',
        completedAt: lessonProgress.completedSentences + 1 >= lessonProgress.totalSentences ? new Date() : undefined
      });
    }
  };

  const getProgress = (lessonId: string): LessonProgress | null => {
    return progress[lessonId] || null;
  };

  const getOverallStats = () => {
    const lessons = Object.values(progress);
    const completedLessons = lessons.filter(l => l.status === 'completed');
    const totalScore = lessons.reduce((sum, l) => sum + l.score, 0);
    const totalSentences = lessons.reduce((sum, l) => sum + l.completedSentences, 0);

    return {
      totalLessons: lessons.length,
      completedLessons: completedLessons.length,
      averageScore: lessons.length > 0 ? totalScore / lessons.length : 0,
      totalSentences
    };
  };

  return (
    <ProgressContext.Provider value={{
      progress,
      startLesson,
      updateProgress,
      addAttempt,
      getProgress,
      getOverallStats
    }}>
      {children}
    </ProgressContext.Provider>
  );
};