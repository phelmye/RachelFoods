import { AdminGuard } from '@/components/AdminGuard';
import { AdminNav } from '@/components/AdminNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-muted">
                <AdminNav />
                <main className="flex-1 overflow-auto">
                    <div className="container mx-auto p-4 md:p-8">
                        <ErrorBoundary>
                            {children}
                        </ErrorBoundary>
                    </div>
                </main>
            </div>
        </AdminGuard>
    );
}
