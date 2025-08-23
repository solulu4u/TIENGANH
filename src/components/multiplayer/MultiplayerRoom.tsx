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
    RefreshCw,
    UserX,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { getRoomDetailsInMemory, getLessonsByCategoryTitle, updateRoomSettings, selectLessonInRoom, getCategoriesBySkill, getLessonById, readyPlayerInMemory, kickPlayerInMemory } from "../../utils/api"
import { useGameRoomSignalR } from "../../hooks/useGameRoomSignalR"
import type { Room, Player } from "../../types/multiplayer"
import DictationLessonForPK from "../lessons/DictationLessonForPK"

const MultiplayerRoom: React.FC = () => {
    console.log("[MultiplayerRoom] Render")
    // Lấy roomId từ useParams và đảm bảo là string (fix triệt để)
    const params = useParams();
    let roomId = "";
    if (typeof params.roomId === "string") {
        roomId = params.roomId;
    } else if (params.roomId && typeof (params.roomId as any).roomId === "string") {
        roomId = (params.roomId as any).roomId;
    }
    // Nếu roomId vẫn không phải string, ép về ""
    if (typeof roomId !== "string") roomId = "";
    const navigate = useNavigate()
    const { user, forceClear } = useAuth();
    // Fallback user if auth context is not available
    const currentUser = user || { id: "b26f222f-11c4-4453-9a1e-481fc87d0f0e", name: "Bạn", avatar: "BN" }
    const [room, setRoom] = useState<Room | null>(null)
    const [availableLessons, setAvailableLessons] = useState<any[]>([])
    const [selectedLesson, setSelectedLesson] = useState<any>(null)
    const [showSettings, setShowSettings] = useState(false)
    const [copied, setCopied] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [pkStarted, setPkStarted] = useState(false)
    const [rankings, setRankings] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [selectingLessonId, setSelectingLessonId] = useState<string | null>(null);
    const [selectLessonError, setSelectLessonError] = useState<string | null>(null);
    const [error, setError] = useState<string>("");
    const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
    const [kickNotification, setKickNotification] = useState<string | null>(null);
    const [showKickPopup, setShowKickPopup] = useState(false);
    const [kickConfirm, setKickConfirm] = useState<{id: string, name: string} | null>(null);
    const [isLoadingLessons, setIsLoadingLessons] = useState(false);

    // SignalR hook for real-time multiplayer
    const { joinRoom, leaveRoom, updateSettings: updateRoomSettingsSignalR, testConnection, testUpdateSettings, connection } = useGameRoomSignalR(
        // onPlayerJoined - thêm player mới vào danh sách
        (userId: string, userName: string) => {
            console.log("[MultiplayerRoom] Player joined:", userId, userName)
            setRoom(prev => {
                if (!prev) return prev
                
                // Kiểm tra xem player đã tồn tại chưa
                const existingPlayer = prev.players.find(p => p.id === userId)
                if (existingPlayer) {
                    console.log("[MultiplayerRoom] Player already exists, updating status:", userId)
                    return {
                        ...prev,
                        players: prev.players.map(p => 
                            p.id === userId 
                                ? { ...p, status: "Connected" }
                                : p
                        )
                    }
                }
                
                const newPlayer: Player = {
                    id: userId,
                    name: userName,
                    avatar: userName[0] || "U",
                    isHost: false,
                    isReady: false,
                    score: 0,
                    currentProgress: 0,
                    status: "Connected",
                    joinedAt: new Date().toISOString()
                }
                console.log("[MultiplayerRoom] Adding new player:", newPlayer)
                return {
                    ...prev,
                    players: [...prev.players, newPlayer]
                }
            })
        },
        // onPlayerLeft - xóa player khỏi danh sách
        (userId: string) => {
            console.log("[MultiplayerRoom] Player left:", userId)
            setRoom(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    players: prev.players.filter(p => p.id !== userId)
                }
            })
        },
        // onSettingsUpdated - cập nhật settings của phòng
        (settings: any) => {
            console.log("[MultiplayerRoom] Settings updated received:", settings)
            console.log("[MultiplayerRoom] Current room settings before update:", room?.settings)
            setRoom(prev => {
                if (!prev) {
                    console.log("[MultiplayerRoom] Room is null, cannot update settings")
                    return prev
                }
                const newSettings = { ...prev.settings, ...settings }
                console.log("[MultiplayerRoom] New settings after merge:", newSettings)
                return {
                    ...prev,
                    settings: newSettings
                }
            })
        },
        // onJoinFailed - hiển thị lỗi khi join thất bại
        (message: string) => {
            console.error("[MultiplayerRoom] Join failed:", message)
            // Có thể hiển thị toast notification hoặc redirect về lobby
        },
        // onRoomCreated
        undefined,
        // onRoomClosed
        undefined,
        // onRoomUpdated - cập nhật thông tin phòng khi có thay đổi (bao gồm điểm số)
        (roomData: any) => {
            console.log("[MultiplayerRoom] RoomUpdated event received:", roomData);
            console.log("[MultiplayerRoom] RoomUpdated players data:", roomData?.players);
            
            if (roomData && roomData.players) {
                setRoom(prev => {
                    if (!prev) return prev;
                    
                    const updatedPlayers = roomData.players.map((p: any) => ({
                        id: p.userId,
                        name: p.userName,
                        avatar: p.avatar,
                        isHost: p.isHost,
                        isReady: p.isReady,
                        score: p.score || 0, // Ensure score is updated
                        currentProgress: p.currentProgress || 0,
                        status: p.status || "Connected",
                        joinedAt: p.joinedAt
                    }));
                    
                    console.log("[MultiplayerRoom] Updated players from RoomUpdated:", updatedPlayers);
                    
                    return {
                        ...prev,
                        players: updatedPlayers
                    };
                });
            }
        },
        // onLessonSelected
        (lessonId: string, lessonTitle: string, lessonData: any) => {
            console.log("[MultiplayerRoom] LessonSelected event received:", lessonId, lessonTitle, lessonData);
            // Khi nhận được sự kiện LessonSelected từ SignalR, cập nhật selectedLesson cho mọi client
            setSelectedLesson({ lessonId, title: lessonTitle, ...lessonData });
            
            // Also update room data to reflect the selected lesson
            setRoom(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    selectedLessonId: lessonId,
                    selectedLessonTitle: lessonTitle
                };
            });
            
            // Refresh room data to ensure consistency
            if (roomId) {
                getRoomDetailsInMemory(roomId).then(roomRes => {
                    if (roomRes.success && roomRes.data) {
                        console.log("[MultiplayerRoom] Refreshed room data after lesson selection:", roomRes.data);
                        setRoom(prev => ({
                            ...prev!,
                            selectedLessonId: roomRes.data.selectedLessonId,
                            selectedLessonTitle: roomRes.data.selectedLessonTitle,
                            players: roomRes.data.players.map((p: any) => ({
                                id: p.userId,
                                name: p.userName,
                                avatar: p.avatar,
                                isHost: p.isHost,
                                isReady: p.isReady,
                                score: p.score,
                                currentProgress: p.currentProgress,
                                status: p.status as 'Connected' | 'Disconnected' | 'Playing',
                                joinedAt: p.joinedAt
                            }))
                        }));
                    }
                });
            }
        },
        // onUpdateSettingsFailed - xử lý lỗi khi update settings thất bại
        (message: string) => {
            console.error("[MultiplayerRoom] Update settings failed:", message);
            // Revert local state changes if update failed
            // Có thể hiển thị toast notification
            alert(`Cập nhật settings thất bại: ${message}`);
        },
        // onPlayerReady - xử lý khi player ready
        (receivedRoomId: string) => {
            console.log("[MultiplayerRoom] Player ready event received for room:", receivedRoomId);
            // Refresh room data to get updated player status
            if (receivedRoomId === roomId) {
                getRoomDetailsInMemory(roomId).then(roomRes => {
                    if (roomRes.success && roomRes.data) {
                        setRoom(prev => ({
                            ...prev!,
                            players: roomRes.data.players.map((p: any) => ({
                                id: p.userId,
                                name: p.userName,
                                avatar: p.avatar,
                                isHost: p.isHost,
                                isReady: p.isReady,
                                score: p.score,
                                currentProgress: p.currentProgress,
                                status: p.status as 'Connected' | 'Disconnected' | 'Playing',
                                joinedAt: p.joinedAt
                            }))
                        }));
                    }
                });
            }
        },
        // onPlayerKicked - xử lý khi player bị kick
        (receivedRoomId: string, kickedUserId: string) => {
            console.log("[MultiplayerRoom] Player kicked event received for room:", receivedRoomId, "kicked user:", kickedUserId);
            
            // Check if the current user is the one who was kicked
            if (receivedRoomId === roomId && kickedUserId === currentUser?.id) {
                console.log("[MultiplayerRoom] Current user was kicked from the room");
                console.log("[MultiplayerRoom] Setting kick notification...");
                // Show custom popup notification and redirect to lobby
                setShowKickPopup(true);
                console.log("[MultiplayerRoom] Kick popup set, will redirect in 1.5 seconds");
                setTimeout(() => {
                    console.log("[MultiplayerRoom] Redirecting to lobby...");
                    setShowKickPopup(false);
                    navigate("/dashboard/multiplayer");
                }, 1500); // Delay 1.5 seconds to show popup
                return;
            }
            
            // If it's another player being kicked, refresh room data to get updated player list
            if (receivedRoomId === roomId) {
                getRoomDetailsInMemory(roomId).then(roomRes => {
                    if (roomRes.success && roomRes.data) {
                        setRoom(prev => ({
                            ...prev!,
                            players: roomRes.data.players.map((p: any) => ({
                                id: p.userId,
                                name: p.userName,
                                avatar: p.avatar,
                                isHost: p.isHost,
                                isReady: p.isReady,
                                score: p.score,
                                currentProgress: p.currentProgress,
                                status: p.status as 'Connected' | 'Disconnected' | 'Playing',
                                joinedAt: p.joinedAt
                            }))
                        }));
                    }
                });
            }
        },
        // onGameStarted - chuyển tất cả user sang trang PK
        (startedRoomId: string) => {
            if (startedRoomId === roomId) {
                setPkStarted(true);
            }
        },
               // onPlayerAnswered - xử lý khi player trả lời câu hỏi
       (answerData: any) => {
           console.log("[MultiplayerRoom] PlayerAnswered event received:", answerData);
           
           // KHÔNG cập nhật điểm số từ PlayerAnswered nữa
           // Chỉ cập nhật từ RoomUpdated để tránh duplicate
           console.log("[MultiplayerRoom] Skipping score update from PlayerAnswered to avoid duplicate");
       }
    )

    // Debug function to clear localStorage and refresh
    const handleForceClear = () => {
        forceClear()
        window.location.reload()
    }

    // Join room via SignalR khi component mount
    useEffect(() => {
        if (roomId && currentUser?.id && room && !hasJoinedRoom) {
            const userName = (currentUser as any).name || currentUser.id
            console.log("[MultiplayerRoom] Joining room via SignalR:", roomId, currentUser.id, userName)
            // Luôn join SignalR group để nhận real-time updates
            joinRoom(roomId, currentUser.id, userName)
            setHasJoinedRoom(true)
        }
    }, [roomId, currentUser?.id, room, hasJoinedRoom]) // Bỏ joinRoom khỏi dependencies

    // Leave room via SignalR khi component unmount - chỉ khi thực sự unmount
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (roomId && typeof roomId === "string" && currentUser?.id) {
                console.log("[MultiplayerRoom] Leaving room via SignalR (beforeunload):", roomId, currentUser.id)
                leaveRoom(roomId, currentUser.id)
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            // Chỉ leave room khi component thực sự unmount, không phải re-render
            if (roomId && typeof roomId === "string" && currentUser?.id) {
                console.log("[MultiplayerRoom] Component unmounting, leaving room:", roomId, currentUser.id)
                leaveRoom(roomId, currentUser.id)
            }
        }
    }, [roomId, currentUser?.id]) // Bỏ leaveRoom khỏi dependencies

    // Đặt fetchLessons ở ngoài useEffect, ngay sau khai báo state
    const fetchLessons = () => {
        if (!room || !room.categoryTitle || isLoadingLessons) {
            console.log("[fetchLessons] room or categoryTitle is null, or already loading")
            return
        }
        setIsLoadingLessons(true);
        getLessonsByCategoryTitle(room.categoryTitle)
            .then((data: any) => {
                console.log("[fetchLessons] Lesson API response:", data)
                if (data.success && data.data) {
                    setAvailableLessons(data.data)
                }
            })
            .catch((err: any) => {
                console.error("[fetchLessons] Fetch error:", err)
            })
            .finally(() => {
                setIsLoadingLessons(false);
            })
    }

    const isValidGuid = (id: string) =>
  typeof id === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);

    useEffect(() => {
        console.log("[MultiplayerRoom] useEffect roomId", roomId, typeof roomId);
        if (!roomId || typeof roomId !== "string" || !isValidGuid(roomId)) {
            alert("Room ID không hợp lệ!");
            navigate("/dashboard/multiplayer");
            return;
        }
        // Load room data
        getRoomDetailsInMemory(roomId)
            .then(res => {
                if (res.status === 404 || (res.success === false && res.message === "Room not found")) {
                    setError("Phòng không tồn tại hoặc bạn không còn trong phòng này.");
                    setRoom(null);
                    return;
                }
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
                    
                    // Check if current user is still in the room (they might have been kicked)
                    const isUserInRoom = roomData.players.some(p => p.id === currentUser?.id);
                    if (!isUserInRoom) {
                        console.log("[MultiplayerRoom] Current user is not in the room anymore, redirecting to lobby");
                        setShowKickPopup(true);
                        setTimeout(() => {
                            setShowKickPopup(false);
                            navigate("/dashboard/multiplayer");
                        }, 1500); // Delay 1.5 seconds to show popup
                        return;
                    }
                    
                    setRoom(roomData)
                    setError("");
                    
                    // Check for selected lesson in multiple possible locations
                    let lessonData = null;
                    
                    // Check if lessonSelection is an object (lesson data)
                    if (
                        typeof res.data.settings?.lessonSelection === "object" &&
                        res.data.settings.lessonSelection !== null
                    ) {
                        lessonData = res.data.settings.lessonSelection;
                        console.log("[MultiplayerRoom] Found lesson in settings.lessonSelection:", lessonData);
                    }
                    // Check if selectedLessonId exists and we have lesson data
                    else if (res.data.selectedLessonId) {
                        console.log("[MultiplayerRoom] Found selectedLessonId:", res.data.selectedLessonId);
                        // Try to find lesson in availableLessons or fetch it
                        if (availableLessons.length > 0) {
                            lessonData = availableLessons.find(l => l.lessonId === res.data.selectedLessonId);
                            console.log("[MultiplayerRoom] Found lesson in availableLessons:", lessonData);
                        }
                    }
                    
                    if (lessonData) {
                        setSelectedLesson(lessonData);
                        console.log("[MultiplayerRoom] Setting selected lesson:", lessonData);
                    } else if (res.data.selectedLessonId) {
                        // If we have selectedLessonId, we'll handle it in the useEffect above
                        console.log("[MultiplayerRoom] Have selectedLessonId:", res.data.selectedLessonId);
                        setSelectedLesson(null); // Set to null temporarily, will be set by useEffect
                    } else {
                        // No selected lesson yet, this is normal for new rooms
                        setSelectedLesson(null);
                        console.log("[MultiplayerRoom] No lesson selected yet (normal for new rooms)");
                    }
                } else {
                    setError(res.message || "Phòng không tồn tại hoặc bạn không còn trong phòng này.");
                    setRoom(null);
                }
            })
            .catch(err => {
                setError("Lỗi mạng hoặc phòng không tồn tại.");
                setRoom(null);
            })
    }, [roomId])

    useEffect(() => {
        // Gửi ranking ra ngoài
        // onRankingUpdate([...scores].sort((a, b) => b.score - a.score))
        console.log("[MultiplayerRoom] rankings updated:", rankings)
    }, [rankings])

    // Debug kick popup
    useEffect(() => {
        if (showKickPopup) {
            console.log("[MultiplayerRoom] Kick popup state changed:", showKickPopup)
        }
    }, [showKickPopup])

    // Handle selected lesson when availableLessons are loaded
    useEffect(() => {
        if (room && room.selectedLessonId && availableLessons.length > 0 && !selectedLesson) {
            console.log("[MultiplayerRoom] Available lessons loaded, checking for selected lesson:", room.selectedLessonId);
            console.log("[MultiplayerRoom] Available lessons:", availableLessons.map(l => ({ id: l.lessonId, title: l.title })));
            const foundLesson = availableLessons.find((l: any) => l.lessonId === room.selectedLessonId);
            if (foundLesson) {
                setSelectedLesson(foundLesson);
                console.log("[MultiplayerRoom] Found and set selected lesson from availableLessons:", foundLesson);
            } else {
                console.log("[MultiplayerRoom] Selected lesson not found in availableLessons");
            }
        }
    }, [room, availableLessons, selectedLesson])

    // Force sync selectedLesson when availableLessons change
    useEffect(() => {
        if (room?.selectedLessonId && availableLessons.length > 0) {
            console.log("[MultiplayerRoom] Force sync - checking for lesson:", room.selectedLessonId);
            console.log("[MultiplayerRoom] Available lessons IDs:", availableLessons.map(l => l.lessonId));
            const foundLesson = availableLessons.find((l: any) => l.lessonId === room.selectedLessonId);
            if (foundLesson && !selectedLesson) {
                console.log("[MultiplayerRoom] Force sync - setting selected lesson:", foundLesson);
                setSelectedLesson(foundLesson);
            } else if (!foundLesson) {
                console.log("[MultiplayerRoom] Force sync - lesson not found in availableLessons");
            } else if (selectedLesson) {
                console.log("[MultiplayerRoom] Force sync - lesson already selected");
            }
        }
    }, [room?.selectedLessonId, availableLessons])

    // Debug room data changes
    useEffect(() => {
        if (room) {
            console.log("[MultiplayerRoom] Room data changed:");
            console.log("  - selectedLessonId:", room.selectedLessonId);
            console.log("  - selectedLessonTitle:", room.selectedLessonTitle);
            console.log("  - current selectedLesson state:", selectedLesson);
            console.log("  - availableLessons length:", availableLessons.length);
            
            // Manual sync if needed
            if (room.selectedLessonId && availableLessons.length > 0 && !selectedLesson) {
                console.log("[MultiplayerRoom] Manual sync attempt...");
                const foundLesson = availableLessons.find((l: any) => l.lessonId === room.selectedLessonId);
                if (foundLesson) {
                    console.log("[MultiplayerRoom] Manual sync - setting lesson:", foundLesson);
                    setSelectedLesson(foundLesson);
                }
            }
        }
    }, [room?.selectedLessonId, room?.selectedLessonTitle, selectedLesson, availableLessons.length])

    // Fix host detection logic
    const isHost = currentUser?.id === room?.hostId;
    console.log("currentUser.id:", currentUser?.id, "room.hostId:", room?.hostId, "isHost:", isHost);

    // Get host player info from players array
    const hostPlayer = room?.players.find(p => p.id === room?.hostId);
    const hostName = hostPlayer?.name || room?.hostName || "Unknown Host";
    const hostAvatar = hostPlayer?.avatar || room?.hostAvatar || "";

    // Fetch categories nếu là host và chưa có
    useEffect(() => {
        console.log(
            "[MultiplayerRoom] useEffect isHost",
            isHost,
            "categories.length",
            categories.length
        )
        if (isHost && categories.length === 0) {
            getCategoriesBySkill("Dictation")
                .then((data: any) => {
                    console.log(
                        "[MultiplayerRoom] categories API response:",
                        data
                    )
                    if (data.success && data.data) setCategories(data.data)
                })
                .catch((err: any) => {
                    console.error(
                        "[MultiplayerRoom] categories fetch error:",
                        err
                    )
                })
        }
    }, [isHost, categories.length])

    // Fetch lessons for all users when room is loaded
    useEffect(() => {
        if (room && room.categoryTitle && availableLessons.length === 0 && !isLoadingLessons) {
            console.log("[MultiplayerRoom] Room loaded, checking for lessons...");
            console.log("[MultiplayerRoom] Category title:", room.categoryTitle);
            console.log("[MultiplayerRoom] Selected lesson ID:", room.selectedLessonId);
            console.log("[MultiplayerRoom] Selected lesson title:", room.selectedLessonTitle);
            console.log("[MultiplayerRoom] Lesson selection mode:", room.settings?.lessonSelection);
            console.log("[MultiplayerRoom] Current selectedLesson state:", selectedLesson);
            
            setIsLoadingLessons(true);
            getLessonsByCategoryTitle(room.categoryTitle)
                .then((data: any) => {
                    console.log("[MultiplayerRoom] Fetched lessons for room:", data);
                    if (data.success && data.data) {
                        setAvailableLessons(data.data);
                        
                        // If there's a selected lesson, find and set it
                        if (room.selectedLessonId) {
                            const foundLesson = data.data.find((l: any) => l.lessonId === room.selectedLessonId);
                            if (foundLesson) {
                                setSelectedLesson(foundLesson);
                                console.log("[MultiplayerRoom] Set selected lesson after fetching lessons:", foundLesson);
                            } else {
                                console.log("[MultiplayerRoom] Selected lesson not found in fetched lessons");
                            }
                        } else {
                            console.log("[MultiplayerRoom] No selected lesson ID, keeping selectedLesson as null");
                        }
                    }
                })
                .catch((err: any) => {
                    console.error("[MultiplayerRoom] Error fetching lessons for room:", err);
                })
                .finally(() => {
                    setIsLoadingLessons(false);
                });
        }
    }, [room, availableLessons.length, isLoadingLessons])

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

    // Room Settings: Host được chỉnh, user chỉ xem
    const handleUpdateSettings = async (newSettings: Partial<Room["settings"]> = {}) => {
        if (!isHost) return; // Chỉ host mới được phép chỉnh
        
        // Cập nhật local state ngay lập tức để UI responsive
        setRoom(prev =>
            prev ? { ...prev, settings: { ...prev.settings, ...newSettings } } : prev
        )
        
        if (roomId) {
            try {
                // Chỉ sử dụng SignalR cho realtime, không gọi API
                const settingsToSend = {
                    timeLimit: newSettings.timeLimit ?? room?.settings?.timeLimit ?? 60,
                    maxRetries: newSettings.maxRetries ?? room?.settings?.maxRetries ?? 2,
                    showRealTimeScore: newSettings.showRealTimeScore ?? room?.settings?.showRealTimeScore ?? true,
                    allowHints: newSettings.allowHints ?? room?.settings?.allowHints ?? true,
                    lessonSelection: newSettings.lessonSelection ?? room?.settings?.lessonSelection ?? "host_choice"
                };
                
                console.log("[MultiplayerRoom] Sending settings via SignalR:", settingsToSend);
                await updateRoomSettingsSignalR(roomId, settingsToSend);
            } catch (error) {
                console.error("[MultiplayerRoom] Failed to update settings:", error);
                // Revert local state changes on error
                setRoom(prev =>
                    prev ? { ...prev, settings: { ...prev.settings } } : prev
                );
            }
        }
    }

    // Lesson selection: chỉ host được chọn bài, đồng bộ qua SignalR
    const handleSelectLesson = async (lessonId: string) => {
        if (!isHost) return; // Chỉ host được chọn bài
        setSelectingLessonId(lessonId);
        setSelectLessonError(null);
        if (roomId) {
            const res = await selectLessonInRoom(roomId, lessonId);
            if (res.success) {
                // Tìm lesson từ availableLessons và setSelectedLesson
                const lesson = availableLessons.find(l => l.lessonId === lessonId);
                if (lesson) {
                    setSelectedLesson(lesson);
                    // Cập nhật vào room object để đồng bộ với non-host
                    setRoom(prev => prev ? {
                        ...prev,
                        selectedLessonId: lesson.lessonId,
                        selectedLessonTitle: lesson.title
                    } : prev);
                }
                // Không cần gọi connection.invoke('LessonSelected', ...) vì backend đã broadcast
            } else {
                setSelectLessonError(res.message || "Failed to select lesson");
            }
        }
        setSelectingLessonId(null);
    };

    // Thêm hàm random lesson vào trong component MultiplayerRoom
    const handleRandomLesson = async () => {
        if (!isHost || availableLessons.length === 0) return;
        const randomIndex = Math.floor(Math.random() * availableLessons.length);
        const lesson = availableLessons[randomIndex];
        setSelectedLesson(lesson);
        setSelectingLessonId(lesson.lessonId);
        setSelectLessonError(null);
        if (roomId) {
            const res = await selectLessonInRoom(roomId, lesson.lessonId);
            if (!res.success) {
                setSelectLessonError(res.message || "Failed to select lesson");
            } else {
                // Cập nhật vào room object để đồng bộ với non-host
                setRoom(prev => prev ? {
                    ...prev,
                    selectedLessonId: lesson.lessonId,
                    selectedLessonTitle: lesson.title
                } : prev);
            }
        }
        setSelectingLessonId(null);
    };

    // Handle kick player
    const handleKickPlayer = async (targetUserId: string, targetUserName: string) => {
        if (!isHost || !roomId) return;

        try {
            const res = await kickPlayerInMemory(roomId, targetUserId);
            if (res.success) {
                // Refresh room data to reflect the change
                getRoomDetailsInMemory(roomId).then(roomRes => {
                    if (roomRes.success && roomRes.data) {
                        setRoom(prev => ({
                            ...prev!,
                            players: roomRes.data.players.map((p: any) => ({
                                id: p.userId,
                                name: p.userName,
                                avatar: p.avatar,
                                isHost: p.isHost,
                                isReady: p.isReady,
                                score: p.score,
                                currentProgress: p.currentProgress,
                                status: p.status as 'Connected' | 'Disconnected' | 'Playing',
                                joinedAt: p.joinedAt
                            }))
                        }));
                    }
                });
                // Show success message in a more elegant way
                console.log(`${targetUserName} đã bị kick khỏi phòng.`);
            } else {
                console.error(`Không thể kick ${targetUserName}: ${res.message}`);
            }
        } catch (error) {
            console.error('Error kicking player:', error);
        }
    };

    // Xử lý khi host bấm Start Game
    const handleStartGame = async () => {
        try {
            if (isHost && connection && roomId) {
                console.log("[MultiplayerRoom] Invoking StartGame with roomId:", roomId);
                await connection.invoke("StartGame", roomId);
                console.log("[MultiplayerRoom] StartGame invoked successfully");
            }
            setPkStarted(true); // Host cũng chuyển luôn
        } catch (error) {
            console.error("[MultiplayerRoom] Error starting game:", error);
            alert("Không thể bắt đầu game. Vui lòng thử lại.");
        }
    };

    if (!room) {
        console.log("[MultiplayerRoom] room is null, render not found");
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-semibold text-slate-800">
                    {error ? error : "Phòng không tồn tại hoặc bạn không còn trong phòng này."}
                </h2>
                <button
                    onClick={() => navigate("/dashboard/multiplayer")}
                    className="mt-4 text-blue-600 hover:text-blue-700"
                >
                    Back to Lobby
                </button>
            </div>
        )
    }
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
                                    .sort((a, b) => b.score - a.score)
                                    .map((p, i) => {
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
    // Tính toán điều kiện để start game
    const nonHostPlayers = room.players.filter(p => !p.isHost);
    const allNonHostReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);
    const canStartGame = isHost && selectedLesson && room.players.length >= 2 && allNonHostReady;
    const currentPlayer = room.players.find(p => p.id === currentUser.id);
    // UI: Nếu là non-host, đã ready nhưng chưa đủ non-host ready, show waiting message
    let showWaitingForOthers = false;
    if (!isHost && selectedLesson && currentPlayer?.isReady && nonHostPlayers.length > 0 && !allNonHostReady) {
        showWaitingForOthers = true;
    }
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Custom Kick Popup */}
            {showKickPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 transform transition-all duration-300 scale-100">
                        <div className="text-center">
                            {/* Icon */}
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <UserX className="w-8 h-8 text-red-600" />
                            </div>
                            
                            {/* Title */}
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Bạn đã bị kick khỏi phòng
                            </h3>
                            
                            {/* Message */}
                            <p className="text-gray-600 mb-6">
                                Bạn đã bị host kick khỏi phòng này. Bạn sẽ được chuyển về lobby trong vài giây.
                            </p>
                            
                            {/* Loading Animation */}
                            <div className="flex justify-center mb-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                            </div>
                            
                            {/* Redirect Info */}
                            <p className="text-sm text-gray-500">
                                Đang chuyển về lobby...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Kick Confirmation Modal */}
            {kickConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm mx-4 transform transition-all duration-300 scale-100">
                        <div className="text-center">
                            {/* Icon */}
                            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <UserX className="w-6 h-6 text-red-600" />
                            </div>
                            
                            {/* Title */}
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                Xác nhận kick
                            </h3>
                            
                            {/* Message */}
                            <p className="text-gray-600 mb-6">
                                Bạn có chắc chắn muốn kick <span className="font-semibold text-red-600">{kickConfirm.name}</span> khỏi phòng?
                            </p>
                            
                            {/* Buttons */}
                            <div className="flex justify-center space-x-3">
                                <button
                                    onClick={() => setKickConfirm(null)}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={async () => {
                                        await handleKickPlayer(kickConfirm.id, kickConfirm.name);
                                        setKickConfirm(null);
                                    }}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                                >
                                    Kick
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
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
                                    Host: {hostName}
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
                <div className="flex items-center space-x-2">
                {/* Đã xóa Test SignalR và Test UpdateSettings */}
                </div>
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
                            {room.players.map((player, index) => (
                                <div
                                    key={`${player.id}-${index}`}
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
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className={`w-3 h-3 rounded-full ${
                                                player.isReady
                                                    ? "bg-green-500"
                                                    : "bg-gray-300"
                                            }`}
                                        ></div>
                                        {/* Kick button - only show for host and non-host players */}
                                        {isHost && !player.isHost && (
                                            <button
                                                onClick={() => setKickConfirm({id: player.id, name: player.name})}
                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                                title={`Kick ${player.name}`}
                                            >
                                                <UserX className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
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
                            {/* Time Limit */}
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <Clock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                {isHost ? (
                                    <input
                                        type="number"
                                        min={10}
                                        max={600}
                                        value={room.settings?.timeLimit || 60}
                                        onChange={async e => {
                                            const value = Math.max(10, Math.min(600, Number(e.target.value)))
                                            await handleUpdateSettings({ timeLimit: value })
                                        }}
                                        className="w-20 text-center font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <div className="font-semibold text-slate-800">
                                        {room.settings?.timeLimit || 60}s
                                    </div>
                                )}
                                <div className="text-xs text-slate-500">
                                    Time Limit
                                </div>
                            </div>
                            {/* Max Retries */}
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <Trophy className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                {isHost ? (
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={room.settings?.maxRetries || 2}
                                        onChange={async e => {
                                            const value = Math.max(1, Math.min(10, Number(e.target.value)))
                                            await handleUpdateSettings({ maxRetries: value })
                                        }}
                                        className="w-20 text-center font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <div className="font-semibold text-slate-800">
                                        {room.settings?.maxRetries || 2}
                                    </div>
                                )}
                                <div className="text-xs text-slate-500">
                                    Max Retries
                                </div>
                            </div>
                            {/* showRealTimeScore */}
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <Zap className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                {isHost ? (
                                    <label className="flex items-center justify-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={room.settings?.showRealTimeScore ?? true}
                                            onChange={async e => await handleUpdateSettings({ showRealTimeScore: e.target.checked })}
                                        />
                                        <span>{room.settings?.showRealTimeScore ? "On" : "Off"}</span>
                                    </label>
                                ) : (
                                <div className="font-semibold text-slate-800">
                                        {room.settings?.showRealTimeScore ? "On" : "Off"}
                                </div>
                                )}
                                <div className="text-xs text-slate-500">
                                    Live Score
                                </div>
                            </div>
                            {/* Selection */}
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <Users className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                                <div className="font-semibold text-slate-800">
                                    {room.settings?.lessonSelection === "random"
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
                                room.settings?.lessonSelection === "host_choice" && (
                                    <button
                                        onClick={handleRandomLesson}
                                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        <Shuffle className="w-4 h-4" />
                                        <span>Random Lesson</span>
                                    </button>
                                )}
                        </div>

                        {selectedLesson && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4">
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
                                            onClick={() => {
                                                setSelectedLesson(null);
                                            }}
                                            className="text-green-600 hover:text-green-800 text-sm border border-green-300 rounded px-3 py-1 ml-4"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                                {/* Nút Sẵn sàng cho user không phải host */}
                                {!isHost && selectedLesson && (
                                    <div className="text-center mt-4">
                                        <button
                                            onClick={async () => {
                                                if (!roomId) return;
                                                const newReadyState = !room?.players.find(p => p.id === currentUser.id)?.isReady;
                                                const res = await readyPlayerInMemory(roomId, newReadyState);
                                                if (res.success) {
                                                    // Sau khi ready/unready thành công, cập nhật lại room từ server
                                                    getRoomDetailsInMemory(roomId).then(roomRes => {
                                                        if (roomRes.success && roomRes.data) {
                                                            setRoom(prev => ({
                                                                ...prev!,
                                                                players: roomRes.data.players.map((p: any) => ({
                                                                    id: p.userId,
                                                                    name: p.userName,
                                                                    avatar: p.avatar,
                                                                    isHost: p.isHost,
                                                                    isReady: p.isReady,
                                                                    score: p.score,
                                                                    currentProgress: p.currentProgress,
                                                                    status: p.status as 'Connected' | 'Disconnected' | 'Playing',
                                                                    joinedAt: p.joinedAt
                                                                }))
                                                            }));
                                                        }
                                                    });
                                                    // setIsReady(newReadyState); // Remove this line, state is derived from room.players
                                                }
                                            }}
                                            className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${
                                                room?.players.find(p => p.id === currentUser.id)?.isReady
                                                    ? "bg-red-500 hover:bg-red-600"
                                                    : "bg-green-600 hover:bg-green-700"
                                            }`}
                                        >
                                            {room?.players.find(p => p.id === currentUser.id)?.isReady ? "Cancel" : "Ready"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Lesson Selection Interface - Always show for host when no lesson is selected or when editing */}
                        {(!selectedLesson || (isHost && room.settings?.lessonSelection === "host_choice")) && (
                            <div className="text-center py-8 text-slate-500">
                                {isHost ? (
                                    <div>
                                        <p className="mb-4">
                                            {selectedLesson ? "Change lesson or select a new one:" : "Select a lesson to start the game"}
                                        </p>
                                        {isHost && room.settings?.lessonSelection === "host_choice" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setSelectedLesson(null);
                                                    }}
                                                    className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    {selectedLesson ? "Chọn bài khác" : "Chọn bài"}
                                                </button>
                                                {availableLessons.length > 0 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                                                        {availableLessons.map(lesson => (
                                                            <button
                                                                key={lesson.lessonId}
                                                                disabled={!!selectingLessonId}
                                                                onClick={() => handleSelectLesson(lesson.lessonId)}
                                                                className={`p-3 text-left border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors ${
                                                                    selectingLessonId === lesson.lessonId ? "opacity-50" : ""
                                                                }`}
                                                            >
                                                                <div className="font-medium text-slate-800">{lesson.title}</div>
                                                                <div className="text-xs text-slate-500 mt-1">{lesson.level} • {lesson.accent}</div>
                                                                {selectingLessonId === lesson.lessonId && <div className="text-blue-500 text-xs mt-1">Đang chọn...</div>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {selectLessonError && <div className="text-red-500 mt-2">{selectLessonError}</div>}
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

                    {/* Start Game */}
                    {isHost && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                    Ready to Start?
                                </h3>
                                <div className="mb-6">
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
                                    {room.players.length >= 2 && !allNonHostReady && (
                                        <p className="text-sm text-amber-600 mb-2">
                                            All players must be ready to start
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleStartGame}
                                    disabled={!canStartGame}
                                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 mx-auto"
                                >
                                    <Play className="w-6 h-6" />
                                    <span>Start Game</span>
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Non-host waiting message */}
                    {!isHost && showWaitingForOthers && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-4">
                            <div className="text-center text-amber-600 font-semibold">
                                Waiting for other players to be ready...
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
    const { submitAnswer } = useGameRoomSignalR()
    const { user } = useAuth()

    return (
        <DictationLessonForPK
            players={room.players}
            onScoreChange={onRankingUpdate}
            lessonId={selectedLesson?.lessonId}
            timeLimit={room.settings?.timeLimit || 60}
            submitAnswer={submitAnswer}
            roomId={room.id}
            currentUser={user ? { id: user.id, name: user.username } : undefined}
        />
    )
}
export default MultiplayerRoom
