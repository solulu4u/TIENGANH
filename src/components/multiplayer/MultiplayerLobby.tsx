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
} from "lucide-react"
import { sampleRooms } from "../../data/multiplayerSample"
import type { Room } from "../../types/multiplayer"

const MultiplayerLobby: React.FC = () => {
    console.log("[MultiplayerLobby] Render")
    const navigate = useNavigate()
    const [showCreateRoom, setShowCreateRoom] = useState(false)
    const [showJoinRoom, setShowJoinRoom] = useState(false)
    const [rooms, setRooms] = useState<Room[]>(sampleRooms)
    const [joinCode, setJoinCode] = useState("")
    const [newRoomName, setNewRoomName] = useState("")
    const [copied, setCopied] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const [selectedCategory, setSelectedCategory] = useState<any>(null)

    // WebSocket connection
    // XÓA: const { isConnected, lastMessage, sendMessage, error } = useWebSocket('ws://localhost:8080/multiplayer');

    // XÓA: useEffect(() => {
    //   if (lastMessage) {
    //     handleWebSocketMessage(lastMessage);
    //   }
    // }, [lastMessage]);

    // XÓA: const handleWebSocketMessage = (message: any) => {
    //   switch (message.type) {
    //     case 'room_created':
    //       setRooms(prev => [...prev, message.data]);
    //       break;
    //     case 'room_updated':
    //       setRooms(prev => prev.map(room =>
    //         room.id === message.data.id ? message.data : room
    //       ));
    //       break;
    //     case 'room_joined':
    //       navigate(`/dashboard/multiplayer/room/${message.data.roomId}`);
    //       break;
    //     default:
    //       break;
    //   }
    // };

    // Đảm bảo chỉ fetch categories khi showCreateRoom true, không fetch lessons ở đây.
    useEffect(() => {
        console.log(
            "[MultiplayerLobby] useEffect showCreateRoom",
            showCreateRoom,
            "categories.length",
            categories.length
        )
        if (showCreateRoom && categories.length === 0) {
            fetch("http://localhost:5285/api/categories/skill/Dictation")
                .then(res => res.json())
                .then(data => {
                    console.log(
                        "[MultiplayerLobby] categories API response:",
                        data
                    )
                    if (data.success && data.data) setCategories(data.data)
                })
                .catch(err => {
                    console.error(
                        "[MultiplayerLobby] categories fetch error:",
                        err
                    )
                })
        }
    }, [showCreateRoom, categories.length])

    const createRoom = () => {
        console.log(
            "[MultiplayerLobby] createRoom",
            newRoomName,
            selectedCategory
        )
        if (!newRoomName.trim() || !selectedCategory) return

        const roomData: Room = {
            id: `room-${rooms.length + 1}`,
            name: newRoomName,
            hostId: "sample-host",
            hostName: "Sample Host",
            players: [],
            maxPlayers: 6,
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
            categoryId: selectedCategory.id,
            categoryTitle: selectedCategory.title,
        }

        setRooms(prev => [...prev, roomData])
        console.log("[MultiplayerLobby] Room created:", roomData)

        setNewRoomName("")
        setShowCreateRoom(false)
        setSelectedCategory(null)
    }

    const joinRoom = (roomId?: string) => {
        const targetRoomId = roomId || joinCode
        console.log("[MultiplayerLobby] joinRoom", targetRoomId)
        if (!targetRoomId) return
        const foundRoom = rooms.find(r => r.id === targetRoomId)
        console.log("[MultiplayerLobby] foundRoom:", foundRoom)
        if (foundRoom) {
            navigate(`/dashboard/multiplayer/room/${targetRoomId}`)
        }
        setJoinCode("")
        setShowJoinRoom(false)
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
                    {/* XÓA: <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-slate-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div> */}
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
                                            {room.settings.timeLimit}s
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Time Limit
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                                        <Zap className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                                        <div className="text-sm font-medium text-slate-800">
                                            {room.settings.lessonSelection ===
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
                                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                                            <span className="text-slate-600 text-xs font-bold">
                                                +{room.players.length - 4}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => joinRoom(room.id)}
                                    disabled={
                                        room.status !== "waiting" ||
                                        room.players.length >= room.maxPlayers
                                    }
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                                >
                                    <Play className="w-4 h-4" />
                                    <span>
                                        {room.status === "waiting"
                                            ? "Join Room"
                                            : room.status === "playing"
                                            ? "In Progress"
                                            : "Room Full"}
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
                                        !newRoomName.trim() || !selectedCategory
                                    }
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200"
                                >
                                    Create
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
                                    disabled={!joinCode.trim()}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all duration-200"
                                >
                                    Join
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {/* XÓA: {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )} */}
        </div>
    )
}

export default MultiplayerLobby
