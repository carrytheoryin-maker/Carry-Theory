import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { usePageSeo } from '../utils/format';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export function ShopPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, products, loading } = useStore();

  const initialSearch = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('all');

  const activeCategory = slug
    ? categories.find((c) => c.slug === slug)
    : undefined;

  usePageSeo({
    title: activeCategory
      ? `${activeCategory.name} — Carry Theory`
      : 'Shop All Essentials — Carry Theory',
    description:
      activeCategory?.description ||
      'Browse the complete Carry Theory collection of tumblers, travel mugs, ceramic mugs, MagSafe wallets, and digital products.',
    canonicalPath: slug ? `/collections/${slug}` : '/shop',
  });

  const scopedProducts = useMemo(() => {
    if (!slug) return products;
    return products.filter((p) => p.categorySlug === slug);
  }, [products, slug]);

  const availableColors = useMemo(() => {
    const map = new Map<string, string>();
    scopedProducts.forEach((p) => {
      p.variants.forEach((v) => {
        if (v.colorName) {
          map.set(v.colorName, v.colorHex || '#151515');
        }
      });
    });
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [scopedProducts]);

  const filteredProducts = useMemo(() => {
    const q = (searchParams.get('q') ?? searchTerm).trim().toLowerCase();
    let list = scopedProducts.filter((p) => {
      if (q) {
        const hay = `${p.name} ${p.categoryName} ${p.shortDescription} ${p.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (onlyAvailable) {
        const hasStock =
          p.variants.length > 0
            ? p.variants.some((v) => v.available && v.stock > 0)
            : p.stock > 0;
        if (!hasStock) return false;
      }
      if (selectedColor !== 'all') {
        const hasColor = p.variants.some((v) => v.colorName === selectedColor);
        if (!hasColor) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // featured
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [scopedProducts, searchParams, searchTerm, onlyAvailable, selectedColor, sortBy]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) {
      next.set('q', value);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSortBy('featured');
    setOnlyAvailable(false);
    setSelectedColor('all');
    setSearchParams({}, { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-28 pb-24">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.18em] text-[#F5F3EF]/50 flex items-center gap-2">
          <Link to="/" className="hover:text-[#C6A77A] transition-colors">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/shop" className="hover:text-[#C6A77A] transition-colors">
            Shop
          </Link>
          {activeCategory && (
            <>
              <span aria-hidden="true">/</span>
              <span className="text-[#C6A77A]">{activeCategory.name}</span>
            </>
          )}
        </nav>

        {/* Page Title */}
        <div className="mt-6 border-b border-[#F5F3EF]/12 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl sm:text-5xl font-semibold uppercase tracking-[-0.015em]">
              {activeCategory ? activeCategory.name : 'All Essentials'}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#F5F3EF]/68">
              {activeCategory
                ? activeCategory.description
                : 'Minimalist everyday carry, insulated drinkware, ceramic vessels, and desk essentials crafted for every form.'}
            </p>
          </div>
          <p className="tabular-nums text-xs uppercase tracking-[0.2em] text-[#C6A77A]">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
          </p>
        </div>

        {/* Category Switcher Tabs */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <Link
            to="/shop"
            className={`px-4 py-2 text-xs uppercase tracking-[0.18em] border transition-colors whitespace-nowrap shrink-0 ${
              !slug
                ? 'border-[#C6A77A] bg-[#C6A77A] text-[#0B0B0B] font-semibold'
                : 'border-[#F5F3EF]/15 text-[#F5F3EF]/75 hover:border-[#C6A77A]/60 hover:text-[#F5F3EF]'
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/collections/${cat.slug}`}
              className={`px-4 py-2 text-xs uppercase tracking-[0.18em] border transition-colors whitespace-nowrap shrink-0 ${
                slug === cat.slug
                  ? 'border-[#C6A77A] bg-[#C6A77A] text-[#0B0B0B] font-semibold'
                  : 'border-[#F5F3EF]/15 text-[#F5F3EF]/75 hover:border-[#C6A77A]/60 hover:text-[#F5F3EF]'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Search, Sort & Filter Toolbar */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-y border-[#F5F3EF]/10 py-4">
          <div className="md:col-span-5 relative flex items-center">
            <Search className="h-4 w-4 text-[#C6A77A] absolute left-3.5 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by product, size, or keyword..."
              className="w-full bg-[#121212] border border-[#F5F3EF]/15 pl-10 pr-9 py-2.5 text-sm text-[#F5F3EF] placeholder:text-[#F5F3EF]/40 focus:border-[#C6A77A] focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                aria-label="Clear search"
                className="absolute right-3 text-[#F5F3EF]/50 hover:text-[#F5F3EF] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-7 flex flex-wrap items-center justify-start md:justify-end gap-3">
            {availableColors.length > 0 && (
              <label className="inline-flex items-center gap-2 text-xs text-[#F5F3EF]/70">
                <span className="uppercase tracking-[0.15em]">Finish:</span>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="bg-[#121212] border border-[#F5F3EF]/15 px-3 py-2 text-xs text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
                >
                  <option value="all">All Finishes</option>
                  {availableColors.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={() => setOnlyAvailable((v) => !v)}
              className={`inline-flex items-center gap-2 border px-3.5 py-2 text-xs uppercase tracking-[0.15em] transition-colors cursor-pointer ${
                onlyAvailable
                  ? 'border-[#C6A77A] bg-[#C6A77A]/15 text-[#C6A77A]'
                  : 'border-[#F5F3EF]/15 text-[#F5F3EF]/75 hover:border-[#C6A77A]/50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>In Stock Only</span>
            </button>

            <label className="inline-flex items-center gap-2 text-xs text-[#F5F3EF]/70">
              <span className="uppercase tracking-[0.15em]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-[#121212] border border-[#F5F3EF]/15 px-3 py-2 text-xs text-[#F5F3EF] focus:border-[#C6A77A] focus:outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </label>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-96 bg-[#121212] border border-[#F5F3EF]/10 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-16 border border-[#F5F3EF]/12 bg-[#121212] px-6 py-16 text-center max-w-xl mx-auto">
            <p className="font-editorial text-2xl italic text-[#F5F3EF]">
              No matching essentials found.
            </p>
            <p className="mt-3 text-sm text-[#F5F3EF]/60">
              Try clearing your filters or searching with another keyword.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 bg-[#F5F3EF] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
