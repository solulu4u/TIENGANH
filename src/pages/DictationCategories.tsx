import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  MessageSquare, 
  Briefcase, 
  Youtube, 
  Headphones, 
  GraduationCap,
  Mic,
  Globe,
  Clock,
  Users,
  Star,
  ArrowRight
} from 'lucide-react';
import { Category } from '../types/category';
import { getCategories } from '../utils/api';

const DictationCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      if (response.success && response.data) {
        // Merge icon and color for UI display
        const categoriesWithUI = response.data.map((category: any) => ({
          ...category,
          icon: getCategoryIcon(category.title),
          color: getCategoryColor(category.title)
        }));
        setCategories(categoriesWithUI);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (title: string) => {
    const iconMap: Record<string, React.ElementType> = {
      'Short Stories': BookOpen,
      'Daily Conversations': MessageSquare,
      'TOEIC Listening': Briefcase,
      'YouTube': Youtube,
      'IELTS Listening': Headphones,
      'TOEFL Listening': GraduationCap,
      'Spelling Names': Mic,
      'World News': Globe
    };
    return iconMap[title] || BookOpen;
  };

  const getCategoryColor = (title: string) => {
    const colorMap: Record<string, string> = {
      'Short Stories': 'from-blue-500 to-blue-600',
      'Daily Conversations': 'from-green-500 to-green-600',
      'TOEIC Listening': 'from-purple-500 to-purple-600',
      'YouTube': 'from-red-500 to-red-600',
      'IELTS Listening': 'from-indigo-500 to-indigo-600',
      'TOEFL Listening': 'from-orange-500 to-orange-600',
      'Spelling Names': 'from-pink-500 to-rose-600',
      'World News': 'from-teal-500 to-teal-600'
    };
    return colorMap[title] || 'from-gray-500 to-gray-600';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-800">
          Dictation Practice
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Improve your listening and writing skills with our comprehensive dictation exercises. 
          Choose from various categories to match your learning goals and proficiency level.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mb-1">200+</div>
          <div className="text-sm text-slate-600">Total Lessons</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mb-1">50K+</div>
          <div className="text-sm text-slate-600">Active Learners</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mb-1">4.9</div>
          <div className="text-sm text-slate-600">Average Rating</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mb-1">24/7</div>
          <div className="text-sm text-slate-600">Available</div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const IconComponent = category.icon || BookOpen;
          return (
            <div key={category.id} className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(category.difficulty)}`}>
                    {category.difficulty}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold text-slate-800 mb-3">{category.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-3">{category.description}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{category.lessonsCount} lessons</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{category.duration} min</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Globe className="w-4 h-4" />
                      <span>{category.accent}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>4.8</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/dashboard/dictation/${category.id}`}
                  className="w-full bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 py-3 px-4 rounded-xl hover:from-slate-200 hover:to-slate-300 transition-all duration-200 font-medium text-center flex items-center justify-center space-x-2 group-hover:from-blue-500 group-hover:to-indigo-500 group-hover:text-white"
                >
                  <span>Explore Lessons</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Why Choose Our Dictation Practice?</h2>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            Our dictation exercises are designed to improve your listening accuracy and writing skills simultaneously.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Analysis</h3>
            <p className="text-blue-100">Get detailed feedback on your accuracy with word-by-word analysis and suggestions for improvement.</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Headphones className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Authentic Audio</h3>
            <p className="text-blue-100">Practice with real-world audio from various sources including news, conversations, and academic content.</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Progressive Learning</h3>
            <p className="text-blue-100">Start with simple exercises and gradually progress to more challenging content as your skills improve.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DictationCategories;