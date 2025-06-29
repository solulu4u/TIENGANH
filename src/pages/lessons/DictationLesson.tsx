import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    ArrowLeft,
    Play,
    Pause,
    RotateCcw,
    Check,
    ArrowRight,
    Volume2,
    Mic,
    Square,
    SkipForward,
    Eye,
    EyeOff,
} from "lucide-react"
import { useProgress } from "../../contexts/ProgressContext"
import { dictationLessonsData } from "../../data/dictationLessons"

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

// Levenshtein distance calculation
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

// Find closest matching word
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

// Enhanced word comparison with character-level analysis
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

        // If word doesn't match exactly, find the closest match
        if (userWord && (!correctWord || userWord !== correctWord)) {
            correctWord = findClosestWord(userWord, correctWords)
        }

        if (!userWord && correctWord) {
            // Missing word
            result.push({
                userWord: "",
                correctWord,
                status: "missing",
                characters: [],
            })
        } else if (userWord && !correctWord) {
            // Extra word
            result.push({
                userWord,
                correctWord: "",
                status: "extra",
                characters: userWord
                    .split("")
                    .map(char => ({ char, status: "extra" })),
            })
        } else {
            // Character-level comparison
            const characters = []
            const maxCharLength = Math.max(userWord.length, correctWord.length)

            for (let j = 0; j < maxCharLength; j++) {
                const userChar = userWord[j] || ""
                const correctChar = correctWord[j] || ""

                if (!userChar && correctChar) {
                    characters.push({
                        char: correctChar,
                        status: "missing",
                        isCorrect: false,
                    })
                } else if (userChar && !correctChar) {
                    characters.push({
                        char: userChar,
                        status: "extra",
                        isCorrect: false,
                    })
                } else if (userChar === correctChar) {
                    characters.push({
                        char: userChar,
                        status: "correct",
                        isCorrect: true,
                    })
                } else {
                    characters.push({
                        char: userChar,
                        status: "incorrect",
                        isCorrect: false,
                        correctChar,
                    })
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

const DictationLesson: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>()
    const navigate = useNavigate()
    const { startLesson, getProgress, addAttempt } = useProgress()

    const lesson = dictationLessonsData[lessonId!]
    const progress = getProgress(lessonId!)

    const [currentSentence, setCurrentSentence] = useState(0)
    const [userTranscript, setUserTranscript] = useState("")
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [showFeedback, setShowFeedback] = useState(false)
    const [feedback, setFeedback] = useState<any>(null)
    const [playCount, setPlayCount] = useState(0)
    const [wordComparison, setWordComparison] = useState<any[]>([])
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
    const [pronunciationEnabled, setPronunciationEnabled] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [pronunciationFeedback, setPronunciationFeedback] =
        useState<string>("")
    const [showPronunciationSection, setShowPronunciationSection] =
        useState(false)
    const [canProceed, setCanProceed] = useState(false)
    const [showText, setShowText] = useState(true)

    useEffect(() => {
        if (lesson && !progress) {
            startLesson(
                lessonId!,
                "dictation",
                lesson.dictationSentences?.length || 0
            )
        }
    }, [lesson, progress, lessonId, startLesson])

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>
        if (isPlaying && lesson.dictationSentences) {
            const duration = lesson.dictationSentences[currentSentence].duration
            interval = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= duration) {
                        setIsPlaying(false)
                        return 0
                    }
                    return prev + 0.1
                })
            }, 100)
        }
        return () => clearInterval(interval)
    }, [isPlaying, currentSentence, lesson])

    const playAudio = () => {
        if (!lesson.dictationSentences) return

        setIsPlaying(true)
        setCurrentTime(0)
        setPlayCount(prev => prev + 1)

        const duration = lesson.dictationSentences[currentSentence].duration
        setTimeout(() => {
            setIsPlaying(false)
            setCurrentTime(0)
        }, duration * 1000)
    }

    const handleCheck = () => {
        if (!userTranscript.trim() || !lesson.dictationSentences) return

        const correctText = lesson.dictationSentences[currentSentence].text
        const comparison = compareWordsDetailed(userTranscript, correctText)
        const isCorrect = comparison.every(word => word.status === "correct")

        setFeedback({
            allCorrect: isCorrect,
            userText: userTranscript,
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
            attemptNumber: 1,
            createdAt: new Date(),
        })
    }

    const handleNext = () => {
        if (
            lesson.dictationSentences &&
            currentSentence < lesson.dictationSentences.length - 1
        ) {
            setCurrentSentence(currentSentence + 1)
            setUserTranscript("")
            setShowFeedback(false)
            setFeedback(null)
            setPlayCount(0)
            setCurrentTime(0)
            setCanProceed(false)
        } else {
            navigate(`/dashboard/dictation/${lesson.category}`)
        }
    }

    const resetAudio = () => {
        setIsPlaying(false)
        setCurrentTime(0)
    }

    const startPronunciationRecording = async () => {
        try {
            setIsRecording(true)
            setShowText(false)

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })

            // Create MediaRecorder instance
            const mediaRecorder = new MediaRecorder(stream)
            const audioChunks: BlobPart[] = []

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data)
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/wav" })
                setShowText(true)
                // Here you would normally send the audioBlob to your backend
                // For now, we'll simulate a response
                simulatePronunciationFeedback(
                    lesson.dictationSentences[currentSentence].text
                )
            }

            // Record for 5 seconds
            mediaRecorder.start()
            setTimeout(() => {
                mediaRecorder.stop()
                stream.getTracks().forEach(track => track.stop())
                setIsRecording(false)
            }, 5000)
        } catch (error) {
            console.error("Error accessing microphone:", error)
            setIsRecording(false)
            setShowText(true)
            alert("Error accessing microphone. Please check your permissions.")
        }
    }

    const simulatePronunciationFeedback = (text: string) => {
        // Remove punctuation and split into words
        const words = text.replace(/[^\w\s]/g, "").split(" ")

        // Generate random feedback (0 or 1) for each character
        let feedback = ""
        words.forEach(word => {
            for (let i = 0; i < word.length; i++) {
                feedback += Math.random() > 0.3 ? "1" : "0"
            }
            feedback += " "
        })

        setPronunciationFeedback(feedback.trim())
    }

    const renderPronunciationFeedback = (text: string, feedback: string) => {
        const words = text.split(" ")
        let feedbackIndex = 0

        return (
            <div className="inline-block text-2xl leading-relaxed font-medium tracking-wide">
                {words.map((word, wordIndex) => (
                    <span key={wordIndex} className="inline">
                        {word.split("").map((char, charIndex) => {
                            const isCorrect = feedback[feedbackIndex] === "1"
                            feedbackIndex++
                            return (
                                <span
                                    key={charIndex}
                                    className={
                                        feedback
                                            ? isCorrect
                                                ? "text-green-600"
                                                : "text-red-600"
                                            : "text-slate-800"
                                    }
                                >
                                    {char}
                                </span>
                            )
                        })}
                        {wordIndex < words.length - 1 && " "}
                    </span>
                ))}
            </div>
        )
    }

    const getCharacterColor = (status: string) => {
        switch (status) {
            case "correct":
                return "bg-green-100 text-green-800"
            case "incorrect":
                return "bg-red-100 text-red-800"
            case "extra":
                return "bg-purple-100 text-purple-800"
            case "missing":
                return "bg-gray-100 text-gray-800 opacity-50"
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

    if (!lesson || !lesson.dictationSentences) {
        return <div>Lesson not found</div>
    }

    const currentDictation = lesson.dictationSentences[currentSentence]
    const progressPercentage =
        ((currentSentence + 1) / lesson.dictationSentences.length) * 100

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() =>
                                navigate(
                                    `/dashboard/dictation/${lesson.category}`
                                )
                            }
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">
                                {lesson.title}
                            </h1>
                            <p className="text-sm text-slate-600">
                                Write from Dictation • {lesson.accent} Accent
                            </p>
                        </div>
                    </div>
                    <div className="text-sm text-slate-600">
                        {currentSentence + 1} /{" "}
                        {lesson.dictationSentences.length}
                    </div>
                </div>

                <div className="mt-4">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Audio Player */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="text-center space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800">
                            Listen and Write
                        </h3>

                        {/* Audio Controls */}
                        <div className="flex items-center justify-center space-x-4">
                            <button
                                onClick={playAudio}
                                disabled={isPlaying}
                                className="w-16 h-16 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-full flex items-center justify-center hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 transition-all"
                            >
                                {isPlaying ? (
                                    <Pause className="w-6 h-6" />
                                ) : (
                                    <Play className="w-6 h-6 ml-1" />
                                )}
                            </button>

                            <button
                                onClick={resetAudio}
                                className="w-12 h-12 bg-slate-500 text-white rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="max-w-md mx-auto">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all"
                                    style={{
                                        width: `${
                                            (currentTime /
                                                currentDictation.duration) *
                                            100
                                        }%`,
                                    }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>{currentTime.toFixed(1)}s</span>
                                <span>{currentDictation.duration}s</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center space-x-4 text-sm text-slate-600">
                            <div className="flex items-center space-x-1">
                                <Volume2 className="w-4 h-4" />
                                <span>Played {playCount} times</span>
                            </div>
                            <span>•</span>
                            <span>Duration: {currentDictation.duration}s</span>
                        </div>

                        {/* Settings */}
                        <div className="flex items-center justify-center space-x-6 pt-4">
                            <button
                                onClick={() =>
                                    setPronunciationEnabled(
                                        !pronunciationEnabled
                                    )
                                }
                                className={`px-4 py-2 rounded-full flex items-center space-x-2 transition-all ${
                                    pronunciationEnabled
                                        ? "bg-pink-100 text-pink-800"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                <Mic className="w-4 h-4" />
                                <span>Pronunciation Check</span>
                            </button>

                            <button
                                onClick={() =>
                                    setShowCorrectAnswer(!showCorrectAnswer)
                                }
                                className={`px-4 py-2 rounded-full flex items-center space-x-2 transition-all ${
                                    showCorrectAnswer
                                        ? "bg-pink-100 text-pink-800"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                {showCorrectAnswer ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                                <span>Show Answer</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Writing Area */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    {pronunciationEnabled && !isRecording ? (
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">
                            {feedback?.allCorrect && showText
                                ? currentDictation.text
                                : "Click the microphone to start recording"}
                        </h3>
                    ) : (
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">
                            {feedback?.allCorrect
                                ? currentDictation.text
                                : "Write what you hear"}
                        </h3>
                    )}

                    <div className="space-y-4">
                        {!feedback?.allCorrect ? (
                            <textarea
                                value={userTranscript}
                                onChange={e => {
                                    setUserTranscript(e.target.value)
                                    setShowFeedback(false)
                                    setFeedback(null)
                                    setCanProceed(false)
                                }}
                                placeholder="Type what you hear from the audio..."
                                className={`w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none text-lg ${
                                    showFeedback
                                        ? feedback?.allCorrect
                                            ? "border-green-500 bg-green-50"
                                            : "border-red-500 bg-red-50"
                                        : "border-slate-300"
                                }`}
                            />
                        ) : pronunciationEnabled && showText ? (
                            <div className="space-y-6">
                                <div className="bg-slate-50 rounded-lg p-8">
                                    {/* Single text display with pronunciation feedback */}
                                    <div className="text-center mb-8">
                                        {renderPronunciationFeedback(
                                            currentDictation.text,
                                            pronunciationFeedback
                                        )}
                                    </div>

                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => {
                                                setPronunciationFeedback("")
                                                startPronunciationRecording()
                                            }}
                                            disabled={isRecording}
                                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                                                isRecording
                                                    ? "bg-red-500 animate-pulse"
                                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                            } text-white`}
                                        >
                                            {isRecording ? (
                                                <Square className="w-6 h-6" />
                                            ) : (
                                                <Mic className="w-6 h-6" />
                                            )}
                                        </button>
                                    </div>

                                    {isRecording && (
                                        <p className="text-red-600 font-medium text-center mt-4">
                                            Recording... Speak clearly
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : null}

                        <div className="flex space-x-3">
                            {!feedback?.allCorrect && (
                                <button
                                    onClick={handleCheck}
                                    disabled={!userTranscript.trim()}
                                    className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white py-3 px-6 rounded-lg hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                                >
                                    <Check className="w-5 h-5" />
                                    <span>Check Transcript</span>
                                </button>
                            )}

                            {(canProceed || pronunciationFeedback) && (
                                <button
                                    onClick={handleNext}
                                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                                >
                                    <span>
                                        {currentSentence <
                                        lesson.dictationSentences.length - 1
                                            ? "Next"
                                            : "Complete"}
                                    </span>
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Feedback */}
                {showFeedback && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div
                            className={`text-center p-4 rounded-lg mb-4 ${
                                feedback.allCorrect
                                    ? "bg-green-50 text-green-800"
                                    : "bg-red-50 text-red-800"
                            }`}
                        >
                            {feedback.allCorrect
                                ? "🎉 Perfect! You can proceed to the next sentence!"
                                : "📝 Not quite right. Try again!"}
                        </div>

                        {/* Word-level comparison */}
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-lg p-4">
                                <h5 className="text-sm text-slate-600 mb-2">
                                    Your answer:
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                    {feedback.comparison.map(
                                        (word: WordComparison, idx: number) => (
                                            <div
                                                key={idx}
                                                className={`px-3 py-1 rounded-lg ${
                                                    word.status === "correct"
                                                        ? "bg-green-100"
                                                        : word.status ===
                                                          "partial"
                                                        ? "bg-yellow-100"
                                                        : "bg-red-100"
                                                }`}
                                            >
                                                {word.characters.map(
                                                    (
                                                        char: Character,
                                                        charIdx: number
                                                    ) => (
                                                        <span
                                                            key={charIdx}
                                                            className={`${
                                                                char.status ===
                                                                "correct"
                                                                    ? "text-green-800"
                                                                    : char.status ===
                                                                      "incorrect"
                                                                    ? "text-red-800"
                                                                    : "text-yellow-800"
                                                            }`}
                                                            title={
                                                                char.correctChar
                                                                    ? `Should be: ${char.correctChar}`
                                                                    : undefined
                                                            }
                                                        >
                                                            {char.char || " "}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            {showCorrectAnswer && (
                                <div className="bg-green-50 rounded-lg p-4">
                                    <h5 className="text-sm text-green-600 mb-2">
                                        Correct answer:
                                    </h5>
                                    <p className="text-green-800 font-medium">
                                        {feedback.correctText}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Pronunciation Section */}
                {showPronunciationSection && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h4 className="text-lg font-semibold text-slate-800 mb-4">
                            Pronunciation Check
                        </h4>

                        <div className="text-center space-y-4">
                            <p className="text-slate-600">
                                Great job on the dictation! Now let's check your
                                pronunciation.
                            </p>

                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-blue-800 font-medium text-lg mb-2">
                                    Read this sentence:
                                </p>
                                <p className="text-blue-900 text-xl font-semibold">
                                    {currentDictation.text}
                                </p>
                            </div>

                            {!isRecording && !pronunciationFeedback ? (
                                <button
                                    onClick={startPronunciationRecording}
                                    className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all mx-auto"
                                >
                                    <Mic className="w-6 h-6" />
                                </button>
                            ) : isRecording ? (
                                <div className="flex flex-col items-center space-y-2">
                                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                        <Square className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-red-600 font-medium">
                                        Recording... Speak clearly
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h5 className="font-medium text-slate-700">
                                        Pronunciation Analysis:
                                    </h5>
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        {renderPronunciationFeedback(
                                            currentDictation.text.replace(
                                                /[^\w\s]/g,
                                                ""
                                            ),
                                            pronunciationFeedback
                                        )}
                                    </div>
                                    <div className="flex justify-center space-x-4 text-xs">
                                        <div className="flex items-center space-x-1">
                                            <div className="w-3 h-3 bg-green-100 rounded"></div>
                                            <span>Correct pronunciation</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-3 h-3 bg-red-100 rounded"></div>
                                            <span>Needs improvement</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DictationLesson
