'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();

    const toggleTheme = () => {
        if (theme === 'system') {
            setTheme('light');
        } else if (theme === 'light') {
            setTheme('dark');
        } else {
            setTheme('system');
        }
    };

    const getIcon = () => {
        if (theme === 'system') {
            return '🖥️';
        }
        return resolvedTheme === 'dark' ? '🌙' : '☀️';
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Current: ${theme === 'system' ? `System (${resolvedTheme})` : theme}`}
        >
            <span className="text-xl">{getIcon()}</span>
        </Button>
    );
}
