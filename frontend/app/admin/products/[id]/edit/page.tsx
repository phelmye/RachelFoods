'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function ProductEditorPage() {
    const router = useRouter();
    const params = useParams();
    const isEditMode = params?.id && params.id !== 'new';
    const productId = isEditMode ? params.id as string : null;

    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        categoryId: '',
        sku: '',
        price: 0,
        stock: 0,
        unit: 'unit',
        weight: 0,
        imageUrl: '',
        status: 'ACTIVE',
        isFeatured: false,
        supportsRefill: true,
    });

    useEffect(() => {
        fetchCategories();
        if (isEditMode && productId) {
            fetchProduct();
        }
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await api.getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchProduct = async () => {
        if (!productId) return;
        try {
            const data = await api.getAdminProduct(productId);
            setFormData({
                name: data.name,
                description: data.description || '',
                categoryId: data.categoryId || '',
                sku: data.sku,
                price: data.price,
                stock: data.stock,
                unit: data.unit,
                weight: data.weight,
                imageUrl: data.imageUrl || '',
                status: data.status,
                isFeatured: data.isFeatured || false,
                supportsRefill: data.supportsRefill !== false,
            });
        } catch (error) {
            console.error('Failed to fetch product:', error);
            alert('Failed to load product');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (isEditMode && productId) {
                await api.updateAdminProduct(productId, formData);
                alert('Product updated successfully');
            } else {
                await api.createAdminProduct(formData);
                alert('Product created successfully');
            }
            router.push('/admin/products');
        } catch (error: any) {
            console.error('Failed to save product:', error);
            alert(error.message || 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary mb-6">
                {isEditMode ? 'Edit Product' : 'New Product'}
            </h1>

            <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
                <div className="bg-surface border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        Basic Information
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                Description
                            </label>
                            <textarea
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Category
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                                >
                                    <option value="">Select category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    SKU
                                </label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="Auto-generated if empty"
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                Image URL
                            </label>
                            <input
                                type="url"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                placeholder="https://..."
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        Pricing & Inventory
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                Price (USD) *
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                Stock *
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                Unit
                            </label>
                            <input
                                type="text"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="unit, kg, pack, etc."
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                Weight (kg)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        Settings
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="DISABLED">Disabled</option>
                            </select>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isFeatured"
                                checked={formData.isFeatured}
                                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="isFeatured" className="text-sm text-text-primary">
                                Featured Product (show on homepage)
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="supportsRefill"
                                checked={formData.supportsRefill}
                                onChange={(e) => setFormData({ ...formData, supportsRefill: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="supportsRefill" className="text-sm text-text-primary">
                                Supports Kitchen Refill Orders
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/products')}
                        className="px-6 py-2 border border-border rounded-md hover:bg-surface"
                    >
                        Cancel
                    </button>
                </div>
            </form>

            {/* Variants Section for Edit Mode */}
            {isEditMode && productId && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-text-primary">Product Variants</h2>
                        <button className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary/90">
                            Add Variant
                        </button>
                    </div>
                    <p className="text-text-tertiary text-sm">
                        Variant management UI coming soon. Use API for now.
                    </p>
                </div>
            )}
        </div>
    );
}
