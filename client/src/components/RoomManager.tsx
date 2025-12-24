import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RoomManagerProps {
  onCreateRoom: (roomName: string, isPrivate: boolean, key?: string) => void;
  onJoinRoom: (roomName: string, key?: string) => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ onCreateRoom, onJoinRoom }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [roomKey, setRoomKey] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      setError(t('roomName') + ' is required');
      return;
    }

    if (isPrivate && !roomKey.trim()) {
      setError(t('roomKey') + ' is required for private rooms');
      return;
    }

    setError('');
    onCreateRoom(roomName.trim(), isPrivate, isPrivate ? roomKey.trim() : undefined);
  };

  const handleJoinRoom = () => {
    if (!roomName.trim()) {
      setError(t('roomName') + ' is required');
      return;
    }

    setError('');
    onJoinRoom(roomName.trim(), roomKey.trim() || undefined);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          {t('createRoom')} / {t('joinRoom')}
        </h2>

        <div className="flex mb-6">
          <button
            className={`flex-1 py-2 px-4 ${activeTab === 'create' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} 
              rounded-l-md focus:outline-none transition-colors`}
            onClick={() => setActiveTab('create')}
          >
            {t('createPrivateRoom')}
          </button>
          <button
            className={`flex-1 py-2 px-4 ${activeTab === 'join' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} 
              rounded-r-md focus:outline-none transition-colors`}
            onClick={() => setActiveTab('join')}
          >
            {t('joinExistingRoom')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('roomName')}
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('roomName')}
            />
          </div>

          {activeTab === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Private Room
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="privateRoom"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="privateRoom" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Make this room private
                </label>
              </div>
            </div>
          )}

          {(isPrivate || activeTab === 'join') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('roomKey')}
                {activeTab === 'join' && ' (optional for public rooms)'}
              </label>
              <input
                type="password"
                value={roomKey}
                onChange={(e) => setRoomKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('roomKey')}
              />
            </div>
          )}

          <button
            onClick={activeTab === 'create' ? handleCreateRoom : handleJoinRoom}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {activeTab === 'create' ? t('createRoom') : t('joinRoom')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomManager;