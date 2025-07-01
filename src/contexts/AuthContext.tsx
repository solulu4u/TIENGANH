import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react"
import { loginUser, ApiResponse } from "../utils/api"

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const savedUser = localStorage.getItem("ielts_user")
        const token = localStorage.getItem("ielts_token")
        if (savedUser && token) {
            setUser(JSON.parse(savedUser))
        }
    }, [])

    const login = async (
        email: string,
        password: string
    ): Promise<boolean> => {
        try {
            const response: ApiResponse<string> = await loginUser(email, password);

            if (response.success && response.data) {
                // Store the JWT token
                localStorage.setItem("ielts_token", response.data);
                
                // Create a mock user object (you can decode the JWT to get real user data)
                const mockUser: User = {
                    id: "1",
                    username: email.split('@')[0],
                    email: email,
                    fullName: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) + " Student",
                    level: "intermediate",
                    targetScore: 7.0,
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
        localStorage.removeItem("ielts_token")
        localStorage.removeItem("ielts_progress")
    }

    const updateProfile = (updates: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...updates }
            setUser(updatedUser)
            localStorage.setItem("ielts_user", JSON.stringify(updatedUser))
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                isAuthenticated: !!user,
                updateProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
