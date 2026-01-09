import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function CatalogLoading() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="h-10 w-64 bg-muted animate-pulse rounded mb-4"></div>
                    <div className="h-6 w-96 bg-muted animate-pulse rounded"></div>
                </div>

                {/* Categories skeleton */}
                <div className="mb-8">
                    <div className="h-8 w-32 bg-muted animate-pulse rounded mb-4"></div>
                    <div className="flex flex-wrap gap-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-10 w-32 bg-muted animate-pulse rounded"></div>
                        ))}
                    </div>
                </div>

                {/* Products grid skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="border border-border rounded-lg p-4">
                            <div className="aspect-square mb-4 bg-muted animate-pulse rounded"></div>
                            <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-2"></div>
                            <div className="h-4 w-full bg-muted animate-pulse rounded mb-3"></div>
                            <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
