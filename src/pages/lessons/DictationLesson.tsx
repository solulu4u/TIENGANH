
import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    ArrowLeft,
    Play,
    Pause,
    RotateCcw,
    Check,
    ArrowRight,
    Eye,
    EyeOff,
} from "lucide-react"
import { useProgress } from "../../contexts/ProgressContext"
import { getLessonById } from '../../utils/api';

// --- CÁC INTERFACE VÀ HÀM LOGIC (KHÔNG THAY ĐỔI) --- //
interface Character {
    char: string
    status: "correct" | "incorrect" | "extra" | "missing"
    isCorrect: boolean
    correctChar?: string
}

interface WordComparison {
    userWord: string
    correctWord: string
    status: "correct" | "partial" | "extra" | "missing"
    characters: Character[]
}

const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length
    const n = str2.length
    const dp: number[][] = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1]
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1] + 1, // substitution
                    dp[i - 1][j] + 1, // deletion
                    dp[i][j - 1] + 1 // insertion
                )
            }
        }
    }
    return dp[m][n]
}

const findClosestWord = (word: string, wordList: string[]): string => {
    let minDistance = Infinity
    let closestWord = ""

    for (const target of wordList) {
        const distance = levenshteinDistance(
            word.toLowerCase(),
            target.toLowerCase()
        )
        if (distance < minDistance) {
            minDistance = distance
            closestWord = target
        }
    }

    return closestWord
}

const compareWordsDetailed = (userText: string, correctText: string) => {
    const userWords = userText
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0)
    const correctWords = correctText
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0)

    const result = []
    const maxLength = Math.max(userWords.length, correctWords.length)

    for (let i = 0; i < maxLength; i++) {
        const userWord = userWords[i] || ""
        let correctWord = correctWords[i] || ""

        if (userWord && (!correctWord || userWord !== correctWord)) {
            correctWord = findClosestWord(userWord, correctWords)
        }

        if (!userWord && correctWord) {
            result.push({
                userWord: "",
                correctWord,
                status: "missing",
                characters: [],
            })
        } else if (userWord && !correctWord) {
            result.push({
                userWord,
                correctWord: "",
                status: "extra",
                characters: userWord
                    .split("")
                    .map(char => ({ char, status: "extra", isCorrect: false })),
            })
        } else {
            const characters = []
            const maxCharLength = Math.max(userWord.length, correctWord.length)

            for (let j = 0; j < maxCharLength; j++) {
                const userChar = userWord[j] || ""
                const correctChar = correctWord[j] || ""

                if (!userChar && correctChar) {
                    characters.push({ char: correctChar, status: "missing", isCorrect: false })
                } else if (userChar && !correctChar) {
                    characters.push({ char: userChar, status: "extra", isCorrect: false })
                } else if (userChar === correctChar) {
                    characters.push({ char: userChar, status: "correct", isCorrect: true })
                } else {
                    characters.push({ char: userChar, status: "incorrect", isCorrect: false, correctChar })
                }
            }
            result.push({
                userWord,
                correctWord,
                status: userWord === correctWord ? "correct" : "partial",
                characters,
            })
        }
    }
    return result
}


// --- COMPONENT DictationLesson --- //
const DictationLesson: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>()
    const navigate = useNavigate()
    const { startLesson, getProgress, addAttempt } = useProgress()

    const [lesson, setLesson] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [currentSentence, setCurrentSentence] = useState(0)
    const [userTranscript, setUserTranscript] = useState("")
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0) // Giữ lại state này nếu bạn muốn phát triển thanh progress audio
    const [showFeedback, setShowFeedback] = useState(false)
    const [feedback, setFeedback] = useState<any>(null)
    const [playCount, setPlayCount] = useState(0)
    const [canProceed, setCanProceed] = useState(false)
    // *** THÊM MỚI: State để hiển thị/ẩn đáp án đúng ***
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)

    useEffect(() => {
        if (!lessonId) return;
        setLoading(true)
        getLessonById(lessonId)
            .then(res => setLesson(res.data))
            .catch(() => setLesson(null))
            .finally(() => setLoading(false))
    }, [lessonId])
    
    const progress = getProgress(lessonId!)

    useEffect(() => {
        if (lesson && !progress && lessonId) {
            startLesson(lessonId, "dictation", lesson.challenges.length)
        }
    }, [lesson, progress, lessonId, startLesson])

    // *** THÊM MỚI: Các hàm helper để lấy màu ***
    const getCharacterColor = (status: string) => {
        switch (status) {
            case "correct":
                return "bg-green-100 text-green-800"
            case "incorrect":
                return "bg-red-100 text-red-800"
            case "extra":
                return "bg-purple-100 text-purple-800"
            case "missing":
                return "bg-gray-200 text-gray-500 line-through"
            default:
                return "text-slate-600"
        }
    }

    const getWordBorderColor = (status: string) => {
        switch (status) {
            case "correct":
                return "border-green-300"
            case "partial":
                return "border-yellow-300"
            case "extra":
                return "border-purple-300"
            case "missing":
                return "border-gray-300"
            default:
                return "border-slate-300"
        }
    }
    
    if (loading) return <div>Loading...</div>
    if (!lesson || !lesson.challenges || lesson.challenges.length === 0) return <div>Lesson not found or no challenges</div>

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setUserTranscript(e.target.value)
        setShowFeedback(false)
        setFeedback(null)
        setCanProceed(false)
        setShowCorrectAnswer(false) // Reset khi người dùng nhập lại
    }

    const handleCheck = () => {
        if (!userTranscript.trim() || !lesson.challenges) return

        const correctText = lesson.challenges[currentSentence].content
        const comparison = compareWordsDetailed(userTranscript, correctText)
        const isCorrect = comparison.every(word => word.status === "correct")

        setFeedback({
            allCorrect: isCorrect,
            comparison,
            correctText,
        })
        setShowFeedback(true)
        setCanProceed(isCorrect)

        addAttempt(lessonId!, {
            sentenceIndex: currentSentence,
            userAnswer: userTranscript,
            correctAnswer: correctText,
            aiFeedback: { allCorrect: isCorrect, comparison },
            score: isCorrect ? 10 : 5,
            attemptNumber: 1, // Bạn có thể cần logic để tăng số lần thử
            createdAt: new Date(),
        })
    }

    const handleNext = () => {
        if (currentSentence < lesson.challenges.length - 1) {
            setCurrentSentence(currentSentence + 1)
            setUserTranscript("")
            setShowFeedback(false)
            setFeedback(null)
            setPlayCount(0)
            setCurrentTime(0)
            setCanProceed(false)
            setShowCorrectAnswer(false)
        } else {
            // Chuyển hướng khi hoàn thành bài học
            navigate(`/dashboard/dictation/${lesson.accent}`)
        }
    }

    const playAudio = () => {
        setIsPlaying(true)
        setCurrentTime(0)
        setPlayCount(prev => prev + 1)
        // Dữ liệu mới có timeStart và timeEnd
        const duration = lesson.challenges[currentSentence].timeEnd - lesson.challenges[currentSentence].timeStart
        setTimeout(() => {
            setIsPlaying(false)
            setCurrentTime(0)
        }, duration * 1000)
    }

    const resetAudio = () => {
        setIsPlaying(false)
        setCurrentTime(0)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(`/dashboard/dictation/${lesson.accent}`)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800">{lesson.title}</h1>
                    </div>
                    <div className="text-sm text-slate-600">
                        {currentSentence + 1} / {lesson.challenges.length}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Audio Player */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="text-center space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800">Listen and Write</h3>
                        <div className="flex items-center justify-center space-x-4">
                            <button
                                onClick={playAudio}
                                disabled={isPlaying}
                                className="w-16 h-16 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-full flex items-center justify-center hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 transition-all"
                            >
                                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                            </button>
                            <button onClick={resetAudio} className="w-12 h-12 bg-slate-500 text-white rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors">
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Writing & Feedback Area */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                    
                    {/* *** CẬP NHẬT: Hiển thị phản hồi chi tiết *** */}
                    {showFeedback && feedback && !feedback.allCorrect && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="font-semibold text-slate-700 mb-3">Your Answer Analysis:</h4>
                            <div className="flex flex-wrap gap-2 text-lg">
                                {feedback.comparison.map((word: WordComparison, index: number) => (
                                    <div key={index} className={`p-1 border-b-2 ${getWordBorderColor(word.status)}`}>
                                        {word.status === 'missing' ? (
                                             <span className={getCharacterColor('missing')}>
                                                {word.correctWord}
                                            </span>
                                        ) : (
                                            word.characters.map((char: Character, charIndex: number) => (
                                                <span key={charIndex} className={`px-0.5 rounded ${getCharacterColor(char.status)}`}>
                                                    {char.status === 'incorrect' ? char.correctChar : char.char}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     
                    {/* *** CẬP NHẬT: Hiển thị đáp án đúng nếu được yêu cầu *** */}
                    {showCorrectAnswer && feedback && (
                         <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                             <h4 className="font-semibold text-green-800 mb-2">Correct Answer:</h4>
                             <p className="text-lg text-green-900 font-medium">{feedback.correctText}</p>
                         </div>
                    )}

                    {/* Textarea cho người dùng nhập */}
                    {!feedback?.allCorrect && (
                        <textarea
                            value={userTranscript}
                            onChange={handleInputChange}
                            placeholder="Type what you hear from the audio..."
                            className={`w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none text-lg ${
                                showFeedback
                                    ? feedback?.allCorrect
                                        ? "border-green-500 bg-green-50"
                                        : "border-red-500 bg-red-50"
                                    : "border-slate-300"
                            }`}
                        />
                    )}

                    {/* Hiển thị khi trả lời đúng hoàn toàn */}
                    {feedback?.allCorrect && (
                         <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                             <h4 className="font-semibold text-green-800 text-xl">🎉 Excellent! That's correct.</h4>
                             <p className="text-lg text-green-900 font-medium mt-2">{feedback.correctText}</p>
                         </div>
                    )}

                    {/* Các nút điều khiển */}
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                        {!feedback?.allCorrect && (
                            <button
                                onClick={handleCheck}
                                disabled={!userTranscript.trim() || showFeedback}
                                className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white py-3 px-6 rounded-lg hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                            >
                                <Check className="w-5 h-5" />
                                <span>Check Transcript</span>
                            </button>
                        )}
                        
                        {/* *** CẬP NHẬT: Nút Show/Hide Answer *** */}
                        {showFeedback && !feedback.allCorrect && (
                            <button
                                onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
                                className="flex-1 bg-slate-200 text-slate-700 py-3 px-6 rounded-lg hover:bg-slate-300 transition-colors flex items-center justify-center space-x-2"
                            >
                                {showCorrectAnswer ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                <span>{showCorrectAnswer ? 'Hide Answer' : 'Show Answer'}</span>
                            </button>
                        )}

                        {/* Luôn hiển thị nút Next/Complete sau khi đã check */}
                        {(canProceed || (showFeedback && !feedback.allCorrect)) && (
                            <button
                                onClick={handleNext}
                                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                            >
                                <span>
                                    {currentSentence < lesson.challenges.length - 1 ? "Next" : "Complete"}
                                </span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DictationLesson