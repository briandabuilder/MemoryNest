import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  BookOpenIcon, 
  UsersIcon, 
  BellIcon,
  TrendingUpIcon,
  CalendarIcon,
  HeartIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import memoryService from '../services/memoryService';
import { Memory, Person, Nudge } from '../types';

const Dashboard: React.FC = () => {
  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => memoryService.getDashboardStats(),
  });

  const { data: recentMemories = [], isLoading: memoriesLoading } = useQuery({
    queryKey: ['recent-memories'],
    queryFn: () => memoryService.getRecentMemories(5),
  });

  const { data: people = [], isLoading: peopleLoading } = useQuery({
    queryKey: ['people'],
    queryFn: () => memoryService.getPeople(),
  });

  const { data: nudges = [], isLoading: nudgesLoading } = useQuery({
    queryKey: ['nudges'],
    queryFn: () => memoryService.getNudges(),
  });

  const getMoodColor = (mood: string) => {
    const moodColors: { [key: string]: string } = {
      happy: 'bg-green-100 text-green-800',
      sad: 'bg-blue-100 text-blue-800',
      excited: 'bg-yellow-100 text-yellow-800',
      calm: 'bg-purple-100 text-purple-800',
      anxious: 'bg-red-100 text-red-800',
      neutral: 'bg-gray-100 text-gray-800',
    };
    return moodColors[mood.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (statsLoading || memoriesLoading || peopleLoading || nudgesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your memories.</p>
        </div>
        <Link
          to="/capture"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Capture Memory
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpenIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Memories</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_memories || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">People</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_people || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.memories_this_week || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <HeartIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Mood</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">
                {stats?.average_mood || 'Neutral'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Memories */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Memories</h2>
              <Link
                to="/memories"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentMemories.length === 0 ? (
              <div className="text-center py-8">
                <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No memories yet. Start capturing your thoughts!</p>
                <Link
                  to="/capture"
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Capture Memory
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMemories.map((memory: Memory) => (
                  <div key={memory.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 line-clamp-2">{memory.content}</p>
                        <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                          <span>{formatDate(memory.created_at)}</span>
                          <span className={`px-2 py-1 rounded-full ${getMoodColor(memory.mood)}`}>
                            {memory.mood}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top Emotions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Emotions</h3>
            </div>
            <div className="p-6">
              {stats?.top_emotions?.length === 0 ? (
                <p className="text-gray-500 text-sm">No emotion data yet</p>
              ) : (
                <div className="space-y-3">
                  {stats?.top_emotions?.slice(0, 5).map((emotion, index) => (
                    <div key={emotion.emotion} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{emotion.emotion}</span>
                      <span className="text-sm font-medium text-gray-900">{emotion.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* People */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">People</h3>
                <Link
                  to="/people"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {people.length === 0 ? (
                <p className="text-gray-500 text-sm">No people added yet</p>
              ) : (
                <div className="space-y-3">
                  {people.slice(0, 5).map((person: Person) => (
                    <div key={person.id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{person.name}</p>
                        <p className="text-xs text-gray-500">{person.relationship}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nudges */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Smart Nudges</h3>
                <Link
                  to="/nudges"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {nudges.length === 0 ? (
                <div className="text-center py-4">
                  <SparklesIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No nudges right now</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nudges.slice(0, 3).map((nudge: Nudge) => (
                    <div key={nudge.id} className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">{nudge.title}</p>
                      <p className="text-xs text-blue-700 mt-1">{nudge.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/capture"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <PlusIcon className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Capture Memory</p>
              <p className="text-sm text-gray-500">Record a new thought or experience</p>
            </div>
          </Link>

          <Link
            to="/memories"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpenIcon className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Browse Memories</p>
              <p className="text-sm text-gray-500">View and search your memories</p>
            </div>
          </Link>

          <Link
            to="/people"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UsersIcon className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Manage People</p>
              <p className="text-sm text-gray-500">Add and organize people</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 