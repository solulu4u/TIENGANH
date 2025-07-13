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
    Search,
    Filter,
} from "lucide-react"
import { getActiveRooms, joinGameRoom } from "../../utils/api"
import { GameRoomListDTO } from "../../types/multiplayer"
import CreateRoomModal from "./CreateRoomModal"

const MultiplayerLobby: React.FC = () => {
    console.log("[MultiplayerLobby] Render")
    const navigate = useNavigate()
    const [showCreateRoom, setShowCreateRoom] = useState(false)
    const [showJoinRoom, setShowJoinRoom] = useState(false)
    const [rooms, setRooms] = useState<GameRoomListDTO[]>([])
    const [joinCode, setJoinCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>("")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("")

    // Load active rooms
    useEffect(() => {
        loadActiveRooms()
    }, [searchTerm, selectedCategory])

    const loadActiveRooms = async () => {
        setLoading(true)
        try {
            const response = await getActiveRooms({
                searchTerm: searchTerm || undefined,
                categoryId: selectedCategory || undefined,
                page: 1,
                pageSize: 20
            })
            
            if (response.success && response.data) {
                setRooms(response.data)
            } else {
                setError(response.message || 'Failed to load rooms')
            }
        } catch (error) {
            setError('Network error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleJoinRoom = async (roomId: string) => {
        setLoading(true);
        setError('');
        try {
            const response = await joinGameRoom(roomId);
            // Nếu join thành công, luôn vào trang phòng
            if (response.success) {
                navigate(`/dashboard/multiplayer/room/${roomId}`);
                return;
            }
            // Nếu lỗi 'already in room', parse roomId và vào phòng đó
            if (response.message?.includes('already in room')) {
                const match = response.message.match(/room ([a-f0-9-]{36})/);
                if (match) {
                    const existingRoomId = match[1];
                    navigate(`/dashboard/multiplayer/room/${existingRoomId}`);
                    return;
                } else {
                    setError('Bạn đang ở trong một phòng khác. Vui lòng rời phòng đó trước khi tham gia phòng mới.');
                    return;
                }
            }
            // Các lỗi khác
            setError(response.message || 'Không thể tham gia phòng. Vui lòng thử lại.');
        } catch (error) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = (roomId: string) => {
        navigate(`/dashboard/multiplayer/room/${roomId}`)
    }

    const copyRoomCode = (roomId: string) => {
        navigator.clipboard.writeText(roomId)
        // Show temporary success message
        const originalText = document.getElementById(`copy-${roomId}`)?.textContent
        const button = document.getElementById(`copy-${roomId}`)
        if (button) {
            button.textContent = 'Copied!'
            setTimeout(() => {
                if (button) button.textContent = originalText || 'Copy'
            }, 2000)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
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
                            Challenge friends and compete in real-time dictation battles
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

                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">Join Room</h3>
                            <p className="text-green-100">
                                Enter an existing room with code
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowJoinRoom(true)}
                        className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                        <Users className="w-5 h-5" />
                        <span>Join Room</span>
                    </button>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Categories</option>
                        <option value="dictation">Dictation</option>
                        <option value="grammar">Grammar</option>
                        <option value="vocabulary">Vocabulary</option>
                    </select>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* Rooms List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-800">
                        Active Rooms ({rooms.length})
                    </h2>
                    {loading && (
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-gray-600">Loading...</span>
                        </div>
                    )}
                </div>

                {rooms.length === 0 && !loading ? (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">
                            No active rooms found
                        </h3>
                        <p className="text-gray-500">
                            Be the first to create a room and start playing!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-slate-800 mb-1">
                                            {room.roomName}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Hosted by {room.hostName}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                room.status
                                            )}`}
                                        >
                                            {room.status}
                                        </span>
                                        <button
                                            id={`copy-${room.id}`}
                                            onClick={() => copyRoomCode(room.id)}
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Category</span>
                                        <span className="font-medium">{room.categoryName}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Players</span>
                                        <span className="font-medium">
                                            {room.currentPlayers}/{room.maxPlayers}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Created</span>
                                        <span className="font-medium">
                                            {new Date(room.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleJoinRoom(room.id)}
                                    disabled={loading || room.currentPlayers >= room.maxPlayers}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                                >
                                    <Play className="w-4 h-4" />
                                    <span>
                                        {room.currentPlayers >= room.maxPlayers ? 'Full' : 'Join Room'}
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Join Room Modal */}
            {showJoinRoom && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Join Room</h2>
                            <button
                                onClick={() => setShowJoinRoom(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Room Code
                                </label>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter room code"
                                />
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => setShowJoinRoom(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleJoinRoom(joinCode)}
                                    disabled={!joinCode.trim() || loading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {loading ? 'Joining...' : 'Join Room'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Room Modal */}
            <CreateRoomModal
                isOpen={showCreateRoom}
                onClose={() => setShowCreateRoom(false)}
                onRoomCreated={handleCreateRoom}
            />
        </div>
    )
}

export default MultiplayerLobby
