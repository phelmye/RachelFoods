'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // TODO: Implement contact form submission to backend
            console.log('Contact form:', formData);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setSubmitted(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
                        <p className="text-xl text-foreground/70">
                            Have a question? We'd love to hear from you.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="bg-muted p-6 rounded-lg">
                            <div className="text-3xl mb-3">📧</div>
                            <h3 className="font-semibold text-lg mb-2">Email Us</h3>
                            <p className="text-foreground/70">support@rachelfoods.com</p>
                        </div>

                        <div className="bg-muted p-6 rounded-lg">
                            <div className="text-3xl mb-3">📞</div>
                            <h3 className="font-semibold text-lg mb-2">Call Us</h3>
                            <p className="text-foreground/70">+1 (555) 123-4567</p>
                        </div>

                        <div className="bg-muted p-6 rounded-lg">
                            <div className="text-3xl mb-3">📍</div>
                            <h3 className="font-semibold text-lg mb-2">Visit Us</h3>
                            <p className="text-foreground/70">
                                123 Market Street<br />
                                San Francisco, CA 94103<br />
                                United States
                            </p>
                        </div>

                        <div className="bg-muted p-6 rounded-lg">
                            <div className="text-3xl mb-3">⏰</div>
                            <h3 className="font-semibold text-lg mb-2">Business Hours</h3>
                            <p className="text-foreground/70">
                                Mon-Fri: 9:00 AM - 6:00 PM<br />
                                Sat: 10:00 AM - 4:00 PM<br />
                                Sun: Closed
                            </p>
                        </div>
                    </div>

                    <div className="bg-background border border-border rounded-lg p-8">
                        <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>

                        {submitted && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-700">
                                <strong>Thank you!</strong> Your message has been sent. We'll get back to you soon.
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                                        Your Name *
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                                    Subject *
                                </label>
                                <input
                                    id="subject"
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium mb-2">
                                    Message *
                                </label>
                                <textarea
                                    id="message"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={6}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {loading ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
