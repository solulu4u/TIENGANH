import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    Trophy,
    Clock,
    Users,
    Crown,
    Check,
    X,
    ArrowRight,
    Zap,
} from "lucide-react"
import { useGameRoomSignalR } from "../../hooks/useGameRoomSignalR"
import { useAuth } from "../../contexts/AuthContext"
import { getRoomDetailsInMemory, getLessonById } from "../../utils/api"
import { compareWordsDetailed } from "../../utils/dictationUtils"
import DictationAudioPlayer from "../lessons/DictationAudioPlayer"
import type { Room, Player, GameState } from "../../types/multiplayer"

const MultiplayerGame: React.FC = () => {
    console.log("[MultiplayerGame] Render")
    const { roomId } = useParams<{ roomId: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [room, setRoom] = useState<Room | null>(null)
    const [gameState, setGameState] = useState<GameState>({
        currentSentence: 0,
        timeRemaining: 60,
        isPlaying: true,
        leaderboard: [],
        totalSentences: 10,
    })
    const [userAnswer, setUserAnswer] = useState("")
    const [hasSubmitted, setHasSubmitted] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [currentLesson, setCurrentLesson] = useState<any>(null)
    const [realTimeScores, setRealTimeScores] = useState<{
        [playerId: string]: number
    }>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>("")

    // SignalR hook for real-time game updates
    const { connection, submitAnswer } = useGameRoomSignalR(
        // onPlayerJoined - không cần thiết trong game
        undefined,
        // onPlayerLeft - không cần thiết trong game
        undefined,
        // onSettingsUpdated - cập nhật settings nếu cần
        (settings: any) => {
            console.log("[MultiplayerGame] Settings updated:", settings)
        },
        // onJoinFailed - hiển thị lỗi
        (message: string) => {
            setError(message)
            setTimeout(() => setError(""), 5000)
        }
    )

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const timerRef = useRef<ReturnType<typeof setInterval>>()

    useEffect(() => {
        console.log("[MultiplayerGame] useEffect roomId", roomId)
        if (roomId) {
            setLoading(true)
            // Load room data
            getRoomDetailsInMemory(roomId)
                .then(res => {
                    if (res.success && res.data) {
                        // Convert backend DTO to frontend Room type
                        const roomData: Room = {
                            id: res.data.id,
                            name: res.data.roomName,
                            hostId: res.data.hostId,
                            hostName: res.data.hostName,
                            players: res.data.players.map((p: any) => ({
                                id: p.userId,
                                name: p.userName,
                                avatar: p.avatar,
                                isHost: p.isHost,
                                isReady: p.isReady,
                                score: p.score,
                                currentProgress: p.currentProgress,
                                status: p.status as 'Connected' | 'Disconnected' | 'Playing',
                                joinedAt: p.joinedAt
                            })),
                            maxPlayers: res.data.maxPlayers,
                            status: res.data.status,
                            currentSentence: res.data.currentSentence,
                            settings: res.data.settings,
                            createdAt: new Date(res.data.createdAt),
                            categoryId: res.data.categoryId,
                            categoryTitle: res.data.categoryTitle,
                            // Backend fields
                            roomName: res.data.roomName,
                            hostAvatar: res.data.hostAvatar,
                            currentPlayers: res.data.currentPlayers,
                            selectedLessonId: res.data.selectedLessonId,
                            selectedLessonTitle: res.data.selectedLessonTitle,
                            categoryDescription: res.data.categoryDescription,
                            categoryDifficult: res.data.categoryDifficult,
                            createdBy: res.data.createdBy
                        }
                        setRoom(roomData)

                        // Load lesson data if selected
                        if (res.data.selectedLessonId) {
                            getLessonById(res.data.selectedLessonId)
                                .then(lessonRes => {
                                    if (lessonRes.success && lessonRes.data) {
                                        setCurrentLesson(lessonRes.data)
                                    }
                                })
                                .catch(err => {
                                    console.error("Failed to load lesson:", err)
                                })
                        }
                    } else {
                        setError('Room not found')
                    }
                })
                .catch(err => {
                    console.error("Failed to load room:", err)
                    setError('Network error')
                })
                .finally(() => setLoading(false))
        }

        // Start timer
        startTimer()

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [roomId])

    // Lắng nghe sự kiện game real-time từ SignalR
    useEffect(() => {
        if (connection) {
            // Lắng nghe khi game state được cập nhật
            connection.on("GameUpdated", (gameData: any) => {
                console.log("[MultiplayerGame] GameUpdated event:", gameData)
                setGameState(gameData)
            })

            // Lắng nghe khi player trả lời
            connection.on("PlayerAnswered", (data: any) => {
                console.log("[MultiplayerGame] PlayerAnswered event:", data)
                setRealTimeScores(prev => ({
                    ...prev,
                    [data.playerId]: data.score,
                }))
            })

            // Lắng nghe khi chuyển sang câu tiếp theo
            connection.on("NextSentence", () => {
                console.log("[MultiplayerGame] NextSentence event")
                setGameState((prev: GameState) => ({
                    ...prev,
                    currentSentence: prev.currentSentence + 1,
                }))
                setUserAnswer("")
                setHasSubmitted(false)
                resetTimer()
            })

            // Lắng nghe khi game kết thúc
            connection.on("GameFinished", () => {
                console.log("[MultiplayerGame] GameFinished event")
                setShowResults(true)
            })

            return () => {
                connection.off("GameUpdated")
                connection.off("PlayerAnswered")
                connection.off("NextSentence")
                connection.off("GameFinished")
            }
        }
    }, [connection])

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setGameState((prev: GameState) => {
                if (prev.timeRemaining <= 1) {
                    // Time's up, auto-submit
                    if (!hasSubmitted) {
                        console.log("[MultiplayerGame] Timer auto-submit")
                        submitAnswerHandler()
                    }
                    return prev
                }
                return { ...prev, timeRemaining: prev.timeRemaining - 1 }
            })
        }, 1000)
    }

    const handleWebSocketMessage = (message: any) => {
        console.log("[MultiplayerGame] handleWebSocketMessage", message)
        switch (message.type) {
            case "game_updated":
                setGameState(message.data.gameState)
                break
            case "player_answered":
                // Update real-time scores
                setRealTimeScores(prev => ({
                    ...prev,
                    [message.data.playerId]: message.data.score,
                }))
                break
            case "next_sentence":
                setGameState((prev: GameState) => ({
                    ...prev,
                    currentSentence: prev.currentSentence + 1,
                }))
                setUserAnswer("")
                setHasSubmitted(false)
                resetTimer()
                break
            case "game_finished":
                setShowResults(true)
                break
            default:
                break
        }
    }

    const resetTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }
        setGameState((prev: GameState) => ({
            ...prev,
            timeRemaining: room?.settings?.timeLimit || 60,
        }))
        startTimer()
    }

    const submitAnswerHandler = () => {
        if (hasSubmitted || !currentLesson || !roomId || !user?.id) return
        console.log("[MultiplayerGame] submitAnswer", userAnswer)
        const currentChallenge =
            currentLesson.challenges[gameState.currentSentence]
        const comparison = compareWordsDetailed(
            userAnswer,
            currentChallenge.content
        )
        const isCorrect = comparison.every(word => word.status === "correct")
        const score = isCorrect
            ? 10
            : Math.max(
                  0,
                  10 - comparison.filter(w => w.status !== "correct").length
              )

        setHasSubmitted(true)

        // Sử dụng SignalR thay vì WebSocket
        submitAnswer(roomId, {
            playerId: user.id,
            sentenceIndex: gameState.currentSentence,
            answer: userAnswer,
            score,
            isCorrect,
            timeSpent:
                (room?.settings?.timeLimit || 60) - gameState.timeRemaining,
        })
    }

    const getPlayerRank = (playerId: string) => {
        const scores = Object.entries(realTimeScores).sort(
            ([, a], [, b]) => b - a
        )
        return scores.findIndex(([id]) => id === playerId) + 1
    }

    if (loading) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-semibold text-slate-800">
                    Loading game...
                </h2>
            </div>
        )
    }

    if (error || !room || !currentLesson) {
        console.log(
            "[MultiplayerGame] Error or missing data - error:",
            error,
            "room:",
            room,
            "currentLesson:",
            currentLesson
        )
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-semibold text-slate-800">
                    {error || "Game data not found"}
                </h2>
                <button
                    onClick={() => navigate("/dashboard/multiplayer")}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Back to Lobby
                </button>
            </div>
        )
    }

    if (showResults) {
        console.log("[MultiplayerGame] showResults, render leaderboard")
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">
                        Game Complete!
                    </h1>
                    <p className="text-xl text-slate-600">Final Results</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                        Leaderboard
                    </h3>
                    <div className="space-y-4">
                        {room.players
                            .sort((a, b) => (realTimeScores[b.id] || 0) - (realTimeScores[a.id] || 0))
                            .map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`flex items-center justify-between p-4 rounded-lg ${
                                        index === 0
                                            ? "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200"
                                            : index === 1
                                            ? "bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200"
                                            : index === 2
                                            ? "bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200"
                                            : "bg-slate-50 border border-slate-200"
                                    }`}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                                index === 0
                                                    ? "bg-yellow-500 text-white"
                                                    : index === 1
                                                    ? "bg-gray-400 text-white"
                                                    : index === 2
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-slate-400 text-white"
                                            }`}
                                        >
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800">
                                                {player.name}
                                            </div>
                                            <div className="text-sm text-slate-600">
                                                Score: {realTimeScores[player.id] || 0} points
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-slate-800">
                                            {realTimeScores[player.id] || 0}
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            points
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => navigate("/dashboard/multiplayer")}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                        >
                            Back to Lobby
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const currentChallenge = currentLesson.challenges[gameState.currentSentence]
    const progress =
        ((gameState.currentSentence + 1) / gameState.totalSentences) * 100

    console.log(
        "[MultiplayerGame] render main game, currentChallenge:",
        currentChallenge,
        "progress:",
        progress
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800">
                            {room.name}
                        </h1>
                        <p className="text-sm text-slate-600">
                            Multiplayer Dictation Battle
                        </p>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <Clock className="w-5 h-5 text-slate-600" />
                            <span
                                className={`font-bold text-lg ${
                                    gameState.timeRemaining <= 10
                                        ? "text-red-600"
                                        : "text-slate-800"
                                }`}
                            >
                                {gameState.timeRemaining}s
                            </span>
                        </div>
                        <div className="text-sm text-slate-600">
                            {gameState.currentSentence + 1} /{" "}
                            {gameState.totalSentences}
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Live Leaderboard */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-6">
                            <div className="flex items-center space-x-2 mb-4">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                <h3 className="font-semibold text-slate-800">
                                    Live Scores
                                </h3>
                            </div>
                            <div className="space-y-3">
                                {room.players
                                    .sort(
                                        (a, b) =>
                                            (realTimeScores[b.id] || 0) -
                                            (realTimeScores[a.id] || 0)
                                    )
                                    .map((player, index) => (
                                        <div
                                            key={player.id}
                                            className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        index === 0
                                                            ? "bg-yellow-500 text-white"
                                                            : index === 1
                                                            ? "bg-gray-400 text-white"
                                                            : index === 2
                                                            ? "bg-orange-500 text-white"
                                                            : "bg-slate-400 text-white"
                                                    }`}
                                                >
                                                    {index + 1}
                                                </div>
                                                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs font-bold">
                                                        {player.avatar}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-medium text-slate-800 truncate">
                                                    {player.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <span className="font-bold text-slate-800">
                                                    {realTimeScores[
                                                        player.id
                                                    ] || 0}
                                                </span>
                                                {hasSubmitted &&
                                                    player.id === user?.id && (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Game Area */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            {/* Audio Player */}
                            <div className="mb-6">
                                <DictationAudioPlayer
                                    lesson={currentLesson}
                                    currentDictation={currentChallenge}
                                    useYoutube={false}
                                    audioRef={audioRef}
                                    youtubePlayer={null}
                                    setYoutubePlayer={() => {}}
                                    playCount={0}
                                    setPlayCount={() => {}}
                                    currentTime={0}
                                    setCurrentTime={() => {}}
                                    isPlaying={false}
                                    setIsPlaying={() => {}}
                                    isYoutubePlaying={false}
                                    setIsYoutubePlaying={() => {}}
                                    playChallengeAudio={() => {}}
                                    playYoutubeSegment={() => {}}
                                    pauseYoutube={() => {}}
                                    resetAudio={() => {}}
                                />
                            </div>

                            {/* Answer Input */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Type what you hear:
                                    </label>
                                    <textarea
                                        value={userAnswer}
                                        onChange={e =>
                                            setUserAnswer(e.target.value)
                                        }
                                        placeholder="Type your answer here..."
                                        disabled={hasSubmitted}
                                        className={`w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-lg ${
                                            hasSubmitted
                                                ? "bg-gray-50 cursor-not-allowed"
                                                : "border-slate-300"
                                        }`}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        {hasSubmitted && (
                                            <div className="flex items-center space-x-2 text-green-600">
                                                <Check className="w-5 h-5" />
                                                <span className="font-medium">
                                                    Submitted!
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={submitAnswerHandler}
                                        disabled={
                                            !userAnswer.trim() || hasSubmitted
                                        }
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                                    >
                                        <span>Submit Answer</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Real-time Activity Feed */}
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <h4 className="font-medium text-slate-800 mb-3">
                                    Activity Feed
                                </h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <Zap className="w-4 h-4 text-blue-500" />
                                        <span>
                                            Sarah Chen submitted their answer
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            2s ago
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <Zap className="w-4 h-4 text-green-500" />
                                        <span>
                                            Michael Rodriguez got it correct!
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            5s ago
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MultiplayerGame
