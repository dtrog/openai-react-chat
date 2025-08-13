import React, {createContext, ReactNode, useEffect, useState} from 'react';
import { ProviderConfig } from './providers/types';
import providersJson from './providers.json';

export type UserTheme = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

interface UserSettings {
  userTheme: UserTheme;
  theme: Theme;
  model: string | null;
  instructions: string;
  speechModel: string | null;
  speechVoice: string | null;
  speechSpeed: number | null;
  activeProvider: string;
  providerConfigs: ProviderConfig[];
}

const getInitialProviderConfigs = (): ProviderConfig[] => {
  // Load all enabled providers from providers.json
  const enabledProviders = (providersJson as any[]).filter(p => p.enabled);
  
  return enabledProviders.map(provider => ({
    name: provider.name,
    apiKey: provider.apiKey || '',
    baseUrl: provider.baseUrl
  }));
};

const getInitialActiveProvider = (): string => {
  // Find first enabled provider from providers.json
  const enabledProviders = (providersJson as any[]).filter(p => p.enabled);
  return enabledProviders.length > 0 ? enabledProviders[0].name : '';
};

const defaultUserSettings: UserSettings = {
  userTheme: 'system',
  theme: 'light',
  model: null,
  instructions: '',
  speechModel: 'tts-1',
  speechSpeed: 1.0,
  activeProvider: '',
  providerConfigs: [],
  speechVoice: 'echo',
};

const determineEffectiveTheme = (userTheme: UserTheme): Theme => {
  if (userTheme === 'system' || !userTheme) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return userTheme;
};

export const UserContext = createContext<{
  userSettings: UserSettings;
  setUserSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}>({
  userSettings: defaultUserSettings,
  setUserSettings: () => {
  },
  });

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({children}: UserProviderProps) => {
    const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const storedUserTheme = localStorage.getItem('theme');
    const userTheme: UserTheme = (storedUserTheme === 'light' || storedUserTheme === 'dark' || storedUserTheme === 'system') ? storedUserTheme : defaultUserSettings.userTheme;

    const model = localStorage.getItem('defaultModel') || defaultUserSettings.model;
    const instructions = localStorage.getItem('defaultInstructions') || defaultUserSettings.instructions;
    const speechModel = localStorage.getItem('defaultSpeechModel') || defaultUserSettings.speechModel;
    const speechVoice = localStorage.getItem('defaultSpeechVoice') || defaultUserSettings.speechVoice;
    const activeProvider = localStorage.getItem('activeProvider') || getInitialActiveProvider();
    const storedProviderConfigs = localStorage.getItem('providerConfigs');
    let providerConfigs: ProviderConfig[];
    if (storedProviderConfigs) {
      try {
        const parsed = JSON.parse(storedProviderConfigs);
        providerConfigs = Array.isArray(parsed) ? parsed : getInitialProviderConfigs();
      } catch {
        providerConfigs = getInitialProviderConfigs();
      }
    } else {
      providerConfigs = getInitialProviderConfigs();
    }

    const speechSpeedRaw = localStorage.getItem('defaultSpeechSpeed');
    const speechSpeed = speechSpeedRaw !== null ? Number(speechSpeedRaw) : defaultUserSettings.speechSpeed;

    const effectiveTheme = determineEffectiveTheme(userTheme);

    return {
      userTheme: userTheme,
      theme: effectiveTheme,
      model,
      instructions,
  speechModel,
      speechVoice,
      speechSpeed,
      activeProvider,
      providerConfigs
    };
    });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', mediaQueryChangeHandler);
    updateTheme();

    return () => {
      mediaQuery.removeEventListener('change', mediaQueryChangeHandler);
    };
  }, []);
    
  useEffect(() => {
    localStorage.setItem('theme', userSettings.userTheme);
  }, [userSettings.userTheme]);

  useEffect(() => {
    if (userSettings.model === null || userSettings.model === '') {
      localStorage.removeItem('defaultModel');
    } else {
      localStorage.setItem('defaultModel', userSettings.model);
    }
  }, [userSettings.model]);

  useEffect(() => {
    if (userSettings.instructions === '') {
      localStorage.removeItem('defaultInstructions');
    } else {
localStorage.setItem('defaultInstructions', userSettings.instructions);
    }
  }, [userSettings.instructions]);

  useEffect(() => {
    const newEffectiveTheme = determineEffectiveTheme(userSettings.userTheme);
    setUserSettings(prevSettings => ({...prevSettings, theme: newEffectiveTheme}));

        if (newEffectiveTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [userSettings.userTheme]);

  const mediaQueryChangeHandler = (e: MediaQueryListEvent) => {
    const newSystemTheme: Theme = e.matches ? 'dark' : 'light';
    if (userSettings.userTheme === 'system') {
      setUserSettings((prevSettings) => ({
...prevSettings,
        theme: newSystemTheme,
      }));
    }
  };

  const updateTheme = () => {
    const newEffectiveTheme = determineEffectiveTheme(userSettings.userTheme || 'system');
    if (newEffectiveTheme !== userSettings.theme) {
      setUserSettings((prevSettings) => ({...prevSettings, theme: newEffectiveTheme}));
    }
    if (newEffectiveTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (userSettings.speechModel === null || userSettings.speechModel === '') {
      localStorage.removeItem('defaultSpeechModel');
    } else {
      localStorage.setItem('defaultSpeechModel', userSettings.speechModel);
    }
  }, [userSettings.speechModel]);

  useEffect(() => {
    if (userSettings.speechVoice === null || userSettings.speechVoice === '') {
      localStorage.removeItem('defaultSpeechVoice');
    } else {
      localStorage.setItem('defaultSpeechVoice', userSettings.speechVoice);
    }
  }, [userSettings.speechVoice]);

  useEffect(() => {
  if (userSettings.speechSpeed === null || userSettings.speechSpeed === undefined || userSettings.speechSpeed < 0.25 || userSettings.speechSpeed > 4.0) {
      localStorage.removeItem('defaultSpeechSpeed');
    } else {
      localStorage.setItem('defaultSpeechSpeed', String(userSettings.speechSpeed));
    }
  }, [userSettings.speechSpeed]);

  useEffect(() => {
    localStorage.setItem('activeProvider', userSettings.activeProvider);
  }, [userSettings.activeProvider]);

  useEffect(() => {
    localStorage.setItem('providerConfigs', JSON.stringify(userSettings.providerConfigs));
  }, [userSettings.providerConfigs]);

  return (
      <UserContext.Provider value={{userSettings, setUserSettings}}>
        {children}
      </UserContext.Provider>
  );
};

// Usage hint
// const { userSettings, setUserSettings } = useContext(UserContext);
