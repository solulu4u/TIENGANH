export interface GameRoom {
  id: string;
  roomName: string;
  hostId: string;
  hostName: string;
  categoryId: string;
  categoryName: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'Waiting' | 'Playing' | 'Finished';
  selectedLessonId?: string;
  selectedLessonName?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  currentProgress: number;
  status: 'Connected' | 'Disconnected' | 'Playing';
  joinedAt: string;
}

export interface GameSession {
  sessionId: string;
  roomId: string;
  selectedLessonId: string;
  totalSentences: number;
  currentSentence: number;
  startedAt: string;
  status: 'Waiting' | 'Playing' | 'Paused' | 'Finished';
  players: Player[];
  settings: GameSettings;
  lesson?: Lesson;
}

export interface GameSettings {
  timeLimit: number; // seconds per sentence
  maxRetries: number;
  showRealTimeScore: boolean;
  allowHints: boolean;
}

export interface Lesson {
  lessonId: string;
  title: string;
  description: string;
  level: string;
  sentences: string;
  accent: string;
  duration: number;
  topics: string;
  audioUrl?: string;
  youtubeUrl?: string;
  videoId?: string;
  challenges: DictationSentence[];
}

export interface DictationSentence {
  id: string;
  position: number;
  content: string;
  audioSrc?: string;
  timeStart: number;
  timeEnd: number;
  nbComments: number;
  hint?: string;
  explanation?: string;
  alwaysShowExplanation: boolean;
}

export interface CreateRoomRequest {
  roomName: string;
  maxPlayers: number;
  categoryId: string;
}

export interface JoinRoomRequest {
  roomId: string;
}

export interface LeaveRoomRequest {
  roomId: string;
}

export interface SelectLessonRequest {
  lessonId: string;
}

export interface UpdateSettingsRequest {
  timeLimit: number;
  maxRetries: number;
  showRealTimeScore: boolean;
  allowHints: boolean;
}

export interface StartGameSessionRequest {
  lessonId: string;
}

export interface GameRoomListDTO {
  id: string;
  roomName: string;
  hostName: string;
  categoryName: string;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
  createdAt: string;
}

export interface GetRoomDetailsDTO {
  id: string;
  roomName: string;
  hostId: string;
  hostName: string;
  categoryId: string;
  categoryName: string;
  maxPlayers: number;
  status: string;
  selectedLessonId?: string;
  selectedLessonName?: string;
  players: Player[];
  createdAt: string;
}

export interface PlayerDTO {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  status: string;
  joinedAt: string;
}

export interface GameSessionDTO {
  sessionId: string;
  roomId: string;
  selectedLessonId: string;
  totalSentences: number;
  currentSentence: number;
  startedAt: string;
  status: string;
  players: PlayerDTO[];
  settings: GameSettingsDTO;
  lesson?: LessonDTO;
}

export interface GameSettingsDTO {
  timeLimit: number;
  maxRetries: number;
  showRealTimeScore: boolean;
  allowHints: boolean;
}

export interface LessonDTO {
  lessonId: string;
  title: string;
  description: string;
  level: string;
  sentences: string;
  accent: string;
  duration: number;
  topics: string;
  audioUrl?: string;
  youtubeUrl?: string;
  videoId?: string;
  challenges: DictationSentenceDTO[];
}

export interface DictationSentenceDTO {
  id: string;
  position: number;
  content: string;
  audioSrc?: string;
  timeStart: number;
  timeEnd: number;
  nbComments: number;
  hint?: string;
  explanation?: string;
  alwaysShowExplanation: boolean;
}

// Custom Room type for FE, matching sampleRooms and MultiplayerRoom.tsx
export type Room = {
    id: string;
    name: string;
    hostId: string;
    hostName: string;
    players: Player[];
    maxPlayers: number;
    status: string;
    currentSentence: number;
    settings?: {
        timeLimit?: number;
        maxRetries?: number;
        showRealTimeScore?: boolean;
        allowHints?: boolean;
        lessonSelection?: string;
    };
    createdAt: Date;
    categoryId: string;
    categoryTitle: string;
    // Backend fields
    roomName?: string;
    hostAvatar?: string;
    currentPlayers?: number;
    selectedLessonId?: string;
    selectedLessonTitle?: string;
    categoryDescription?: string;
    categoryDifficult?: string;
    createdBy?: string;
};
