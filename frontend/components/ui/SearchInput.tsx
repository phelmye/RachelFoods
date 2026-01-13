'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from '@/lib/utils';

interface SearchInputProps {
    placeholder?: string;
    onSearch: (query: string) => void | Promise<void>;
    debounceMs?: number;
    minChars?: number;
    className?: string;
}

export function SearchInput({
    placeholder = 'Search...',
    onSearch,
    debounceMs = 300,
    minChars = 2,
    className = '',
}: SearchInputProps) {
    const [value, setValue] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Debounced search function with abort controller support
    const debouncedSearch = useCallback(
        debounce(async (query: string) => {
            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Don't search if below minimum characters
            if (query.length > 0 && query.length < minChars) {
                setIsSearching(false);
                return;
            }

            // Create new abort controller
            abortControllerRef.current = new AbortController();

            try {
                setIsSearching(true);
                await onSearch(query);
            } catch (error: any) {
                // Ignore abort errors
                if (error?.name !== 'AbortError') {
                    console.error('Search error:', error);
                }
            } finally {
                setIsSearching(false);
            }
        }, debounceMs),
        [onSearch, debounceMs, minChars]
    );

    useEffect(() => {
        debouncedSearch(value);
    }, [value, debouncedSearch]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    };

    const handleClear = () => {
        setValue('');
        onSearch('');
    };

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 pl-10 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground transition-all"
                />

                {/* Search icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50">
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>

                {/* Loading spinner or clear button */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isSearching ? (
                        <svg
                            className="animate-spin h-5 w-5 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    ) : value ? (
                        <button
                            onClick={handleClear}
                            className="text-foreground/50 hover:text-foreground transition-colors"
                            aria-label="Clear search"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Helper text */}
            {value.length > 0 && value.length < minChars && (
                <p className="text-sm text-foreground/60 mt-1">
                    Type at least {minChars} characters to search
                </p>
            )}
        </div>
    );
}
