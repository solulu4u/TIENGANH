import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    Crown,
    Users,
    Settings,
    Play,
    ArrowLeft,
    Copy,
    Check,
    Shuffle,
    Clock,
    Trophy,
    Zap,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { sampleRooms } from "../../data/multiplayerSample"
import { getLessonsByCategoryTitle, getRoomDetails, updateRoomSettings } from "../../utils/api"
import type { Room, Player } from "../../types/multiplayer"
import DictationLessonForPK from "../lessons/DictationLessonForPK"

const MultiplayerRoom: React.FC = () => {
    console.log("[MultiplayerRoom] Render")
    const { roomId } = useParams<{ roomId: string }>()
    const navigate = useNavigate()
    // const { user } = useAuth();
    // Giả lập user hiện tại là host 'me'
    const user = { id: "me", name: "Bạn", avatar: "BN" }
    const [room, setRoom] = useState<Room | null>(null)
    const [availableLessons, setAvailableLessons] = useState<any[]>([])
    const [selectedLesson, setSelectedLesson] = useState<any>(null)
    const [showSettings, setShowSettings] = useState(false)
    const [copied, setCopied] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [pkStarted, setPkStarted] = useState(false)
    const [rankings, setRankings] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Default settings when backend doesn't provide settings
    const defaultSettings = {
        timeLimit: 60,
        maxRetries: 2,
        showRealTimeScore: true,
        allowHints: true,
        lessonSelection: "host_choice"
    };

    // Get settings from room or use defaults
    const roomSettings = room?.settings || defaultSettings;

    const isHost = user?.id === room?.hostId

    // Validation for starting game
    const allPlayersReady = room?.players.every(player => player.isReady) || false;
    const hasEnoughPlayers = (room?.players.length || 0) >= 2;
    const hasSelectedLesson = selectedLesson !== null;
    const canStartGame = isHost && allPlayersReady && hasEnoughPlayers && hasSelectedLesson;

    // Đặt fetchLessons ở ngoài useEffect, ngay sau khai báo state
    const fetchLessons = () => {
        if (!room) {
            console.log("[fetchLessons] room is null")
            return
        }
        console.log("[fetchLessons] categoryTitle:", room.categoryTitle)
        const url = `http://localhost:5285/api/lessons/category-title/${encodeURIComponent(
            room.categoryTitle
        )}`
        console.log("[fetchLessons] Fetching lessons from:", url)
        fetch(url)
            .then(res => res.json())
            .then(data => {
                console.log("[fetchLessons] Lesson API response:", data)
                if (data.success && data.data) {
                    setAvailableLessons(data.data)
                }
            })
            .catch(err => {
                console.error("[fetchLessons] Fetch error:", err)
            })
    }

    useEffect(() => {
        console.log("[MultiplayerRoom] useEffect roomId", roomId)
        if (roomId) {
            setLoading(true);
            getRoomDetails(roomId)
                .then(res => {
                    if (res.success && res.data) {
                        setRoom(res.data);
                        setError('');
                    } else {
                        setRoom(null);
                        setError('Room not found');
                    }
                })
                .catch(() => {
                    setRoom(null);
                    setError('Network error');
                })
                .finally(() => setLoading(false));
        }
    }, [roomId]);

    useEffect(() => {
        // Gửi ranking ra ngoài
        // onRankingUpdate([...scores].sort((a, b) => b.score - a.score))
        console.log("[MultiplayerRoom] rankings updated:", rankings)
    }, [rankings])

    // Fetch categories nếu là host và chưa có
    useEffect(() => {
        console.log(
            "[MultiplayerRoom] useEffect isHost",
            isHost,
            "categories.length",
            categories.length
        )
        if (isHost && categories.length === 0) {
            fetch("http://localhost:5285/api/categories/skill/Dictation")
                .then(res => res.json())
                .then(data => {
                    console.log(
                        "[MultiplayerRoom] categories API response:",
                        data
                    )
                    if (data.success && data.data) setCategories(data.data)
                })
                .catch(err => {
                    console.error(
                        "[MultiplayerRoom] categories fetch error:",
                        err
                    )
                })
        }
    }, [isHost, categories.length])

    // Trong UI, khi host nhấn 'Change' hoặc 'Chọn bài', gọi fetchLessons và show danh sách bài học để chọn.

    // Định nghĩa copyRoomCode trước khi dùng trong JSX
    const copyRoomCode = () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            console.log("[MultiplayerRoom] Copied room code:", roomId)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading room...</div>;
    if (error || !room) return <div className="p-8 text-center text-red-600">{error || 'Room not found'}</div>;

    // Nếu đã bắt đầu PK, render DictationLessonForPK và bảng xếp hạng
    if (pkStarted) {
        console.log("[MultiplayerRoom] pkStarted, render PKLessonWithRanking")
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">PK Dictation</h1>
                    <button
                        onClick={() => setPkStarted(false)}
                        className="px-4 py-2 bg-slate-200 rounded-lg"
                    >
                        Quay lại phòng
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-3">
                        {/* DictationLessonForPK */}
                        <div className="bg-white rounded-xl shadow p-4 mb-4">
                            <PKLessonWithRanking
                                room={room}
                                onRankingUpdate={setRankings}
                                selectedLesson={selectedLesson}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-xl shadow p-4">
                            <h2 className="text-2xl font-bold mb-4 text-center">
                                Bảng xếp hạng
                            </h2>
                            <ol className="space-y-4">
                                {(rankings.length > 0 ? rankings : room.players)
                                    .sort((a: any, b: any) => b.score - a.score)
                                    .map((p: any, i: number) => {
                                        // Check if avatar is a URL (simple check)
                                        const isAvatarUrl =
                                            p.avatar &&
                                            (p.avatar.startsWith("http://") ||
                                                p.avatar.startsWith("https://"))
                                        // Top 1/2/3 backgrounds
                                        let bg = ""
                                        if (i === 0)
                                            bg =
                                                "bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300"
                                        else if (i === 1)
                                            bg =
                                                "bg-gradient-to-r from-gray-100 to-slate-100 border-gray-300"
                                        else if (i === 2)
                                            bg =
                                                "bg-gradient-to-r from-orange-100 to-red-100 border-orange-300"
                                        else bg = "bg-slate-50 border-slate-200"
                                        return (
                                            <li
                                                key={p.id}
                                                className={`flex items-center justify-between p-3 rounded-xl border ${bg}`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                                                            i === 0
                                                                ? "bg-yellow-400 text-white shadow-lg"
                                                                : i === 1
                                                                ? "bg-gray-400 text-white"
                                                                : i === 2
                                                                ? "bg-orange-400 text-white"
                                                                : "bg-slate-300 text-white"
                                                        }`}
                                                    >
                                                        {isAvatarUrl ? (
                                                            <img
                                                                src={p.avatar}
                                                                alt={p.name}
                                                                className="w-10 h-10 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            p.avatar ||
                                                            p.name[0]
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-800 text-base">
                                                            {p.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            Hạng #{i + 1}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-pink-600">
                                                        {p.score}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        điểm
                                                    </div>
                                                </div>
                                            </li>
                                        )
                                    })}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    console.log(
        "[MultiplayerRoom] render main room, selectedLesson:",
        selectedLesson,
        "availableLessons:",
        availableLessons
    )
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate("/dashboard/multiplayer")}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">
                            {room.name}
                        </h1>
                        <div className="flex items-center space-x-2 mt-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                {room.categoryTitle}
                            </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-2 text-slate-600">
                                <Crown className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm">
                                    Host: {room.hostName}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-slate-600">
                                    Room Code:
                                </span>
                                <button
                                    onClick={copyRoomCode}
                                    className="flex items-center space-x-1 px-2 py-1 bg-slate-100 rounded text-sm font-mono hover:bg-slate-200 transition-colors"
                                >
                                    <span>{roomId}</span>
                                    {copied ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    className={`w-3 h-3 rounded-full ${
                        // isConnected ? "bg-green-500" : "bg-red-500"
                        "bg-red-500"
                    }`}
                ></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Players Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-800">
                                Players ({room.players.length}/{room.maxPlayers}
                                )
                            </h3>
                            <Users className="w-5 h-5 text-slate-600" />
                        </div>

                        <div className="space-y-4">
                            {room.players.map((player: Player) => (
                                <div
                                    key={player.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">
                                                {player.avatar}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-slate-800">
                                                    {player.name}
                                                </span>
                                                {player.isHost && (
                                                    <Crown className="w-4 h-4 text-yellow-500" />
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                {player.status === "Connected"
                                                    ? "Online"
                                                    : "Offline"}
                                            </span>
                                        </div>
                                    </div>
                                    <div
                                        className={`w-3 h-3 rounded-full ${
                                            player.isReady
                                                ? "bg-green-500"
                                                : "bg-gray-300"
                                        }`}
                                    ></div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200">
                            {/* XÓA: toggleReady */}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Room Settings */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-800">
                                Room Settings
                            </h3>
                            {isHost && (
                                <button
                                    onClick={() => setShowSettings(true)}
                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <Clock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                {isHost ? (
                                    <input
                                        type="number"
                                        min={10}
                                        max={600}
                                        value={roomSettings.timeLimit}
                                        onChange={e => {
                                            const value = Math.max(
                                                10,
                                                Math.min(
                                                    600,
                                                    Number(e.target.value)
                                                )
                                            )
                                            setRoom((prev: Room | null) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          settings: {
                                                              ...(prev.settings || defaultSettings),
                                                              timeLimit: value,
                                                          },
                                                      }
                                                    : prev
                                            )
                                            // Update backend
                                            if (roomId) {
                                                updateRoomSettings(roomId, {
                                                    timeLimit: value,
                                                    maxRetries: roomSettings.maxRetries || 2,
                                                    showRealTimeScore: roomSettings.showRealTimeScore || true,
                                                    allowHints: roomSettings.allowHints || true
                                                }).catch(err => {
                                                    console.error("Failed to update time limit:", err);
                                                });
                                            }
                                        }}
                                        className="w-20 text-center font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <div className="font-semibold text-slate-800">
                                        {roomSettings.timeLimit}s
                                    </div>
                                )}
                                <div className="text-xs text-slate-500">
                                    Time Limit
                                </div>
                            </div>
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <Trophy className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                {isHost ? (
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={roomSettings.maxRetries}
                                        onChange={e => {
                                            const value = Math.max(
                                                1,
                                                Math.min(
                                                    10,
                                                    Number(e.target.value)
                                                )
                                            )
                                            setRoom((prev: Room | null) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          settings: {
                                                              ...(prev.settings || defaultSettings),
                                                              maxRetries: value,
                                                          },
                                                      }
                                                    : prev
                                            )
                                            // Update backend
                                            if (roomId) {
                                                updateRoomSettings(roomId, {
                                                    timeLimit: roomSettings.timeLimit || 60,
                                                    maxRetries: value,
                                                    showRealTimeScore: roomSettings.showRealTimeScore || true,
                                                    allowHints: roomSettings.allowHints || true
                                                }).catch(err => {
                                                    console.error("Failed to update max retries:", err);
                                                });
                                            }
                                        }}
                                        className="w-20 text-center font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <div className="font-semibold text-slate-800">
                                        {roomSettings.maxRetries}
                                    </div>
                                )}
                                <div className="text-xs text-slate-500">
                                    Max Retries
                                </div>
                            </div>
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <Zap className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                <div className="font-semibold text-slate-800">
                                    {roomSettings.showRealTimeScore
                                        ? "On"
                                        : "Off"}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Live Score
                                </div>
                            </div>
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <Users className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                <div className="font-semibold text-slate-800">
                                    {roomSettings.lessonSelection === "random"
                                        ? "Random"
                                        : "Host"}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Selection
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lesson Selection */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-800">
                                Lesson Selection
                            </h3>
                            {isHost &&
                                roomSettings.lessonSelection === "random" && (
                                    <button
                                        onClick={() => setSelectedLesson(null)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        <Shuffle className="w-4 h-4" />
                                        <span>Random Lesson</span>
                                    </button>
                                )}
                        </div>

                        {selectedLesson ? (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-green-800">
                                            {selectedLesson.title}
                                        </h4>
                                        <p className="text-sm text-green-600">
                                            {selectedLesson.description}
                                        </p>
                                        <div className="flex items-center space-x-4 mt-2 text-xs text-green-600">
                                            <span>
                                                Level: {selectedLesson.level}
                                            </span>
                                            <span>
                                                Duration:{" "}
                                                {selectedLesson.duration}s
                                            </span>
                                            <span>
                                                Accent: {selectedLesson.accent}
                                            </span>
                                        </div>
                                    </div>
                                    {isHost && (
                                        <button
                                            onClick={() => {
                                                console.log(
                                                    "[MultiplayerRoom] Host click Change lesson"
                                                )
                                                fetchLessons()
                                                setSelectedLesson(null)
                                            }}
                                            className="text-green-600 hover:text-green-800 text-sm"
                                        >
                                            Change
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                {isHost ? (
                                    <div>
                                        <p className="mb-4">
                                            Select a lesson to start the game
                                        </p>
                                        {roomSettings.lessonSelection ===
                                            "host_choice" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        console.log(
                                                            "[MultiplayerRoom] Host click Chọn bài"
                                                        )
                                                        fetchLessons()
                                                    }}
                                                    className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    Chọn bài
                                                </button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                                                    {availableLessons.map(
                                                        lesson => (
                                                            <button
                                                                key={
                                                                    lesson.lessonId
                                                                }
                                                                onClick={() => {
                                                                    console.log(
                                                                        "[MultiplayerRoom] Host chọn lesson:",
                                                                        lesson
                                                                    )
                                                                    setSelectedLesson(
                                                                        lesson
                                                                    )
                                                                }}
                                                                className="p-4 text-left border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                                            >
                                                                <div className="font-semibold text-slate-800 mb-1">
                                                                    {
                                                                        lesson.title
                                                                    }
                                                                </div>
                                                                <div className="text-xs text-slate-500 mb-2">
                                                                    {
                                                                        lesson.level
                                                                    }{" "}
                                                                    •{" "}
                                                                    {
                                                                        lesson.accent
                                                                    }
                                                                </div>
                                                                <div className="space-y-1 text-xs text-slate-600">
                                                                    <div className="flex justify-between">
                                                                        <span>Duration:</span>
                                                                        <span className="font-medium">{lesson.duration}s</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span>Estimated time:</span>
                                                                        <span className="font-medium">~{Math.ceil(lesson.duration / (roomSettings.timeLimit || 60))} min</span>
                                                                    </div>
                                                                    {lesson.description && (
                                                                        <div className="text-slate-500 mt-2 line-clamp-2">
                                                                            {lesson.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <p>
                                        Waiting for host to select a lesson...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Lesson Time Settings - Only show when lesson is selected */}
                    {selectedLesson && isHost && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-slate-800">
                                    Lesson Time Settings
                                </h3>
                                <Clock className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Time per Sentence (seconds)
                                        </label>
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="number"
                                                min={10}
                                                max={300}
                                                value={roomSettings.timeLimit}
                                                onChange={e => {
                                                    const value = Math.max(
                                                        10,
                                                        Math.min(
                                                            300,
                                                            Number(e.target.value)
                                                        )
                                                    )
                                                    setRoom((prev: Room | null) =>
                                                        prev
                                                            ? {
                                                                  ...prev,
                                                                  settings: {
                                                                      ...(prev.settings || defaultSettings),
                                                                      timeLimit: value,
                                                                  },
                                                              }
                                                            : prev
                                                    )
                                                    // Update backend
                                                    if (roomId) {
                                                        updateRoomSettings(roomId, {
                                                            timeLimit: value,
                                                            maxRetries: roomSettings.maxRetries || 2,
                                                            showRealTimeScore: roomSettings.showRealTimeScore || true,
                                                            allowHints: roomSettings.allowHints || true
                                                        }).catch(err => {
                                                            console.error("Failed to update lesson time limit:", err);
                                                        });
                                                    }
                                                }}
                                                className="w-24 text-center font-semibold text-slate-800 bg-white border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <span className="text-sm text-slate-600">seconds</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Time allowed for each sentence in the lesson
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Max Retries per Sentence
                                        </label>
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="number"
                                                min={1}
                                                max={5}
                                                value={roomSettings.maxRetries}
                                                onChange={e => {
                                                    const value = Math.max(
                                                        1,
                                                        Math.min(
                                                            5,
                                                            Number(e.target.value)
                                                        )
                                                    )
                                                    setRoom((prev: Room | null) =>
                                                        prev
                                                            ? {
                                                                  ...prev,
                                                                  settings: {
                                                                      ...(prev.settings || defaultSettings),
                                                                      maxRetries: value,
                                                                  },
                                                              }
                                                            : prev
                                                    )
                                                    // Update backend
                                                    if (roomId) {
                                                        updateRoomSettings(roomId, {
                                                            timeLimit: roomSettings.timeLimit || 60,
                                                            maxRetries: value,
                                                            showRealTimeScore: roomSettings.showRealTimeScore || true,
                                                            allowHints: roomSettings.allowHints || true
                                                        }).catch(err => {
                                                            console.error("Failed to update max retries:", err);
                                                        });
                                                    }
                                                }}
                                                className="w-20 text-center font-semibold text-slate-800 bg-white border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <span className="text-sm text-slate-600">retries</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Maximum attempts allowed for each sentence
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                    <div>
                                        <h4 className="font-medium text-blue-800 mb-1">
                                            Lesson: {selectedLesson.title}
                                        </h4>
                                        <p className="text-sm text-blue-600">
                                            Estimated total time: ~{Math.ceil((selectedLesson.duration || 0) / (roomSettings.timeLimit || 60) * (roomSettings.maxRetries || 2))} minutes
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Start Game */}
                    {isHost && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                    Ready to Start?
                                </h3>
                                <div className="mb-6">
                                    {!allPlayersReady && (
                                        <p className="text-sm text-amber-600 mb-2">
                                            Waiting for all players to be
                                            ready...
                                        </p>
                                    )}
                                    {!selectedLesson && (
                                        <p className="text-sm text-amber-600 mb-2">
                                            Please select a lesson first
                                        </p>
                                    )}
                                    {room.players.length < 2 && (
                                        <p className="text-sm text-amber-600 mb-2">
                                            Need at least 2 players to start
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setPkStarted(true)}
                                    disabled={!canStartGame}
                                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 mx-auto"
                                >
                                    <Play className="w-6 h-6" />
                                    <span>Start Game</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Component DictationLessonForPK with ranking
const PKLessonWithRanking = ({
    room,
    onRankingUpdate,
    selectedLesson,
}: {
    room: Room
    onRankingUpdate: (r: any[]) => void
    selectedLesson: any
}) => {
    // Default settings when backend doesn't provide settings
    const defaultSettings = {
        timeLimit: 60,
        maxRetries: 2,
        showRealTimeScore: true,
        allowHints: true,
        lessonSelection: "host_choice"
    };

    // Get settings from room or use defaults
    const roomSettings = room?.settings || defaultSettings;

    return (
        <DictationLessonForPK
            players={room.players}
            onScoreChange={onRankingUpdate}
            lessonId={selectedLesson?.lessonId}
            timeLimit={roomSettings.timeLimit}
        />
    )
}
export default MultiplayerRoom
