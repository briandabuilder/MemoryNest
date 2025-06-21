import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  MicrophoneIcon, 
  StopIcon, 
  PaperAirplaneIcon,
  UserIcon,
  MapPinIcon,
  CloudIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import memoryService from '../services/memoryService';
import voiceService from '../services/voiceService';
import { CreateMemoryRequest, Person, TranscriptionResult } from '../types';
import toast from 'react-hot-toast';

const MemoryCapture: React.FC = () => {
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [mood, setMood] = useState('');
  const [emotions, setEmotions] = useState<string[]>([]);

  // Fetch people for tagging
  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: () => memoryService.getPeople(),
  });

  // Create memory mutation
  const createMemoryMutation = useMutation({
    mutationFn: (data: CreateMemoryRequest) => memoryService.createMemory(data),
    onSuccess: () => {
      toast.success('Memory captured successfully!');
      navigate('/memories');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to capture memory');
    },
  });

  // Summarize content mutation
  const summarizeMutation = useMutation({
    mutationFn: (content: string) => memoryService.summarizeMemory(content),
    onSuccess: (data) => {
      setSummary(data.summary);
      setMood(data.mood);
      setEmotions(data.emotions);
      setShowSummary(true);
    },
    onError: (error: any) => {
      toast.error('Failed to generate summary');
    },
  });

  const startRecording = async () => {
    const hasPermission = await voiceService.requestMicrophonePermission();
    if (!hasPermission) {
      toast.error('Microphone permission required for voice recording');
      return;
    }

    setIsRecording(true);
    voiceService.startListening(
      (result: TranscriptionResult) => {
        setContent(prev => prev + (prev ? ' ' : '') + result.text);
        toast.success(`Transcribed: ${result.text}`);
      },
      (error: string) => {
        toast.error(error);
        setIsRecording(false);
      },
      () => {
        // onStart
      },
      () => {
        setIsRecording(false);
      }
    );
  };

  const stopRecording = () => {
    voiceService.stopListening();
    setIsRecording(false);
  };

  const handleSummarize = () => {
    if (!content.trim()) {
      toast.error('Please enter some content first');
      return;
    }
    summarizeMutation.mutate(content);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }

    setIsProcessing(true);
    try {
      const memoryData: CreateMemoryRequest = {
        content: content.trim(),
        people_mentioned: selectedPeople,
        location: location || undefined,
        weather: weather || undefined,
        tags: tags,
      };

      createMemoryMutation.mutate(memoryData);
    } catch (error) {
      toast.error('Failed to save memory');
    } finally {
      setIsProcessing(false);
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const togglePerson = (personId: string) => {
    setSelectedPeople(prev => 
      prev.includes(personId) 
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Capture a Memory</h1>
          <p className="text-gray-600">Record your thoughts, experiences, or moments using text or voice</p>
        </div>

        {/* Input Mode Toggle */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setInputMode('text')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                inputMode === 'text'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Text Input
            </button>
            <button
              onClick={() => setInputMode('voice')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                inputMode === 'voice'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Voice Input
            </button>
          </div>
        </div>

        {/* Voice Recording Controls */}
        {inputMode === 'voice' && (
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  <MicrophoneIcon className="h-5 w-5 mr-2" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  <StopIcon className="h-5 w-5 mr-2" />
                  Stop Recording
                </button>
              )}
              {isRecording && (
                <div className="flex items-center text-red-500">
                  <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  Recording...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What's on your mind?
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe your memory, thought, or experience..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isRecording}
          />
          <div className="mt-2 text-sm text-gray-500">
            {content.length} characters
          </div>
        </div>

        {/* People Mentioned */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            People Mentioned
          </label>
          <div className="flex flex-wrap gap-2">
            {people.map((person: Person) => (
              <button
                key={person.id}
                onClick={() => togglePerson(person.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedPeople.includes(person.id)
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <UserIcon className="h-4 w-4 inline mr-1" />
                {person.name}
              </button>
            ))}
          </div>
        </div>

        {/* Location and Weather */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where were you?"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weather
            </label>
            <div className="relative">
              <CloudIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder="How was the weather?"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex items-center space-x-2 mb-2">
            <TagIcon className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add a tag..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addTag}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* AI Summary */}
        {showSummary && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">AI Summary</h3>
            <p className="text-blue-800 mb-2">{summary}</p>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-blue-700">
                <strong>Mood:</strong> {mood}
              </span>
              <span className="text-blue-700">
                <strong>Emotions:</strong> {emotions.join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-3">
            <button
              onClick={handleSummarize}
              disabled={!content.trim() || summarizeMutation.isPending}
              className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {summarizeMutation.isPending ? 'Generating...' : 'Generate Summary'}
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/memories')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isProcessing || createMemoryMutation.isPending}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing || createMemoryMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Save Memory
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryCapture; 