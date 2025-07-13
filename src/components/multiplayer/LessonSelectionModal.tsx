import React, { useState, useEffect } from 'react';
import { selectLesson, getLessonsByCategoryTitle } from '../../utils/api';
import { Lesson } from '../../types/multiplayer';

interface LessonSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  categoryTitle: string;
  onLessonSelected: () => void;
}

const LessonSelectionModal: React.FC<LessonSelectionModalProps> = ({
  isOpen,
  onClose,
  roomId,
  categoryTitle,
  onLessonSelected
}) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && categoryTitle) {
      loadLessons();
    }
  }, [isOpen, categoryTitle]);

  const loadLessons = async () => {
    setLoading(true);
    try {
      const response = await getLessonsByCategoryTitle(categoryTitle);
              if (response.success && response.data) {
          setLessons(response.data);
          if (response.data.length > 0) {
            setSelectedLesson(response.data[0].lessonId);
          }
        } else {
        setError(response.message || 'Failed to load lessons');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson) return;

    setLoading(true);
    setError('');

    try {
      const response = await selectLesson(roomId, selectedLesson);
      if (response.success) {
        onLessonSelected();
        onClose();
      } else {
        setError(response.message || 'Failed to select lesson');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Select Lesson</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Category: <span className="font-medium">{categoryTitle}</span>
          </p>
        </div>

        {loading && lessons.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lessons...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessons.map((lesson) => (
                <div
                  key={lesson.lessonId}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedLesson === lesson.lessonId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedLesson(lesson.lessonId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {lesson.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {lesson.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Level: {lesson.level}</span>
                        <span>Duration: {lesson.duration}min</span>
                        <span>Sentences: {lesson.sentences.split(',').length}</span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="lesson"
                      value={lesson.lessonId}
                      checked={selectedLesson === lesson.lessonId}
                      onChange={() => setSelectedLesson(lesson.lessonId)}
                      className="ml-2"
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedLesson}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Selecting...' : 'Select Lesson'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LessonSelectionModal; 