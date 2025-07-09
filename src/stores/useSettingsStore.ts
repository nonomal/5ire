// import Debug from 'debug';
import { create } from 'zustand';
import { LanguageType, ISettings } from '../types/settings.d';
/* eslint-disable no-console */

import { FontSize, ThemeType } from '../types/appearance';

// const debug = Debug('5ire:stores:useSettingsStore');

const defaultTheme = 'system';
const defaultLanguage = 'system';
const defaultFontSize = 'base';

export interface ISettingStore {
  theme: ThemeType;
  language: LanguageType;
  fontSize: FontSize;
  setTheme: (theme: ThemeType) => void;
  setLanguage: (language: LanguageType) => void;
  setFontSize: (fontSize: FontSize) => void;
}

const settings = window.electron.store.get('settings', {}) as ISettings;

const useSettingsStore = create<ISettingStore>((set) => ({
  theme: settings?.theme || defaultTheme,
  language: settings?.language || defaultLanguage,
  fontSize: settings?.fontSize || defaultFontSize,
  setTheme: async (theme: ThemeType) => {
    set({ theme });
    window.electron.store.set('settings.theme', theme);
  },
  setLanguage: (language: 'en' | 'zh' | 'system') => {
    set({ language });
    window.electron.store.set('settings.language', language);
  },
  setFontSize: (fontSize: FontSize) => {
    set({ fontSize });
    window.electron.store.set('settings.fontSize', fontSize);
  },
}));

export default useSettingsStore;
