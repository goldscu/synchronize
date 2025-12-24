import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MessageInputProps {
  onSendMessage: (title: string, content: string) => void;
  onSendFile: (file: File) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onSendFile }) => {
  const { t } = useTranslation();
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      alert('Please enter both title and content');
      return;
    }

    setIsSending(true);
    try {
      onSendMessage(messageTitle.trim(), messageContent.trim());
      setMessageTitle('');
      setMessageContent('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile) return;

    setIsSending(true);
    try {
      await onSendFile(selectedFile);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending file:', error);
      alert('Failed to send file');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
      {selectedFile ? (
        // File Upload Mode
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-md">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCancelFile}
                className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSendFile}
                disabled={isSending}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-blue-400 transition-colors"
              >
                {isSending ? 'Sending...' : t('send')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Message Input Mode
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              placeholder={t('messageTitle')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isSending}
            />
          </div>
          <div>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder={t('messageContent')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              disabled={isSending}
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('attachFile')}</span>
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                disabled={isSending}
              />
            </label>
            <button
              onClick={handleSendMessage}
              disabled={isSending || !messageTitle.trim() || !messageContent.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-400 transition-colors flex items-center"
            >
              {isSending ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {t('sendMessage')}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;