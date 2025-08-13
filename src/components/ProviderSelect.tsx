import React, { useContext, useEffect, useState } from 'react';
import { ProviderManager, ProviderRegistration } from '../providers/ProviderManager';
import { UserContext } from '../UserContext';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface ProviderSelectProps {
  onProviderChange?: (providerId: string) => void;
  className?: string;
}

const ProviderSelect: React.FC<ProviderSelectProps> = ({ onProviderChange, className = '' }) => {
  const { userSettings, setUserSettings } = useContext(UserContext);
  const { t } = useTranslation();
  const [availableProviders, setAvailableProviders] = useState<ProviderRegistration[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const providerManager = ProviderManager.getInstance();
    const providers = providerManager.getAvailableProviders();
    setAvailableProviders(providers);
  }, []);

  const handleProviderSelect = (providerId: string) => {
    setUserSettings(prev => ({
      ...prev,
      activeProvider: providerId,
      model: null, // Reset model when provider changes
    }));
    
    if (onProviderChange) {
      onProviderChange(providerId);
    }
    setIsOpen(false);
  };

  const getCurrentProvider = () => {
    if (!userSettings.activeProvider) {
      return { displayName: 'Select Provider', name: '' };
    }
    
    const provider = availableProviders.find(p => p.name === userSettings.activeProvider);
    return provider || { displayName: 'Unknown Provider', name: userSettings.activeProvider };
  };

  const currentProvider = getCurrentProvider();
  const configuredProviders = userSettings.providerConfigs.map((p) => p.name);
  const availableConfiguredProviders = availableProviders.filter((p) =>
    configuredProviders.includes(p.name)
  );

  return (
    <div className={`relative ${className}`}>
      {/* Provider Selection Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Provider:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {currentProvider.displayName}
          </span>
        </div>
        <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {availableConfiguredProviders.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                Configured Providers
              </div>
              {availableConfiguredProviders.map((provider) => (
                <button
                  key={provider.name}
                  onClick={() => handleProviderSelect(provider.name)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-between ${
                    userSettings.activeProvider === provider.name
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <span>{provider.displayName}</span>
                  {userSettings.activeProvider === provider.name && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">✓ Active</span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                No providers configured
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Configure providers in Settings → Providers
              </p>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ProviderSelect;