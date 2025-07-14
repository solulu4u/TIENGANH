import React from "react"
import { NavLink } from "react-router-dom"
import {
    Home,
    BookOpen,
    PenTool,
    Headphones,
    MessageSquare,
    BookMarked,
    FileText,
    Mic,
    User,
    Users,
    Zap,
    ChevronLeft,
    ChevronRight,
    BarChart3,
} from "lucide-react"

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    // { name: 'Reading', href: '/dashboard/lessons/reading', icon: BookOpen },
    // { name: 'Writing', href: '/dashboard/lessons/writing', icon: PenTool },
    // { name: 'Listening', href: '/dashboard/lessons/listening', icon: Headphones },
    // { name: 'Speaking', href: '/dashboard/lessons/speaking', icon: MessageSquare },
    { name: "Dictation", href: "/dashboard/dictation", icon: Mic },
    { name: "Multiplayer", href: "/dashboard/multiplayer", icon: Users },
    { name: "Analysis", href: "/dashboard/analysis", icon: BarChart3 },
    // { name: 'Vocabulary', href: '/dashboard/lessons/vocabulary', icon: BookMarked },
    // { name: 'Grammar', href: '/dashboard/lessons/grammar', icon: FileText },
    // { name: 'Profile', href: '/dashboard/profile', icon: User },
]

interface SidebarProps {
    collapsed: boolean
    onToggle: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
    return (
        <div
            className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white shadow-xl border-r border-slate-200 transition-all duration-300 z-40 ${
                collapsed ? "w-16" : "w-64"
            }`}
        >
            <nav className="p-4 space-y-2">
                {navigation.map(item => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            `flex items-center rounded-xl transition-all duration-200 group relative ${
                                collapsed
                                    ? "justify-center px-3 py-3"
                                    : "space-x-3 px-4 py-3"
                            } ${
                                isActive
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                            }`
                        }
                        title={collapsed ? item.name : undefined}
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                            <span className="font-medium">{item.name}</span>
                        )}
                        {collapsed && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                                {item.name}
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Toggle Button - ở giữa sidebar */}
            <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-50">
                <button
                    onClick={onToggle}
                    className="w-8 h-8 bg-white border border-slate-200 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 hover:shadow-xl transition-all duration-200 group"
                    title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-800" />
                    ) : (
                        <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:text-slate-800" />
                    )}
                </button>
            </div>
        </div>
    )
}

export default Sidebar
