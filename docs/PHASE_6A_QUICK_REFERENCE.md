# Phase 6A Quick Reference

## Theme System

### Using Theme Hook

```tsx
import { useTheme } from "@/contexts/ThemeContext";

const { theme, setTheme, resolvedTheme } = useTheme();
setTheme("dark"); // 'light' | 'dark' | 'system'
```

### Theme Colors

```tsx
// In JSX - uses Tailwind utilities
<div className="bg-primary text-white">
<div className="bg-secondary hover:bg-secondary/80">
<div className="text-foreground bg-background">
```

---

## Button Component

```tsx
import { Button } from "@/components/ui/Button";

<Button variant="primary" size="md" loading={false}>
  Click Me
</Button>;
```

**Variants**: `primary`, `secondary`, `outline`, `ghost`, `danger`  
**Sizes**: `sm`, `md`, `lg`  
**Props**: `loading`, `disabled`, `fullWidth`

---

## Search Input

```tsx
import { SearchInput } from "@/components/ui/SearchInput";

<SearchInput
  placeholder="Search..."
  onSearch={(query) => handleSearch(query)}
  debounceMs={300}
  minChars={2}
/>;
```

---

## Cache Service (Backend)

```typescript
import { CacheService } from '../cache/cache.service';

constructor(private cache: CacheService) {}

// Get or Set pattern
const data = await this.cache.getOrSet(
  'my-key',
  async () => fetchData(),
  5 * 60 * 1000 // 5 minutes TTL
);

// Manual invalidation
this.cache.deletePattern('^products:');
this.cache.clear();
```

---

## Admin Endpoints

### System Health

```
GET /api/admin/system/health
Permission: system.view
```

### Order Metrics

```
GET /api/admin/system/metrics/orders
Permission: system.view
```

### Cache Stats

```
GET /api/admin/system/cache/stats
Permission: system.view
```

### Clear Cache

```
GET /api/admin/system/cache/clear
Permission: system.manage
```

---

## Performance Tips

1. **Memoize components**: Wrap in `React.memo()` for lists
2. **Use SearchInput**: Built-in debouncing and abort control
3. **Leverage cache**: Backend caches featured/popular products automatically
4. **Invalidate wisely**: Call `invalidateProductCaches()` after product changes

---

## Styling

### Tailwind with Theme Variables

```tsx
className = "bg-primary hover:opacity-90 transition-all duration-200";
className = "text-foreground/70"; // 70% opacity
className = "border-border";
```

### Custom Utilities

```tsx
import { cn } from '@/lib/utils';

className={cn(
  'base-classes',
  isActive && 'active-classes',
  className // user props
)}
```
