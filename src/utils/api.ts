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
    
    return {
      success: response.ok,
      status: response.status,
      data: data.data || data,
      message: data.message || (response.ok ? 'Success' : 'Request failed'),
    };
  } catch (error) {
    console.error('API call error:', error);
    return {
      success: false,
      status: 0,
      data: null,
      message: 'Network error. Please check your connection.',
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
  level: string;
  targetScore: number;
}): Promise<ApiResponse<any>> => {
  return apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const getSkills = async (): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>('/api/skills/get-all');
};

export const getCategories = async (): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>('/api/categories/get-all');
};

export const getLessonById = async (lessonId: string): Promise<ApiResponse<any>> => {
  return apiCall<any>(`/api/lesson/${lessonId}`);
};

export const getLessonsByCategory = async (category: string): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>(`/api/lesson/category/${category}`);
};

export const getAllLessons = async (): Promise<ApiResponse<any[]>> => {
  return apiCall<any[]>('/api/lesson');
}; 