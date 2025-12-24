import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConnectionStatus as Status } from '../websocket';

interface ConnectionStatusProps {
  status: Status;
  onReconnect: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, onReconnect }) => {
  const { t } = useTranslation();

  const getStatusText = () => {
    switch (status) {
      case Status.CONNECTING:
        return t('connecting');
      case Status.CONNECTED:
        return t('connected');
      case Status.DISCONNECTED:
        return t('disconnected');
      case Status.RECONNECTING:
        return t('connecting');
      default:
        return t('disconnected');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case Status.CONNECTING:
      case Status.RECONNECTING:
        return 'text-yellow-500';
      case Status.CONNECTED:
        return 'text-green-500';
      case Status.DISCONNECTED:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case Status.CONNECTING:
      case Status.RECONNECTING:
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case Status.CONNECTED:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case Status.DISCONNECTED:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`flex items-center text-sm ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="ml-1">{getStatusText()}</span>
      </span>
      {status === Status.DISCONNECTED && (
        <button
          onClick={onReconnect}
          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title={t('reconnect')}
        >
          {t('reconnect')}
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;