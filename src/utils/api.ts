const API_BASE_URL = 'http://localhost:5285';


export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data: T | null;
  message: string;
}

import { useAuth } from "../contexts/AuthContext";

export const apiCall = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
  retry = true // chỉ retry 1 lần nếu refresh thành công
): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;

  let accessToken = localStorage.getItem('accessToken');
  let defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (accessToken) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    };
  }

  try {
    let response = await fetch(url, defaultOptions);
    // Nếu bị 401 và có refreshToken, thử refresh và retry 1 lần
    if (response.status === 401 && retry) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshRes = await refreshAccessToken(refreshToken);
        if (refreshRes.success && refreshRes.data) {
          localStorage.setItem('accessToken', refreshRes.data.accessToken);
          localStorage.setItem('refreshToken', refreshRes.data.refreshToken);
          // Retry request với token mới
          defaultOptions.headers = {
            ...defaultOptions.headers,
            'Authorization': `Bearer ${refreshRes.data.accessToken}`,
          };
          response = await fetch(url, defaultOptions);
        } else {
          // Nếu refresh cũng fail thì logout FE
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    }
    let data: any = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Không phải JSON, giữ nguyên data = null
      }
    }
    return {
      success: response.ok,
      status: response.status,
      data: data?.data || data,
      message: data?.message || (response.ok ? 'Success' : 'Request failed')
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      status: 0,
      data: null,
      message: 'Network error'
    };
  }
};

export const loginUser = async (email: string, password: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> => {
  return apiCall<{ accessToken: string; refreshToken: string }>('/api/identity/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const registerUser = async (userData: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  targetScore: number;
}): Promise<ApiResponse<any>> => {
  // Convert level to enum number
  const levelMap = {
    'beginner': 0,
    'intermediate': 1,
    'advanced': 2
  };
  
  const requestData = {
    fullName: userData.fullName,
    email: userData.email,
    password: userData.password,
    confirmPassword: userData.confirmPassword,
    CurrentLevel: levelMap[userData.level],
    targetScore: userData.targetScore
  };
  
  console.log('Register request data:', requestData);
  
  return apiCall('/api/identity/register', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
};

export const getSkills = async (): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>('/api/skills/get-all');
};

export const getCategories = async (): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>('/api/categories/get-all');
};

export const getLessonById = async (lessonId: string): Promise<ApiResponse<any>> => {
  return apiCall<any>(`/api/lessons/${lessonId}`);
};

export const getLessonSentences = async (lessonId: string): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>(`/api/lessons/${lessonId}/sentences`);
};

export const getLessonsByCategory = async (category: string): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>(`/api/lesson/category/${category}`);
};

export const getAllLessons = async (): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>('/api/lessons/get-all');
};

export const getProgressesByUser = async (userId: string): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>(`/api/progress/${userId}`);
};

export const createProgress = async (data: any): Promise<ApiResponse<any>> => {
  return apiCall<any>(`/api/progress`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateProgress = async (data: any): Promise<ApiResponse<any>> => {
  return apiCall<any>(`/api/progress/update`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getCategoryByTitle = async (title: string): Promise<ApiResponse<any>> => {
  return apiCall<any>(`/api/categories/CategoryTitle/${encodeURIComponent(title)}`);
};

export const getCategoriesBySkill = async (skill: string): Promise<ApiResponse<any[]>> => {
    return apiCall<any[]>(`/api/categories/skill/${encodeURIComponent(skill)}`);
};

export const getLessonsByCategoryTitle = async (categoryTitle: string): Promise<ApiResponse<any[]>> => {
    return apiCall<any[]>(`/api/lessons/category-title/${encodeURIComponent(categoryTitle)}`);
};

// ========== MULTIPLAYER API FUNCTIONS ==========

// Create a new game room
export const createGameRoom = async (data: {
  roomName: string;
  maxPlayers: number;
  categoryId: string;
}): Promise<ApiResponse<string>> => {
  return apiCall<string>('/api/GameRooms/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Get active rooms
export const getActiveRooms = async (params?: {
  searchTerm?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<any[]>> => {
  const queryParams = new URLSearchParams();
  if (params?.searchTerm) queryParams.append('searchTerm', params.searchTerm);
  if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  
  const queryString = queryParams.toString();
  const endpoint = `/api/GameRooms/active${queryString ? `?${queryString}` : ''}`;
  
  return apiCall<any[]>(endpoint);
};

// Join a game room
export const joinGameRoom = async (roomId: string): Promise<ApiResponse<string>> => {
  return apiCall<string>('/api/GameRooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomId }),
  });
};

// Leave a game room
export const leaveGameRoom = async (roomId: string): Promise<ApiResponse<string>> => {
  return apiCall<string>('/api/GameRooms/leave', {
    method: 'POST',
    body: JSON.stringify({ roomId }),
  });
};

// Get room details
export const getRoomDetails = async (roomId: string): Promise<ApiResponse<any>> => {
  const response = await apiCall<any>(`/api/GameRooms/${roomId}`);
  
  if (response.success && response.data) {
    // Transform backend response to frontend format
    const backendRoom = response.data;
    const frontendRoom = {
      id: backendRoom.id,
      name: backendRoom.roomName || backendRoom.name,
      hostId: backendRoom.hostId,
      hostName: backendRoom.hostName,
      players: backendRoom.players?.map((p: any) => ({
        id: p.userId || p.id,
        name: p.userName || p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        isReady: p.isReady,
        score: p.score,
        currentProgress: p.currentProgress || 0,
        status: p.status,
        joinedAt: p.joinedAt
      })) || [],
      maxPlayers: backendRoom.maxPlayers,
      status: backendRoom.status,
      currentSentence: backendRoom.currentSentence || 0,
      categoryId: backendRoom.categoryId,
      categoryTitle: backendRoom.categoryTitle,
      createdAt: new Date(backendRoom.createdAt),
      // Backend fields
      roomName: backendRoom.roomName,
      hostAvatar: backendRoom.hostAvatar,
      currentPlayers: backendRoom.currentPlayers,
      selectedLessonId: backendRoom.selectedLessonId,
      selectedLessonTitle: backendRoom.selectedLessonTitle,
      categoryDescription: backendRoom.categoryDescription,
      categoryDifficult: backendRoom.categoryDifficult,
      createdBy: backendRoom.createdBy
    };
    
    return {
      ...response,
      data: frontendRoom
    };
  }
  
  return response;
};

// Get room players
export const getRoomPlayers = async (roomId: string): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>(`/api/GameRooms/${roomId}/players`);
};

// Toggle ready status
export const toggleReadyStatus = async (roomId: string): Promise<ApiResponse<any>> => {
  return apiCall<any>(`/api/GameRooms/${roomId}/ready`, {
    method: 'PATCH',
  });
};

// Select lesson for room
export const selectLesson = async (roomId: string, lessonId: string): Promise<ApiResponse<boolean>> => {
  return apiCall<boolean>(`/api/GameRooms/${roomId}/select-lesson`, {
    method: 'PATCH',
    body: JSON.stringify({ lessonId }),
  });
};

// Update room settings
export const updateRoomSettings = async (roomId: string, settings: {
  timeLimit: number;
  maxRetries: number;
  showRealTimeScore: boolean;
}): Promise<ApiResponse<boolean>> => {
  return apiCall<boolean>(`/api/GameRooms/${roomId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};

// Start game session
export const startGameSession = async (roomId: string, lessonId: string): Promise<ApiResponse<any>> => {
  return apiCall<any>(`/api/GameRooms/${roomId}/game/start`, {
    method: 'POST',
    body: JSON.stringify({ lessonId }),
  });
}; 

// In-Memory GameRoom APIs (SignalR + In-Memory)
export const getActiveRoomsInMemory = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/GameRoomInMemory/active`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching active rooms (in-memory):', error);
        return { success: false, message: 'Network error' };
    }
};

export const getRoomDetailsInMemory = async (roomId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/GameRoomInMemory/${roomId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching room details (in-memory):', error);
        return { success: false, message: 'Network error' };
    }
};

export const createGameRoomInMemory = async (roomData: {
    roomName: string;
    maxPlayers: number;
    categoryId: string;
}) => {
    // Lấy token từ localStorage (hoặc bạn có thể lấy từ AuthContext nếu muốn)
    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`${API_BASE_URL}/api/GameRoomInMemory/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(roomData),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `HTTP error ${response.status}`);
        }
        return await response.json();
    } catch (error: any) {
        console.error('Error creating room (in-memory):', error);
        return { success: false, message: error.message || 'Network error' };
    }
};

export const joinGameRoomInMemory = async (roomId: string) => {
    return apiCall(`/api/GameRoomInMemory/${roomId}/join`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
}; 

export const selectLessonInRoom = async (roomId: string, lessonId: string) => {
    return apiCall(`/api/GameRoomInMemory/${roomId}/select-lesson`, {
        method: 'POST',
        body: JSON.stringify({ lessonId }),
    });
};

export const readyPlayerInMemory = async (roomId: string, isReady: boolean) => {
    return apiCall(`/api/GameRoomInMemory/${roomId}/ready`, {
        method: 'POST',
        body: JSON.stringify({ isReady }),
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

export const kickPlayerInMemory = async (roomId: string, targetUserId: string) => {
    return apiCall(`/api/GameRoomInMemory/${roomId}/kick`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
        headers: {
            'Content-Type': 'application/json'
        }
    });
}; 

export const refreshAccessToken = async (refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> => {
  return apiCall<{ accessToken: string; refreshToken: string }>('/api/identity/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}; 