import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';

const NAV_LINKS = [
  { label: 'HOME', to: '/' },
  { label: 'SHOP', to: '/shop' },
  { label: 'CATEGORIES', to: '/#categories' },
  { label: 'ABOUT US', to: '/about' },
  { label: 'CONTACT', to: '/contact' },
];

export function Navbar() {
  const { siteConfig, cartCount, setCartOpen } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isHomepage = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 36);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.hash]);

  const handleNavClick = (to: string) => {
    if (to === '/#categories') {
      if (location.pathname === '/') {
        const el = document.getElementById('categories');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/#categories');
      }
      setMobileMenuOpen(false);
      return;
    }
    navigate(to);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const solidHeader = !isHomepage || scrolled || mobileMenuOpen || searchOpen;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          solidHeader
            ? 'bg-[#0B0B0B]/95 backdrop-blur-md border-b border-[#F5F3EF]/10'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
          {/* Left: Brand Logo */}
          <Link
            to="/"
            aria-label="Carry Theory Home"
            className="flex items-center shrink-0 focus-visible:outline-offset-4"
          >
            <BrandLogo
              logoUrl={siteConfig?.logoUrl}
              brandName={siteConfig?.brandName || 'Carry Theory'}
              imgClassName="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Center: Desktop Navigation */}
          <nav
            aria-label="Main navigation"
            className="hidden lg:flex items-center justify-center gap-7 xl:gap-9"
          >
            {NAV_LINKS.map((item) => {
              const active =
                item.to === '/'
                  ? location.pathname === '/' && !location.hash
                  : item.to === '/#categories'
                    ? location.pathname.startsWith('/collections')
                    : location.pathname === item.to;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavClick(item.to)}
                  data-active={active}
                  className="nav-link-underline text-[11px] font-medium uppercase tracking-[0.2em] text-[#F5F3EF]/85 hover:text-[#F5F3EF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Search & Cart */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search Carry Theory"
              className="flex h-10 w-10 items-center justify-center text-[#F5F3EF]/85 hover:text-[#C6A77A] transition-colors cursor-pointer"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Shopping bag with ${cartCount} items`}
              className="relative flex h-10 items-center gap-2 px-1 text-[#F5F3EF]/90 hover:text-[#C6A77A] transition-colors cursor-pointer"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.6} />
              <span className="tabular-nums text-xs font-medium tracking-wider text-[#C6A77A]">
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="flex lg:hidden h-10 w-10 items-center justify-center text-[#F5F3EF] hover:text-[#C6A77A] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Inline Search Drawer */}
        {searchOpen && (
          <div className="border-t border-[#F5F3EF]/10 bg-[#0B0B0B]/98 px-5 sm:px-8 lg:px-12 py-5">
            <form
              onSubmit={handleSearchSubmit}
              className="mx-auto flex max-w-3xl items-center gap-3 border-b border-[#C6A77A]/50 pb-2.5"
            >
              <Search className="h-4 w-4 text-[#C6A77A] shrink-0" />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tumblers, travel mugs, MagSafe wallets, digital clock..."
                className="w-full bg-transparent text-sm sm:text-base text-[#F5F3EF] placeholder:text-[#F5F3EF]/40 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] bg-[#F5F3EF] text-[#0B0B0B] hover:bg-[#C6A77A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-2 text-[#F5F3EF]/60 hover:text-[#F5F3EF] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Full-Screen Menu */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 z-30 bg-[#0B0B0B] pt-24 pb-10 px-6 flex flex-col justify-between lg:hidden overflow-y-auto"
        >
          <nav className="flex flex-col gap-1 border-t border-[#F5F3EF]/10 pt-6">
            {NAV_LINKS.map((item, idx) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item.to)}
                className="flex items-center justify-between py-4 border-b border-[#F5F3EF]/10 text-left text-base font-medium uppercase tracking-[0.2em] text-[#F5F3EF] hover:text-[#C6A77A] transition-colors cursor-pointer"
              >
                <span>{item.label}</span>
                <span className="tabular-nums text-xs text-[#C6A77A]/70">0{idx + 1}</span>
              </button>
            ))}
          </nav>

          <div className="pt-8 space-y-3 text-xs text-[#F5F3EF]/60">
            <p className="uppercase tracking-[0.22em] text-[#C6A77A]">For Every Form.</p>
            <p>WhatsApp Concierge: {siteConfig?.whatsappNumber || '+91 9742597425'}</p>
            <p>Instagram: {siteConfig?.instagramHandle || '@carrytheory.in'}</p>
          </div>
        </div>
      )}
    </>
  );
}
