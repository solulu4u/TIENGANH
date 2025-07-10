import type { Room, Player } from '../types/multiplayer';

export const sampleRooms: Room[] = [
  {
    id: 'room-1',
    name: 'English Masters Challenge',
    hostId: 'user-1',
    hostName: 'Sarah Chen',
    players: [
      {
        id: 'user-1',
        name: 'Sarah Chen',
        avatar: 'SC',
        isHost: true,
        isReady: true,
        score: 0,
        currentProgress: 0,
        answers: [],
        status: 'connected'
      },
      {
        id: 'user-2',
        name: 'Michael Rodriguez',
        avatar: 'MR',
        isHost: false,
        isReady: false,
        score: 0,
        currentProgress: 0,
        answers: [],
        status: 'connected'
      }
    ],
    maxPlayers: 6,
    status: 'waiting',
    currentSentence: 0,
    settings: {
      timeLimit: 60,
      maxRetries: 2,
      showRealTimeScore: true,
      allowHints: true,
      lessonSelection: 'host_choice'
    },
    createdAt: new Date()
  },
  {
    id: 'room-2',
    name: 'Quick Practice Room',
    hostId: 'user-3',
    hostName: 'Emma Wilson',
    players: [
      {
        id: 'user-3',
        name: 'Emma Wilson',
        avatar: 'EW',
        isHost: true,
        isReady: true,
        score: 0,
        currentProgress: 0,
        answers: [],
        status: 'connected'
      }
    ],
    maxPlayers: 4,
    status: 'waiting',
    currentSentence: 0,
    settings: {
      timeLimit: 45,
      maxRetries: 1,
      showRealTimeScore: true,
      allowHints: false,
      lessonSelection: 'random'
    },
    createdAt: new Date()
  }
];

export const sampleGameResults = {
  roomId: 'room-1',
  finalScores: [
    {
      playerId: 'user-1',
      playerName: 'Sarah Chen',
      totalScore: 85,
      correctAnswers: 8,
      totalAnswers: 10,
      averageTime: 32.5,
      rank: 1
    },
    {
      playerId: 'user-2',
      playerName: 'Michael Rodriguez',
      totalScore: 78,
      correctAnswers: 7,
      totalAnswers: 10,
      averageTime: 41.2,
      rank: 2
    }
  ],
  lessonCompleted: {
    id: 'story-1',
    title: 'The History of Coffee',
    totalSentences: 10
  },
  duration: 420, // seconds
  completedAt: new Date()
};