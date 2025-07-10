import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Zap
} from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../contexts/AuthContext';
import { sampleRooms } from '../../data/multiplayerSample';
import { getLessonsByCategoryTitle } from '../../utils/api';
import type { Room, Player } from '../../types/multiplayer';

const MultiplayerRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const { isConnected, lastMessage, sendMessage } = useWebSocket('ws://localhost:8080/multiplayer');

  useEffect(() => {
    // Load room data (in real app, this would come from WebSocket)
    const foundRoom = sampleRooms.find(r => r.id === roomId);
    if (foundRoom) {
      setRoom(foundRoom);
    }

    // Load available lessons
    loadLessons();
  }, [roomId]);

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const loadLessons = async () => {
    try {
      const response = await getLessonsByCategoryTitle('Short Stories');
      if (response.success && response.data) {
        setAvailableLessons(response.data);
      }
    } catch (error) {
      console.error('Failed to load lessons:', error);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'room_updated':
        if (message.data.id === roomId) {
          setRoom(message.data);
        }
        break;
      case 'game_started':
        navigate(`/dashboard/multiplayer/game/${roomId}`);
        break;
      case 'player_joined':
      case 'player_left':
        // Update room state
        break;
      default:
        break;
    }
  };

  const copyRoomCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleReady = () => {
    setIsReady(!isReady);
    sendMessage({
      type: 'player_ready',
      data: { roomId, playerId: user?.id, isReady: !isReady }
    });
  };

  const selectRandomLesson = () => {
    if (availableLessons.length > 0) {
      const randomLesson = availableLessons[Math.floor(Math.random() * availableLessons.length)];
      setSelectedLesson(randomLesson);
      sendMessage({
        type: 'lesson_selected',
        data: { roomId, lesson: randomLesson }
      });
    }
  };

  const startGame = () => {
    if (!selectedLesson) return;
    
    sendMessage({
      type: 'start_game',
      data: { roomId, lesson: selectedLesson }
    });
  };

  const leaveRoom = () => {
    sendMessage({
      type: 'leave_room',
      data: { roomId, playerId: user?.id }
    });
    navigate('/dashboard/multiplayer');
  };

  if (!room) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-slate-800">Room not found</h2>
        <button
          onClick={() => navigate('/dashboard/multiplayer')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const isHost = user?.id === room.hostId;
  const allPlayersReady = room.players.every(p => p.isReady);
  const canStartGame = isHost && allPlayersReady && selectedLesson && room.players.length >= 2;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={leaveRoom}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{room.name}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center space-x-2 text-slate-600">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">Host: {room.hostName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">Room Code:</span>
                <button
                  onClick={copyRoomCode}
                  className="flex items-center space-x-1 px-2 py-1 bg-slate-100 rounded text-sm font-mono hover:bg-slate-200 transition-colors"
                >
                  <span>{roomId}</span>
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Players Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">
                Players ({room.players.length}/{room.maxPlayers})
              </h3>
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            
            <div className="space-y-4">
              {room.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{player.avatar}</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-slate-800">{player.name}</span>
                        {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <span className="text-xs text-slate-500">
                        {player.status === 'connected' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${player.isReady ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={toggleReady}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  isReady 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isReady ? 'Ready!' : 'Mark as Ready'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Room Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Room Settings</h3>
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
                <div className="font-semibold text-slate-800">{room.settings.timeLimit}s</div>
                <div className="text-xs text-slate-500">Time Limit</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <Trophy className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <div className="font-semibold text-slate-800">{room.settings.maxRetries}</div>
                <div className="text-xs text-slate-500">Max Retries</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <Zap className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <div className="font-semibold text-slate-800">
                  {room.settings.showRealTimeScore ? 'On' : 'Off'}
                </div>
                <div className="text-xs text-slate-500">Live Score</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <Users className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <div className="font-semibold text-slate-800">
                  {room.settings.lessonSelection === 'random' ? 'Random' : 'Host'}
                </div>
                <div className="text-xs text-slate-500">Selection</div>
              </div>
            </div>
          </div>

          {/* Lesson Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Lesson Selection</h3>
              {isHost && room.settings.lessonSelection === 'random' && (
                <button
                  onClick={selectRandomLesson}
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
                    <h4 className="font-semibold text-green-800">{selectedLesson.title}</h4>
                    <p className="text-sm text-green-600">{selectedLesson.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-green-600">
                      <span>Level: {selectedLesson.level}</span>
                      <span>Duration: {selectedLesson.duration}s</span>
                      <span>Accent: {selectedLesson.accent}</span>
                    </div>
                  </div>
                  {isHost && (
                    <button
                      onClick={() => setSelectedLesson(null)}
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
                    <p className="mb-4">Select a lesson to start the game</p>
                    {room.settings.lessonSelection === 'host_choice' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        {availableLessons.map((lesson) => (
                          <button
                            key={lesson.lessonId}
                            onClick={() => setSelectedLesson(lesson)}
                            className="p-3 text-left border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-medium text-slate-800">{lesson.title}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {lesson.level} • {lesson.accent}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p>Waiting for host to select a lesson...</p>
                )}
              </div>
            )}
          </div>

          {/* Start Game */}
          {isHost && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Ready to Start?</h3>
                <div className="mb-6">
                  {!allPlayersReady && (
                    <p className="text-sm text-amber-600 mb-2">
                      Waiting for all players to be ready...
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
                  onClick={startGame}
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
  );
};

export default MultiplayerRoom;