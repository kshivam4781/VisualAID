// Menu system types for voice navigation

export type MenuState = 
  | 'greeting'
  | 'main_menu'
  | 'help'
  | 'vision_mode'
  | 'idle';

export interface MenuItem {
  id: string;
  label: string;
  description: string;
  voiceCommands: string[];
  action: () => void;
}

export interface MenuContext {
  currentMenu: MenuState;
  previousMenu: MenuState | null;
  menuHistory: MenuState[];
}

export interface MenuPrompt {
  state: MenuState;
  text: string;
  options?: string[];
}

