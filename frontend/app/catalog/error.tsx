'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';
import { useEffect } from 'react';

export default function CatalogError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Catalog error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-3xl font-bold mb-4">Something went wrong</h2>
                    <p className="text-foreground/70 mb-6 max-w-md mx-auto">
                        We couldn't load the product catalog. This might be a temporary issue.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={reset}
                            className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Try Again
                        </button>
                        <Link
                            href="/"
                            className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
