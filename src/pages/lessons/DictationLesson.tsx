import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Eye, EyeOff } from "lucide-react";
import { useProgress } from "../../contexts/ProgressContext";
import { getLessonById } from "../../utils/api";
import type { LessonData, Challenge } from "../../types/dictationTypes";
import {
    compareWordsDetailed,
    simulatePronunciationFeedback,
    renderPronunciationFeedback,
    getCharacterColor,
    getWordBorderColor,
} from "../../utils/dictationUtils";
import DictationAudioPlayer from "../../components/lessons/DictationAudioPlayer";
import DictationWritingArea from "../../components/lessons/DictationWritingArea";
import DictationFeedback from "../../components/lessons/DictationFeedback";
import DictationPronunciation from "../../components/lessons/DictationPronunciation";
// import PronunciationFeedback from "../../components/lessons/PronunciationFeedback"; // Comment out nếu không dùng

const DictationLesson: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const { startLesson, getProgress, addAttempt } = useProgress();

    const [lesson, setLesson] = useState<LessonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const progress = getProgress(lessonId!);

    const [currentSentence, setCurrentSentence] = useState(0);
    const [userTranscript, setUserTranscript] = useState("");
    const [isPlaying, setIsPlaying] = useState(false); // Trạng thái phát chung (audio hoặc youtube)
    const [currentTime, setCurrentTime] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedback, setFeedback] = useState<any>(null);
    const [playCount, setPlayCount] = useState(0);
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const [pronunciationEnabled, setPronunciationEnabled] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [pronunciationFeedback, setPronunciationFeedback] = useState<string>("");
    const [showPronunciationSection, setShowPronunciationSection] = useState(false); // Có vẻ không được sử dụng
    const [canProceed, setCanProceed] = useState(false);
    const [showText, setShowText] = useState(true);
    const [pendingAutoPlay, setPendingAutoPlay] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
    const [isYoutubePlaying, setIsYoutubePlaying] = useState(false); // Trạng thái riêng cho youtube

    // Lấy currentDictation và useYoutube dựa trên currentSentence và lesson
    const currentDictation = lesson?.challenges ? lesson.challenges[currentSentence] : null;
    const useYoutube =
        !!currentDictation && // Đảm bảo currentDictation tồn tại
        !currentDictation.audioSrc && // Chỉ dùng YouTube nếu không có audioSrc riêng
        !!lesson?.youtubeUrl &&
        currentDictation.timeStart !== undefined &&
        currentDictation.timeEnd !== undefined;

    // Sử dụng ref để theo dõi trạng thái phát khi next, tránh re-render không cần thiết
    // và đảm bảo việc tự động phát chỉ xảy ra MỘT LẦN khi chuyển câu.
    const autoPlayRef = useRef(false);

    // Effect để fetch bài học
    useEffect(() => {
        const fetchLesson = async () => {
            if (!lessonId) return;
            try {
                setLoading(true);
                const response = await getLessonById(lessonId);
                if (response.success && response.data) {
                    setLesson(response.data);
                    if (!progress) {
                        startLesson(
                            lessonId,
                            "dictation",
                            response.data.challenges?.length || 0
                        );
                    }
                    // Đặt autoPlayRef.current = true để phát câu đầu tiên khi lesson load xong
                    autoPlayRef.current = true;
                } else {
                    setError(response.message || "Failed to load lesson");
                }
            } catch (err) {
                setError("Failed to load lesson");
                console.error("Error fetching lesson:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLesson();
    }, [lessonId, progress, startLesson]);


    // Effect để cập nhật currentTime cho audioRef và xử lý dừng audio
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            audio.pause();
            audio.currentTime = 0; // Reset về đầu
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
        };
    }, [audioRef]);


    // Hàm phát audio truyền thống (sử dụng useCallback)
    const playChallengeAudio = useCallback(() => {
        if (currentDictation?.audioSrc && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setPlayCount(prev => prev + 1);
            setIsPlaying(true);
        }
    }, [currentDictation?.audioSrc]);

    // Hàm phát đoạn YouTube (sử dụng useCallback)
    const playYoutubeSegment = useCallback(() => {
        if (youtubePlayer && useYoutube && currentDictation && currentDictation.timeStart !== undefined) {
            youtubePlayer.pauseVideo(); // Đảm bảo dừng hẳn trước khi seek
            youtubePlayer.seekTo(currentDictation.timeStart, true);
            setTimeout(() => {
                youtubePlayer.playVideo();
            }, 100); // Delay nhỏ để YouTube xử lý seek
            setIsYoutubePlaying(true);
            setIsPlaying(true);
            setPlayCount(prev => prev + 1);
        }
    }, [youtubePlayer, useYoutube, currentDictation]);


    const pauseYoutube = useCallback(() => {
        if (youtubePlayer && useYoutube) {
            youtubePlayer.pauseVideo();
            setIsYoutubePlaying(false);
            setIsPlaying(false);
        }
    }, [youtubePlayer, useYoutube]);

    // Effect để kiểm soát việc dừng YouTube player khi hết đoạn
    useEffect(() => {
        if (!youtubePlayer || !useYoutube || !currentDictation) return;

        let interval: ReturnType<typeof setInterval>;
        if (isYoutubePlaying) {
            interval = setInterval(() => {
                const current = youtubePlayer.getCurrentTime();
                // Dừng video nếu vượt quá hoặc bằng thời gian kết thúc của đoạn với một ngưỡng nhỏ
                if (current >= currentDictation.timeEnd - 0.1) {
                    youtubePlayer.pauseVideo();
                    setIsYoutubePlaying(false);
                    setIsPlaying(false);
                    clearInterval(interval); // Dừng interval
                    youtubePlayer.seekTo(currentDictation.timeStart, true); // Về đầu đoạn
                }
            }, 200);
        }
        return () => clearInterval(interval); // Cleanup khi component unmount hoặc dependencies thay đổi
    }, [isYoutubePlaying, youtubePlayer, useYoutube, currentDictation]);


    const handleCheck = () => {
        if (!userTranscript.trim() || !lesson?.challenges || !currentDictation) return;

        const correctText = currentDictation.content;
        const comparison = compareWordsDetailed(userTranscript, correctText);
        const isCorrect =
            comparison.length === correctText.trim().split(/\s+/).length &&
            comparison.every(word => word.status === "correct");

        setFeedback({
            allCorrect: isCorrect,
            userText: userTranscript,
            comparison,
            correctText,
        });
        setShowFeedback(true);
        setCanProceed(isCorrect);
        // Nếu trả lời đúng, đánh dấu để tự động phát câu tiếp theo
        if (isCorrect) {
            autoPlayRef.current = true;
        }
        
        addAttempt(lessonId!, {
            sentenceIndex: currentSentence,
            userAnswer: userTranscript,
            correctAnswer: correctText,
            aiFeedback: { allCorrect: isCorrect, comparison },
            score: isCorrect ? 10 : 5,
            attemptNumber: 1,
            createdAt: new Date(),
        });
    };

    const handleNext = () => {
        // Dừng và reset các player hiện tại
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
        if (youtubePlayer) { // youtubePlayer có thể chưa load nếu đang dùng audio
            youtubePlayer.pauseVideo();
            youtubePlayer.seekTo(currentDictation?.timeStart || 0, true);
            setIsYoutubePlaying(false);
        }

        // Kiểm tra nếu còn câu tiếp theo
        if (lesson?.challenges && currentSentence < lesson.challenges.length - 1) {
            setCurrentSentence(currentSentence + 1); // Cập nhật sang câu tiếp theo
            setUserTranscript("");
            setShowFeedback(false);
            setFeedback(null);
            setPlayCount(0); // Reset số lần phát cho câu mới
            setCurrentTime(0); // Reset thời gian phát về 0
            setCanProceed(false);
            setPronunciationFeedback(""); // Reset feedback phát âm
            setShowCorrectAnswer(false); // Ẩn đáp án đúng
            
            // autoPlayRef.current đã được set ở handleCheck nếu đúng
            // Nếu không tự động phát được ở handleCheck (ví dụ người dùng bấm next mà chưa đúng)
            // thì vẫn sẽ cố gắng phát.
            // Điều này đảm bảo rằng câu tiếp theo luôn cố gắng phát khi Next
            if (!autoPlayRef.current) {
                autoPlayRef.current = true; 
            }
        } else {
            // Đã hoàn thành tất cả các câu
            navigate(`/dashboard/dictation`);
        }
    };

    // Effect để tự động phát âm thanh/video khi currentSentence thay đổi
    // Hoặc khi lesson/currentDictation được load lần đầu, hoặc khi autoPlayRef được bật
    useEffect(() => {
        // Log để debug
        console.log(`useEffect: currentSentence=${currentSentence}, lesson=${!!lesson}, currentDictation=${!!currentDictation}, youtubePlayer=${!!youtubePlayer}, useYoutube=${useYoutube}, autoPlayRef.current=${autoPlayRef.current}`);
        
        // Chỉ chạy nếu lesson và currentDictation đã được load VÀ có tín hiệu tự động phát
        if (lesson && currentDictation && autoPlayRef.current) {
            // Reset autoPlayRef.current ngay lập tức để tránh phát lại nhiều lần
            autoPlayRef.current = false; 

            if (useYoutube) {
                if (youtubePlayer) {
                    console.log("Attempting to play YouTube segment...");
                    setTimeout(() => {
                        playYoutubeSegment();
                    }, 100);
                } else {
                    // Player chưa sẵn sàng, đánh dấu cần auto play
                    setPendingAutoPlay(true);
                }
            } else {
                console.log("Attempting to play audio challenge...");
                playChallengeAudio();
            }
        }
        // Không return cleanup ở đây!
    }, [currentSentence, useYoutube, lesson, currentDictation, youtubePlayer, playYoutubeSegment, playChallengeAudio]);

    useEffect(() => {
        if (pendingAutoPlay && youtubePlayer && useYoutube) {
            setPendingAutoPlay(false);
            setTimeout(() => {
                playYoutubeSegment();
            }, 100);
        }
    }, [pendingAutoPlay, youtubePlayer, useYoutube, playYoutubeSegment]);


    const resetAudio = useCallback(() => {
        setIsPlaying(false);
        setIsYoutubePlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.pause();
        }
        if (youtubePlayer && currentDictation) {
            youtubePlayer.pauseVideo();
            youtubePlayer.seekTo(currentDictation.timeStart, true);
        }
        setPlayCount(0);
    }, [audioRef, youtubePlayer, currentDictation]);

    const startPronunciationRecording = async () => {
        try {
            setIsRecording(true);
            setShowText(false);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
                setShowText(true);
                if (lesson?.challenges && currentDictation) {
                    setPronunciationFeedback(
                        simulatePronunciationFeedback(currentDictation.content)
                    );
                }
            };
            mediaRecorder.start();
            setTimeout(() => {
                mediaRecorder.stop();
                stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
            }, 5000);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            setIsRecording(false);
            setShowText(true);
            alert("Error accessing microphone. Please check your permissions.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading lesson...</p>
                </div>
            </div>
        );
    }
    if (error || !lesson) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || "Lesson not found"}</p>
                    <button
                        onClick={() => navigate("/dashboard/dictation")}
                        className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                    >
                        Back to Lessons
                    </button>
                </div>
            </div>
        );
    }
    const progressPercentage = ((currentSentence + 1) / lesson.challenges.length) * 100;

    // Xử lý dữ liệu feedback phát âm để truyền vào component
    const pronunciationFeedbackData = currentDictation && pronunciationFeedback
        ? renderPronunciationFeedback(currentDictation.content, pronunciationFeedback)
        : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50">
            <div className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate(`/dashboard/dictation`)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">{lesson.title}</h1>
                            <p className="text-sm text-slate-600">Write from Dictation • {lesson.accent} Accent</p>
                        </div>
                    </div>
                    <div className="text-sm text-slate-600">
                        {currentSentence + 1} / {lesson.challenges.length}
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
                {/* Audio/Video Player */}
                {currentDictation && (
                    <DictationAudioPlayer
                        lesson={lesson}
                        currentDictation={currentDictation}
                        useYoutube={Boolean(useYoutube)}
                        audioRef={audioRef}
                        youtubePlayer={youtubePlayer}
                        setYoutubePlayer={setYoutubePlayer}
                        playCount={playCount}
                        setPlayCount={setPlayCount}
                        currentTime={currentTime}
                        setCurrentTime={setCurrentTime}
                        isPlaying={isPlaying}
                        setIsPlaying={setIsPlaying}
                        isYoutubePlaying={isYoutubePlaying}
                        setIsYoutubePlaying={setIsYoutubePlaying}
                        playChallengeAudio={playChallengeAudio}
                        playYoutubeSegment={playYoutubeSegment}
                        pauseYoutube={pauseYoutube}
                        resetAudio={resetAudio}
                    />
                )}
                {/* Writing Area */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                        {feedback?.allCorrect && showText
                            ? currentDictation?.content ?? ""
                            : pronunciationEnabled && !isRecording
                            ? "Click the microphone to start recording"
                            : feedback?.allCorrect // Khi correct rồi nhưng chưa showText
                            ? currentDictation?.content ?? ""
                            : "Write what you hear"}
                    </h3>
                    <DictationWritingArea
                        userTranscript={userTranscript}
                        setUserTranscript={setUserTranscript}
                        showFeedback={showFeedback}
                        setShowFeedback={setShowFeedback}
                        feedback={feedback}
                        canProceed={canProceed}
                        handleCheck={handleCheck}
                        handleNext={handleNext}
                        currentSentence={currentSentence}
                        lesson={lesson}
                        pronunciationEnabled={pronunciationEnabled}
                        isRecording={isRecording}
                        showText={showText}
                        setPronunciationFeedback={setPronunciationFeedback}
                        startPronunciationRecording={startPronunciationRecording}
                        pronunciationFeedbackData={pronunciationFeedbackData}
                        pronunciationFeedback={pronunciationFeedback}
                        setShowText={setShowText}
                    />
                    <div className="flex items-center justify-center space-x-6 pt-4">
                        <button
                            onClick={() => setPronunciationEnabled(!pronunciationEnabled)}
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
                            onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
                            className={`px-4 py-2 rounded-full flex items-center space-x-2 transition-all ${
                                showCorrectAnswer
                                    ? "bg-pink-100 text-pink-800"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                        >
                            {showCorrectAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            <span>Show Answer</span>
                        </button>
                    </div>
                </div>
                {/* Pronunciation Section */}
                {pronunciationEnabled && (
                    <DictationPronunciation
                        showPronunciationSection={true}
                        isRecording={isRecording}
                        pronunciationFeedbackData={pronunciationFeedbackData}
                        startPronunciationRecording={startPronunciationRecording}
                        currentDictation={currentDictation as Challenge}
                    />
                )}

                {/* Feedback */}
                <DictationFeedback
                    showFeedback={showFeedback}
                    feedback={feedback}
                    showCorrectAnswer={showCorrectAnswer}
                    setShowCorrectAnswer={setShowCorrectAnswer}
                    getCharacterColor={getCharacterColor}
                    getWordBorderColor={getWordBorderColor}
                    lesson={lesson}
                />
            </div>
        </div>
    );
};

export default DictationLesson;