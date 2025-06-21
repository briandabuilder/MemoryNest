import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  BookOpenIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import memoryService from '../services/memoryService';
import { Person, CreatePersonRequest, UpdatePersonRequest } from '../types';
import toast from 'react-hot-toast';

const People: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  // Fetch people
  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: () => memoryService.getPeople(),
  });

  // Create person mutation
  const createPersonMutation = useMutation({
    mutationFn: (data: CreatePersonRequest) => memoryService.createPerson(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setShowAddModal(false);
      setFormData({ name: '', relationship: '', notes: '' });
      toast.success('Person added successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add person');
    },
  });

  // Update person mutation
  const updatePersonMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePersonRequest }) => 
      memoryService.updatePerson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setEditingPerson(null);
      setFormData({ name: '', relationship: '', notes: '' });
      toast.success('Person updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update person');
    },
  });

  // Delete person mutation
  const deletePersonMutation = useMutation({
    mutationFn: (id: string) => memoryService.deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Person deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete person');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (editingPerson) {
      updatePersonMutation.mutate({
        id: editingPerson.id,
        data: formData,
      });
    } else {
      createPersonMutation.mutate(formData);
    }
  };

  const handleEdit = (person: Person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      relationship: person.relationship,
      notes: person.notes || '',
    });
  };

  const handleDelete = (person: Person) => {
    if (window.confirm(`Are you sure you want to delete ${person.name}?`)) {
      deletePersonMutation.mutate(person.id);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingPerson(null);
    setFormData({ name: '', relationship: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">People</h1>
          <p className="text-gray-600">Manage the people in your life and your relationships</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Person
        </button>
      </div>

      {/* People Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <UsersIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No people added yet</h3>
          <p className="text-gray-500 mb-4">Start adding people to organize your memories</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Person
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map((person: Person) => (
            <div key={person.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-lg">
                      {person.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{person.name}</h3>
                    <p className="text-sm text-gray-500">{person.relationship}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(person)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(person)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {person.notes && (
                <p className="text-sm text-gray-600 mb-4">{person.notes}</p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Added {new Date(person.created_at).toLocaleDateString()}</span>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <BookOpenIcon className="h-3 w-3 mr-1" />
                    {/* TODO: Add memory count */}
                    0 memories
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingPerson) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingPerson ? 'Edit Person' : 'Add Person'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Friend, Family, Colleague"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Any additional notes about this person..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPersonMutation.isPending || updatePersonMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createPersonMutation.isPending || updatePersonMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    editingPerson ? 'Update' : 'Add'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default People; 