import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PlusIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon,
  HeartIcon,
  TagIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import memoryService from '../services/memoryService';
import { Memory, Person } from '../types';

const Memories: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch memories with filters
  const { data: memoriesData, isLoading } = useQuery({
    queryKey: ['memories', searchQuery, selectedPerson, selectedMood, dateFrom, dateTo, currentPage],
    queryFn: () => memoryService.getMemories({
      page: currentPage,
      limit: 10,
      person_id: selectedPerson || undefined,
      mood: selectedMood || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: searchQuery || undefined,
    }),
  });

  // Fetch people for filter
  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: () => memoryService.getPeople(),
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPerson('');
    setSelectedMood('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Memories</h1>
          <p className="text-gray-600">Browse and search through your captured memories</p>
        </div>
        <Link
          to="/capture"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Capture Memory
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
            {(searchQuery || selectedPerson || selectedMood || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
                <select
                  value={selectedPerson}
                  onChange={(e) => setSelectedPerson(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All people</option>
                  {people.map((person: Person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mood</label>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All moods</option>
                  <option value="happy">Happy</option>
                  <option value="sad">Sad</option>
                  <option value="excited">Excited</option>
                  <option value="calm">Calm</option>
                  <option value="anxious">Anxious</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {isLoading ? 'Loading...' : `Memories (${memoriesData?.pagination.total || 0})`}
            </h2>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : memoriesData?.data.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <BookOpenIcon className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No memories found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedPerson || selectedMood || dateFrom || dateTo
                  ? 'Try adjusting your search criteria'
                  : 'Start capturing your first memory'}
              </p>
              <Link
                to="/capture"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Capture Memory
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {memoriesData?.data.map((memory: Memory) => (
                <div key={memory.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 mb-2">{memory.content}</p>
                      
                      {/* Memory metadata */}
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(memory.created_at)}
                        </div>
                        
                        <div className="flex items-center">
                          <HeartIcon className="h-4 w-4 mr-1" />
                          <span className={`px-2 py-1 rounded-full text-xs ${getMoodColor(memory.mood)}`}>
                            {memory.mood}
                          </span>
                        </div>

                        {memory.location && (
                          <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {memory.location}
                          </div>
                        )}

                        {memory.people_mentioned.length > 0 && (
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            {memory.people_mentioned.length} people
                          </div>
                        )}

                        {memory.tags.length > 0 && (
                          <div className="flex items-center">
                            <TagIcon className="h-4 w-4 mr-1" />
                            {memory.tags.slice(0, 3).join(', ')}
                            {memory.tags.length > 3 && ` +${memory.tags.length - 3} more`}
                          </div>
                        )}
                      </div>

                      {/* Emotions */}
                      {memory.emotions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {memory.emotions.map((emotion, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full"
                            >
                              {emotion}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {memoriesData && memoriesData.pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, memoriesData.pagination.total)} of {memoriesData.pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {currentPage} of {memoriesData.pagination.total_pages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === memoriesData.pagination.total_pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Memories; 