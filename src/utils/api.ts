const API_BASE_URL = 'http://localhost:5285';

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data: T | null;
  message: string;
}

export const apiCall = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add authorization header if token exists
  const token = localStorage.getItem('ielts_token');
  if (token) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, defaultOptions);
    const data = await response.json();
    
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });
    
    // Log validation errors if any
    if (data.errors) {
      console.log('Validation Errors:', data.errors);
    }
    
    return {
      success: response.ok,
      status: response.status,
      data: data.data || data,
      message: data.message || (response.ok ? 'Success' : 'Request failed')
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

export const loginUser = async (email: string, password: string): Promise<ApiResponse<string>> => {
  return apiCall<string>('/api/identity/login', {
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

export const getCategoriesBySkillName = async (skillName: string): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>(`/api/categories/skill/${encodeURIComponent(skillName)}`);
};

export const getLessonsByCategoryTitle = async (title: string): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>(`/api/lessons/category-title/${encodeURIComponent(title)}`);
}; 