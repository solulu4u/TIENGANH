export interface Room {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  selectedLesson?: any;
  currentSentence: number;
  settings: RoomSettings;
  createdAt: Date;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  currentProgress: number;
  answers: PlayerAnswer[];
  status: 'connected' | 'disconnected' | 'playing' | 'finished';
}

export interface PlayerAnswer {
  sentenceIndex: number;
  answer: string;
  isCorrect: boolean;
  score: number;
  timeSpent: number;
  submittedAt: Date;
}

export interface RoomSettings {
  timeLimit: number; // seconds per sentence
  maxRetries: number;
  showRealTimeScore: boolean;
  allowHints: boolean;
  lessonSelection: 'random' | 'host_choice';
}

export interface GameState {
  currentSentence: number;
  timeRemaining: number;
  isPlaying: boolean;
  leaderboard: Player[];
  totalSentences: number;
}

export interface WebSocketMessage {
  type: 'room_created' | 'room_joined' | 'player_joined' | 'player_left' | 
        'game_started' | 'sentence_completed' | 'game_finished' | 
        'score_updated' | 'room_updated' | 'error';
  data: any;
  timestamp: Date;
}