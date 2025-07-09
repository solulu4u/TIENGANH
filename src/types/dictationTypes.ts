// Các interface/type cho Dictation Lesson

export interface Character {
    char: string;
    status: "correct" | "incorrect" | "extra" | "missing";
    isCorrect: boolean;
    correctChar?: string;
}

export interface WordComparison {
    userWord: string;
    correctWord: string;
    status: "correct" | "partial" | "extra" | "missing";
    characters: Character[];
}

export interface Challenge {
    id: string;
    position: number;
    content: string;
    audioSrc: string | null;
    timeStart: number;
    timeEnd: number;
    solution: any[];
    hint: string | null;
    hints: any[];
    explanation: string | null;
    alwaysShowExplanation: boolean;
    nbComments: number;
}

export interface LessonData {
    lessonId: string;
    title: string;
    description: string;
    level: string;
    sentences: string;
    accent: string;
    duration: number;
    topics: string;
    audioUrl: string | null;
    youtubeUrl: string | null;
    videoId: string | null;
    videoTitle: string | null;
    vocabLevel: string | null;
    speechToTextLangCode: string | null;
    challenges: Challenge[];
} 