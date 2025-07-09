import React from "react";
import type { LessonData, WordComparison, Character } from "../../types/dictationTypes";

interface Props {
    showFeedback: boolean;
    feedback: any;
    showCorrectAnswer: boolean;
    setShowCorrectAnswer: (val: boolean) => void;
    getCharacterColor: (status: string) => string;
    getWordBorderColor: (status: string) => string;
    lesson: LessonData;
}

const DictationFeedback: React.FC<Props> = ({
    showFeedback,
    feedback,
    showCorrectAnswer,
    setShowCorrectAnswer,
    getCharacterColor,
    getWordBorderColor,
    lesson,
}) => {
    if (!showFeedback || !feedback) return null;
    return (
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
            <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="text-sm text-slate-600 mb-2">Your answer:</h5>
                    <div className="flex flex-wrap gap-2">
                        {feedback.comparison.map((word: WordComparison, idx: number) => (
                            <div
                                key={idx}
                                className={`px-3 py-1 rounded-lg ${
                                    word.status === "correct"
                                        ? "bg-green-100"
                                        : word.status === "partial"
                                        ? "bg-yellow-100"
                                        : "bg-red-100"
                                }`}
                            >
                                {word.characters.map((char: Character, charIdx: number) => (
                                    <span
                                        key={charIdx}
                                        className={
                                            char.status === "correct"
                                                ? "text-green-800"
                                                : char.status === "incorrect"
                                                ? "text-red-800"
                                                : char.status === "missing"
                                                ? "text-orange-800 bg-orange-100 px-1 rounded"
                                                : "text-yellow-800"
                                        }
                                        title={char.correctChar ? `Should be: ${char.correctChar}` : undefined}
                                    >
                                        {char.char || " "}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="text-sm text-slate-600 mb-2">Legend:</h5>
                    <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center space-x-1">
                            <span className="text-green-800">Green</span>
                            <span>Correct character</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <span className="text-red-800">Red</span>
                            <span>Incorrect character</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <span className="text-orange-800 bg-orange-100 px-1 rounded">_</span>
                            <span>Missing character</span>
                        </div>
                    </div>
                </div>
                {showCorrectAnswer && (
                    <div className="bg-green-50 rounded-lg p-4">
                        <h5 className="text-sm text-green-600 mb-2">Correct answer:</h5>
                        <p className="text-green-800 font-medium">{feedback.correctText}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DictationFeedback; 