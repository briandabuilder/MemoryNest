import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BellIcon, 
  SparklesIcon,
  UserIcon,
  HeartIcon,
  CalendarIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import memoryService from '../services/memoryService';
import { Nudge } from '../types';
import toast from 'react-hot-toast';

const Nudges: React.FC = () => {
  const [selectedNudge, setSelectedNudge] = useState<Nudge | null>(null);
  const queryClient = useQueryClient();

  // Fetch nudges
  const { data: nudges = [], isLoading } = useQuery({
    queryKey: ['nudges'],
    queryFn: () => memoryService.getNudges(),
  });

  // Mark nudge as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (nudgeId: string) => memoryService.markNudgeAsRead(nudgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nudges'] });
      toast.success('Nudge marked as read');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark nudge as read');
    },
  });

  // Generate new nudge mutation
  const generateNudgeMutation = useMutation({
    mutationFn: (type: 'silence' | 'emotional_gap' | 'reconnect' | 'milestone') => 
      memoryService.generateNudge(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nudges'] });
      toast.success('New nudge generated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate nudge');
    },
  });

  const getNudgeIcon = (type: string) => {
    switch (type) {
      case 'silence':
        return <BellIcon className="h-6 w-6 text-yellow-600" />;
      case 'emotional_gap':
        return <HeartIcon className="h-6 w-6 text-red-600" />;
      case 'reconnect':
        return <UserIcon className="h-6 w-6 text-blue-600" />;
      case 'milestone':
        return <SparklesIcon className="h-6 w-6 text-purple-600" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-600" />;
    }
  };

  const getNudgeColor = (type: string) => {
    switch (type) {
      case 'silence':
        return 'bg-yellow-50 border-yellow-200';
      case 'emotional_gap':
        return 'bg-red-50 border-red-200';
      case 'reconnect':
        return 'bg-blue-50 border-blue-200';
      case 'milestone':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getNudgeTypeLabel = (type: string) => {
    switch (type) {
      case 'silence':
        return 'Silence Reminder';
      case 'emotional_gap':
        return 'Emotional Gap';
      case 'reconnect':
        return 'Reconnect';
      case 'milestone':
        return 'Milestone';
      default:
        return 'Nudge';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReconnect = (nudge: Nudge) => {
    setSelectedNudge(nudge);
    // TODO: Implement reconnect functionality
    toast.success('Reconnect feature coming soon!');
  };

  const handleMarkAsRead = (nudgeId: string) => {
    markAsReadMutation.mutate(nudgeId);
  };

  const handleGenerateNudge = (type: 'silence' | 'emotional_gap' | 'reconnect' | 'milestone') => {
    generateNudgeMutation.mutate(type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Nudges</h1>
          <p className="text-gray-600">AI-powered reminders and suggestions</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleGenerateNudge('reconnect')}
            disabled={generateNudgeMutation.isPending}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Generate Nudge
          </button>
        </div>
      </div>

      {/* Generate Nudges Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Nudges</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleGenerateNudge('silence')}
            disabled={generateNudgeMutation.isPending}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <BellIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Silence Check</p>
            <p className="text-xs text-gray-500">Check for quiet periods</p>
          </button>

          <button
            onClick={() => handleGenerateNudge('emotional_gap')}
            disabled={generateNudgeMutation.isPending}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <HeartIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Emotional Gap</p>
            <p className="text-xs text-gray-500">Find emotional patterns</p>
          </button>

          <button
            onClick={() => handleGenerateNudge('reconnect')}
            disabled={generateNudgeMutation.isPending}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <UserIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Reconnect</p>
            <p className="text-xs text-gray-500">Reach out to people</p>
          </button>

          <button
            onClick={() => handleGenerateNudge('milestone')}
            disabled={generateNudgeMutation.isPending}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <SparklesIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Milestone</p>
            <p className="text-xs text-gray-500">Celebrate achievements</p>
          </button>
        </div>
      </div>

      {/* Nudges List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Nudges ({nudges.filter(n => !n.is_read).length} unread)
          </h2>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : nudges.length === 0 ? (
            <div className="text-center py-12">
              <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No nudges yet</h3>
              <p className="text-gray-500 mb-4">Generate some nudges to get started</p>
              <button
                onClick={() => handleGenerateNudge('reconnect')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Generate Nudge
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {nudges.map((nudge: Nudge) => (
                <div
                  key={nudge.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    nudge.is_read ? 'opacity-75' : ''
                  } ${getNudgeColor(nudge.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getNudgeIcon(nudge.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900">{nudge.title}</h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getNudgeTypeLabel(nudge.type)}
                          </span>
                          {!nudge.is_read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{nudge.message}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {formatDate(nudge.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {nudge.type === 'reconnect' && (
                        <button
                          onClick={() => handleReconnect(nudge)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Reconnect"
                        >
                          <UserIcon className="h-4 w-4" />
                        </button>
                      )}
                      {!nudge.is_read ? (
                        <button
                          onClick={() => handleMarkAsRead(nudge.id)}
                          className="p-1 text-green-600 hover:text-green-800 transition-colors"
                          title="Mark as read"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkAsRead(nudge.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Mark as unread"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reconnect Modal */}
      {selectedNudge && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Reconnect</h2>
            <p className="text-gray-600 mb-4">{selectedNudge.message}</p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setSelectedNudge(null);
                  // TODO: Implement call action
                }}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Call
              </button>
              
              <button
                onClick={() => {
                  setSelectedNudge(null);
                  // TODO: Implement message action
                }}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Send Message
              </button>
              
              <button
                onClick={() => {
                  setSelectedNudge(null);
                  // TODO: Implement meet action
                }}
                className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Plan to Meet
              </button>
            </div>
            
            <button
              onClick={() => setSelectedNudge(null)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nudges; 