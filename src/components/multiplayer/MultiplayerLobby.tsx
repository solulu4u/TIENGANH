import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
    Plus,
    Users,
    Play,
    Settings,
    Crown,
    Clock,
    Trophy,
    Zap,
    ArrowRight,
    Copy,
    Check,
    RefreshCw,
} from "lucide-react"
import { getActiveRoomsInMemory, joinGameRoomInMemory, createGameRoomInMemory, getCategoriesBySkill, getRoomDetailsInMemory } from "../../utils/api"
import { useGameRoomSignalR } from "../../hooks/useGameRoomSignalR"
import type { Room } from "../../types/multiplayer"

const MultiplayerLobby: React.FC = () => {
    console.log("[MultiplayerLobby] Render")
    const navigate = useNavigate()
    const [showCreateRoom, setShowCreateRoom] = useState(false)
    const [showJoinRoom, setShowJoinRoom] = useState(false)
    const [rooms, setRooms] = useState<Room[]>([])
    const [joinCode, setJoinCode] = useState("")
    const [newRoomName, setNewRoomName] = useState("")
    const [copied, setCopied] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const [selectedCategory, setSelectedCategory] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // SignalR hook for real-time updates
    const { connection } = useGameRoomSignalR(
        undefined,
        undefined,
        (settings: any) => {
            console.log("[MultiplayerLobby] Settings updated:", settings)
        },
        (message: string) => {
            if (message === "Join request sent successfully") return;
            setError(message)
            setTimeout(() => setError(""), 5000)
        },
        // onRoomCreated
        (roomData: any) => {
            console.log("[MultiplayerLobby] RoomCreated event:", roomData);
            // Gọi lại API để lấy trạng thái mới nhất của room
            getRoomDetailsInMemory(roomData.id).then(res => {
                if (res.success && res.data) {
                    setRooms(prev => {
                        // Nếu room đã tồn tại, cập nhật lại, nếu chưa thì thêm mới
                        const exists = prev.some(r => r.id === res.data.id);
                        const newRoom = { ...res.data, status: res.data.status?.toLowerCase?.() || "" };
                        if (exists) {
                            return prev.map(r => r.id === newRoom.id ? newRoom : r);
                        } else {
                            return [...prev, newRoom];
                        }
                    });
                }
            });
        },
        // onRoomClosed
        (roomId: string) => {
            console.log("[MultiplayerLobby] RoomClosed event:", roomId)
            setRooms(prev => prev.filter(room => room.id !== roomId))
        },
        // onRoomUpdated
        (roomData: any) => {
            console.log("[MultiplayerLobby] RoomUpdated event:", roomData)
            const players = Array.isArray(roomData.players) ? roomData.players : [];
            setRooms(prev => prev.map(room => 
                room.id === roomData.roomId ? {
                    ...room,
                    name: roomData.roomName,
                    hostId: roomData.hostId,
                    hostName: players.find((p: any) => p.isHost)?.userName || "Unknown",
                    players: players.map((p: any) => ({
                        id: p.userId,
                        name: p.userName,
                        avatar: p.avatar,
                        isHost: p.isHost,
                        isReady: p.isReady,
                        score: 0,
                        currentProgress: 0,
                        status: "Connected" as const,
                        joinedAt: new Date()
                    })),
                    maxPlayers: roomData.settings.maxPlayers,
                    status: roomData.gameStatus,
                    settings: {
                        timeLimit: roomData.settings.timeLimit,
                        maxRetries: roomData.settings.maxRetries,
                        showRealTimeScore: roomData.settings.showRealTimeScore,
                        allowHints: roomData.settings.allowHints,
                        lessonSelection: roomData.settings.lessonSelection,
                    }
                } : room
            ))
        }
    )

    // Load active rooms
    useEffect(() => {
        loadActiveRooms()
    }, [])

    // Auto-refresh rooms every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            loadActiveRooms();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Real-time updates via SignalR - no need for manual refresh

    // Load categories for create room
    useEffect(() => {
        loadCategories()
    }, [])

    // Real-time updates handled by useGameRoomSignalR hook

    const loadCategories = async () => {
        try {
            const response = await getCategoriesBySkill("Dictation")
            console.log("[MultiplayerLobby] Categories response:", response)
            if (response.success && response.data) {
                setCategories(response.data)
            }
        } catch (error) {
            console.error("Failed to load categories:", error)
        }
    }

    const loadActiveRooms = async () => {
        setLoading(true)
        try {
            const response = await getActiveRoomsInMemory()
            if (response.success && response.data) {
                // Convert backend DTOs to frontend Room type
                const roomData: Room[] = response.data.map((room: any) => ({
                    id: room.id,
                    name: room.roomName,
                    hostId: room.hostId || "sample-host",
                    hostName: room.hostName,
                    players: room.players || [],
                    maxPlayers: room.maxPlayers,
                    status: room.status,
                    currentSentence: 0,
                    settings: room.settings || {
                        timeLimit: 60,
                        maxRetries: 2,
                        showRealTimeScore: true,
                        allowHints: true,
                        lessonSelection: "host_choice",
                    },
                    createdAt: new Date(room.createdAt),
                    categoryId: room.categoryId || "dictation",
                    categoryTitle: room.categoryTitle,
                    // Backend fields
                    roomName: room.roomName,
                    hostAvatar: room.hostAvatar,
                    currentPlayers: room.playerCount,
                    selectedLessonId: room.selectedLessonId,
                    selectedLessonTitle: room.selectedLessonTitle,
                    categoryDescription: room.categoryDescription,
                    categoryDifficult: room.categoryDifficult,
                    createdBy: room.createdBy
                }))
                setRooms(roomData)
            } else {
                setError(response.message || 'Failed to load rooms')
            }
        } catch (error) {
            setError('Network error occurred')
        } finally {
            setLoading(false)
        }
    }

    const createRoom = () => {
        console.log(
            "[MultiplayerLobby] createRoom",
            newRoomName,
            selectedCategory
        )
        if (!newRoomName.trim() || !selectedCategory) return

        setLoading(true)
        setError("")

        createGameRoomInMemory({
            roomName: newRoomName.trim(),
            maxPlayers: 6,
            categoryId: selectedCategory.id,
        })
            .then(response => {
                if (response.success && typeof response.data === "string") {
                    console.log("[MultiplayerLobby] Room created successfully:", response.data)
                    
                    // Real-time update will be handled by SignalR
                    setNewRoomName("")
                    setShowCreateRoom(false)
                    setSelectedCategory(null)
                    navigate(`/dashboard/multiplayer/room/${response.data}`)
                } else {
                    setError(response.message || "Failed to create room")
                }
            })
            .catch(error => {
                setError("Network error occurred")
            })
            .finally(() => setLoading(false))
    }

    const isValidGuid = (id: string) =>
  typeof id === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);

    const joinRoom = (roomId?: string) => {
        const targetRoomId = roomId || joinCode;
        console.log("[MultiplayerLobby] joinRoom", targetRoomId);
        if (!targetRoomId || !isValidGuid(targetRoomId)) {
            setError("Room ID không hợp lệ!");
            return;
        }
        if (!targetRoomId) return

        setLoading(true)
        setError("")

        joinGameRoomInMemory(targetRoomId)
            .then(response => {
                if (response.success && typeof response.data === "string") {
                    navigate(`/dashboard/multiplayer/room/${response.data}`)
                } else if (response.message === "already in this room") {
                    const anyResponse = response as any;
                    const roomId = (typeof anyResponse["roomId"] === "string" && anyResponse["roomId"]) || (typeof response.data === "string" && response.data) || targetRoomId;
                    navigate(`/dashboard/multiplayer/room/${roomId}`);
                } else if (response.message?.includes('already in room')) {
                    const match = response.message.match(/room ([a-f0-9-]{36})/)
                    if (match) {
                        const existingRoomId = match[1]
                        if (existingRoomId === targetRoomId) {
                            navigate(`/dashboard/multiplayer/room/${existingRoomId}`)
                            return
                        }
                        setError("Bạn đang ở trong một phòng khác. Vui lòng rời phòng đó trước khi tham gia phòng mới.")
                        return
                    }
                    setError("Bạn đang ở trong một phòng khác.")
                } else if (response.message === "Invalid room ID format") {
                    navigate(`/dashboard/multiplayer/room/${targetRoomId}`)
                } else if (response.message === "Join request sent successfully") {
                    // Không hiển thị thông báo, vào thẳng room
                    navigate(`/dashboard/multiplayer/room/${targetRoomId}`)
                } else {
                    setError(response.message || "Failed to join room")
                }
            })
            .catch(error => {
                setError("Network error occurred")
            })
            .finally(() => {
                setLoading(false)
                setJoinCode("")
                setShowJoinRoom(false)
            })
    }

    const copyRoomCode = (roomId: string) => {
        navigator.clipboard.writeText(roomId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        console.log("[MultiplayerLobby] Copied room code:", roomId)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "waiting":
                return "bg-green-100 text-green-800"
            case "starting":
                return "bg-yellow-100 text-yellow-800"
            case "playing":
                return "bg-blue-100 text-blue-800"
            case "finished":
                return "bg-gray-100 text-gray-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-800 mb-2">
                            Multiplayer Dictation
                        </h1>
                        <p className="text-xl text-slate-600">
                            Challenge friends and compete in real-time dictation
                            battles
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Plus className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">Create Room</h3>
                            <p className="text-blue-100">
                                Start a new multiplayer session
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateRoom(true)}
                        className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create New Room</span>
                    </button>
                </div>

                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">Join Room</h3>
                            <p className="text-purple-100">
                                Enter a room code to join
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowJoinRoom(true)}
                        className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                        <Users className="w-5 h-5" />
                        <span>Join with Code</span>
                    </button>
                </div>
            </div>

            {/* Active Rooms */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">
                    Active Rooms
                    </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {rooms.map(room => (
                        <div
                            key={room.id}
                            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-200"
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-xl font-semibold text-slate-800">
                                                {room.name}
                                        </h3>
                                        <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                room.status
                                            )}`}
                                        >
                                            {room.status}
                                        </span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm text-slate-600 mb-3">
                                            <Crown className="w-4 h-4 text-yellow-500" />
                                            <span>Host: {room.hostName}</span>
                                        </div>
                                    </div>
                                        <button
                                            onClick={() => copyRoomCode(room.id)}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Copy room code"
                                        >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                        </button>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                                        <Users className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                                        <div className="text-sm font-medium text-slate-800">
                                            {room.players.length}/
                                            {room.maxPlayers}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Players
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                                        <Clock className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                                                                        <div className="text-sm font-medium text-slate-800">
                                    {room.settings?.timeLimit || 60}s
                                </div>
                                <div className="text-xs text-slate-500">
                                    Time Limit
                                </div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                                <Zap className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                                <div className="text-sm font-medium text-slate-800">
                                    {room.settings?.lessonSelection ===
                                    "random"
                                        ? "Random"
                                        : "Host Choice"}
                                </div>
                                        <div className="text-xs text-slate-500">
                                            Mode
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 mb-4">
                                    {room.players.slice(0, 4).map(player => (
                                        <div
                                            key={player.id}
                                            className="flex items-center space-x-2"
                                        >
                                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">
                                                    {player.avatar}
                                        </span>
                                    </div>
                                        </div>
                                    ))}
                                    {room.players.length > 4 && (
                                        <div
                                            key={`more-players-${room.id}`}
                                            className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center"
                                        >
                                            <span className="text-slate-600 text-xs font-bold">
                                                +{room.players.length - 4}
                                        </span>
                                    </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => joinRoom(room.id)}
                                    disabled={
                                        (room.status?.toLowerCase() !== "waiting") ||
                                        !Array.isArray(room.players) ||
                                        room.players.length >= room.maxPlayers
                                    }
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                                >
                                    <Play className="w-4 h-4" />
                                    <span>
                                        {room.status?.toLowerCase() === "waiting"
                                            ? room.players.length >= room.maxPlayers
                                                ? "Room Full"
                                                : "Join Room"
                                            : "Unavailable"}
                                    </span>
                                </button>
                            </div>
                            </div>
                        ))}
                    </div>
            </div>

            {/* Create Room Modal */}
            {showCreateRoom && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">
                            Create New Room
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Room Name
                                </label>
                                <input
                                    type="text"
                                    value={newRoomName}
                                    onChange={e =>
                                        setNewRoomName(e.target.value)
                                    }
                                    placeholder="Enter room name..."
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Chủ đề
                                </label>
                                <select
                                    value={selectedCategory?.id || ""}
                                    onChange={e => {
                                        const cat = categories.find(
                                            c => c.id === e.target.value
                                        )
                                        setSelectedCategory(cat)
                                    }}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Chọn chủ đề...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowCreateRoom(false)}
                                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createRoom}
                                    disabled={
                                        !newRoomName.trim() || !selectedCategory || loading
                                    }
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200"
                                >
                                    {loading ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Room Modal */}
            {showJoinRoom && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">
                            Join Room
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Room Code
                                </label>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value)}
                                    placeholder="Enter room code..."
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowJoinRoom(false)}
                                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => joinRoom()}
                                    disabled={!joinCode.trim() || loading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all duration-200"
                                >
                                    {loading ? 'Joining...' : 'Join'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
                    {error}
                </div>
            )}
        </div>
    )
}

export default MultiplayerLobby
