import { useState, useCallback } from 'react';
import type { MenuState, MenuContext } from '../types/menu';

interface UseMenuNavigationProps {
  onMenuChange?: (newMenu: MenuState) => void;
}

export const useMenuNavigation = ({ onMenuChange }: UseMenuNavigationProps = {}) => {
  const [menuContext, setMenuContext] = useState<MenuContext>({
    currentMenu: 'idle',
    previousMenu: null,
    menuHistory: ['idle'],
  });

  // Navigate to a specific menu
  const navigateToMenu = useCallback((newMenu: MenuState) => {
    setMenuContext(prev => ({
      currentMenu: newMenu,
      previousMenu: prev.currentMenu,
      menuHistory: [...prev.menuHistory, newMenu],
    }));
    
    onMenuChange?.(newMenu);
  }, [onMenuChange]);

  // Go back to previous menu
  const goBack = useCallback(() => {
    setMenuContext(prev => {
      if (prev.menuHistory.length <= 1) return prev;
      
      const newHistory = [...prev.menuHistory];
      newHistory.pop(); // Remove current
      const previousMenu = newHistory[newHistory.length - 1];
      
      return {
        currentMenu: previousMenu,
        previousMenu: prev.currentMenu,
        menuHistory: newHistory,
      };
    });
  }, []);

  // Reset to main menu
  const resetToMainMenu = useCallback(() => {
    navigateToMenu('main_menu');
  }, [navigateToMenu]);

  // Reset to idle
  const resetToIdle = useCallback(() => {
    setMenuContext({
      currentMenu: 'idle',
      previousMenu: menuContext.currentMenu,
      menuHistory: ['idle'],
    });
  }, [menuContext.currentMenu]);

  return {
    menuContext,
    navigateToMenu,
    goBack,
    resetToMainMenu,
    resetToIdle,
  };
};

