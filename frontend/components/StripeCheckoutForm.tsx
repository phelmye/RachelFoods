'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface StripeCheckoutFormProps {
    clientSecret: string;
    onSuccess: () => void;
}

export default function StripeCheckoutForm({ clientSecret, onSuccess }: StripeCheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: submitError } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/orders/confirmation`,
                },
                redirect: 'if_required',
            });

            if (submitError) {
                setError(submitError.message || 'Payment failed');
                setLoading(false);
            } else {
                // Payment succeeded
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || loading}
                className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
                {loading ? 'Processing...' : 'Pay Now'}
            </button>

            <p className="text-xs text-center text-foreground/60">
                Your payment is secure and encrypted with Stripe
            </p>
        </form>
    );
}
