import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react"
import { loginUser, ApiResponse, refreshAccessToken } from "../utils/api"
import { jwtDecode } from "jwt-decode"

interface User {
    id: string
    username: string
    email: string
    fullName: string
    level: "beginner" | "intermediate" | "advanced"
    targetScore: number
}

interface AuthContextType {
    user: User | null
    login: (email: string, password: string) => Promise<boolean>
    logout: () => void
    isAuthenticated: boolean
    updateProfile: (updates: Partial<User>) => void
    forceClear: () => void
    getValidAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}

// Định nghĩa type cho payload JWT (tùy backend)
type JwtPayload = {
    sub: string; // userId
    email: string;
    fullName?: string;
    username?: string;
    level?: "beginner" | "intermediate" | "advanced";
    targetScore?: number;
    // ... các trường khác nếu có
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const savedUser = localStorage.getItem("ielts_user")
        const accessToken = localStorage.getItem("accessToken")
        console.log("[AuthContext] useEffect - accessToken:", accessToken)
        if (savedUser && accessToken) {
            setUser(JSON.parse(savedUser))
        }
    }, [])

    const login = async (
        email: string,
        password: string
    ): Promise<boolean> => {
        try {
            // Sửa kiểu trả về cho đúng với BE mới
            const response: ApiResponse<{ accessToken: string; refreshToken: string }> = await loginUser(email, password);

            if (response.success && response.data) {
                // Store the JWT tokens
                localStorage.setItem("accessToken", response.data.accessToken);
                localStorage.setItem("refreshToken", response.data.refreshToken);
                console.log("[AuthContext] login - accessToken:", response.data.accessToken);
                console.log("[AuthContext] login - refreshToken:", response.data.refreshToken);
                
                // Decode JWT để lấy user info
                const decoded: JwtPayload = jwtDecode<JwtPayload>(response.data.accessToken);

                const mockUser: User = {
                    id: decoded.sub, // Lấy userId từ JWT (sub)
                    username: decoded.username || email.split('@')[0],
                    email: decoded.email,
                    fullName: decoded.fullName || decoded.username || email.split('@')[0],
                    level: decoded.level || "intermediate",
                    targetScore: decoded.targetScore || 7.0,
                }
                
                setUser(mockUser)
                localStorage.setItem("ielts_user", JSON.stringify(mockUser))
                return true
            } else {
                console.error('Login failed:', response.message);
                return false
            }
        } catch (error) {
            console.error('Login error:', error);
            return false
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem("ielts_user")
        localStorage.removeItem("accessToken")
        localStorage.removeItem("ielts_progress")
    }

    const forceClear = () => {
        localStorage.clear()
        setUser(null)
        console.log("LocalStorage cleared and user reset!")
    }

    const updateProfile = (updates: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...updates }
            setUser(updatedUser)
            localStorage.setItem("ielts_user", JSON.stringify(updatedUser))
        }
    }

    // Hàm kiểm tra accessToken hết hạn
    function isTokenExpired(token: string): boolean {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 < Date.now();
        } catch {
            return true;
        }
    }

    // Hàm lấy accessToken hợp lệ, tự động refresh nếu hết hạn
    const getValidAccessToken = async (): Promise<string | null> => {
        let accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");
        if (!accessToken || !refreshToken) return null;
        if (isTokenExpired(accessToken)) {
            const response = await refreshAccessToken(refreshToken);
            if (response.success && response.data) {
                localStorage.setItem("accessToken", response.data.accessToken);
                localStorage.setItem("refreshToken", response.data.refreshToken);
                accessToken = response.data.accessToken;
            } else {
                logout();
                return null;
            }
        }
        return accessToken;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                isAuthenticated: !!user,
                updateProfile,
                forceClear,
                // Thêm getValidAccessToken vào context nếu muốn dùng ngoài
                getValidAccessToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
