import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MessageListProps {
  messages: any[];
  onDeleteMessage: (messageId: string) => void;
  onDownloadFile: (message: any) => void;
  decryptMessage: (encryptedContent: string) => string;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  onDeleteMessage,
  onDownloadFile,
  decryptMessage
}) => {
  const { t } = useTranslation();
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const toggleExpand = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedMessages(newExpanded);
  };

  const handleDelete = (messageId: string) => {
    setShowDeleteConfirm(messageId);
  };

  const confirmDelete = (messageId: string) => {
    onDeleteMessage(messageId);
    setShowDeleteConfirm(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const isTextMessage = (message: any): boolean => {
    return message.isEncrypted !== undefined;
  };

  const isFileMessage = (message: any): boolean => {
    return message.fileName !== undefined;
  };

  const getDecryptedContent = (message: any): string => {
    if (!isTextMessage(message)) return '';
    try {
      return decryptMessage(message.content);
    } catch (error) {
      return 'Decryption failed';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700"
            >
              {/* Message Header */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  {isTextMessage(message) && (
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {JSON.parse(message.content).title || 'Untitled'}
                    </h3>
                  )}
                  {isFileMessage(message) && (
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      📁 {message.fileName}
                    </h3>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {isTextMessage(message) && (
                    <button
                      onClick={() => toggleExpand(message.id)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title={expandedMessages.has(message.id) ? t('collapse') : t('expand')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {expandedMessages.has(message.id) ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        )}
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(isTextMessage(message) ? getDecryptedContent(message) : message.fileName)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title={t('copy')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(message.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title={t('delete')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Message Content */}
              {isTextMessage(message) && (
                <div className="mt-2">
                  {expandedMessages.has(message.id) ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                      <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono text-sm">
                        {getDecryptedContent(message)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                      {getDecryptedContent(message).substring(0, 100)}
                      {getDecryptedContent(message).length > 100 && '...'}
                    </p>
                  )}
                </div>
              )}

              {isFileMessage(message) && (
                <div className="mt-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center mr-3">
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {message.fileName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(message.fileSize)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {message.uploadComplete ? (
                        <button
                          onClick={() => onDownloadFile(message)}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                          {t('download')}
                        </button>
                      ) : (
                        <span className="text-sm text-yellow-500">
                          {t('uploading')}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('confirmDelete')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('areYouSure')}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => confirmDelete(showDeleteConfirm)}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                {t('yes')}
              </button>
              <button
                onClick={cancelDelete}
                className="flex-1 py-2 px-4 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                {t('no')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;