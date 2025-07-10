import type { Room, Player } from "../types/multiplayer"

export const sampleRooms: Room[] = [
    // Phòng 1: waiting, 2 players, chủ đề Short Stories

    // Phòng 6: user là host, chủ đề Daily Speaking
    {
        id: "room-6",
        name: "My PK Room",
        hostId: "me",
        hostName: "Bạn",
        players: [
            {
                id: "me",
                name: "Bạn",
                avatar: "BN",
                isHost: true,
                isReady: true,
                score: 0,
                currentProgress: 0,
                answers: [],
                status: "connected",
            },
            {
                id: "user-20",
                name: "Người chơi 2",
                avatar: "N2",
                isHost: false,
                isReady: false,
                score: 0,
                currentProgress: 0,
                answers: [],
                status: "connected",
            },
        ],
        maxPlayers: 5,
        status: "waiting",
        currentSentence: 0,
        settings: {
            timeLimit: 60,
            maxRetries: 2,
            showRealTimeScore: true,
            allowHints: true,
            lessonSelection: "host_choice",
        },
        createdAt: new Date(),
        categoryId: "1d96a3e6-5982-4cb5-841d-7c84bd726840",
        categoryTitle: "Dictation Practice",
    },
]

export const sampleGameResults = {
    roomId: "room-1",
    finalScores: [
        {
            playerId: "user-1",
            playerName: "Sarah Chen",
            totalScore: 85,
            correctAnswers: 8,
            totalAnswers: 10,
            averageTime: 32.5,
            rank: 1,
        },
        {
            playerId: "user-2",
            playerName: "Michael Rodriguez",
            totalScore: 78,
            correctAnswers: 7,
            totalAnswers: 10,
            averageTime: 41.2,
            rank: 2,
        },
    ],
    lessonCompleted: {
        id: "story-1",
        title: "The History of Coffee",
        totalSentences: 10,
    },
    duration: 420, // seconds
    completedAt: new Date(),
}
