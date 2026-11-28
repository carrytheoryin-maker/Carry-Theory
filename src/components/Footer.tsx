import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../utils/format';
import { BrandLogo } from './BrandLogo';

export function Footer() {
  const { siteConfig, categories } = useStore();
  const whatsappNumbers = siteConfig?.whatsappNumbers?.length
    ? siteConfig.whatsappNumbers
    : ['+91 9742597425', '+91 7300004000', '+91 9840439931'];
  const instagram = siteConfig?.instagramHandle || '@carrytheory.shop';
  const email = siteConfig?.contactEmail || 'carrytheoryin@gmail.com';

  return (
    <footer className="bg-[#0B0B0B] border-t border-[#C6A77A]/25 text-[#F5F3EF]">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <BrandLogo
                logoUrl={siteConfig?.logoUrl}
                brandName={siteConfig?.brandName || 'Carry Theory'}
                imgClassName="h-8 w-auto object-contain"
              />
            </Link>
            <p className="font-editorial text-xl italic text-[#C6A77A]">
              {siteConfig?.tagline || 'For Every Form.'}
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-[#F5F3EF]/60">
              Premium essentials for everyday living.
            </p>
          </div>

          {/* Column 2: Explore */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C6A77A]">
              Explore
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-[#F5F3EF]/75">
              <li>
                <Link to="/shop" className="hover:text-[#C6A77A] transition-colors">
                  Shop All
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/collections/${cat.slug}`}
                    className="hover:text-[#C6A77A] transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Customer Care */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C6A77A]">
              Customer Care
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-[#F5F3EF]/75">
              <li>
                <Link to="/contact" className="hover:text-[#C6A77A] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/policies/shipping" className="hover:text-[#C6A77A] transition-colors">
                  Shipping Information
                </Link>
              </li>
              <li>
                <Link to="/policies/replacement" className="hover:text-[#C6A77A] transition-colors">
                  Replacement Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/privacy" className="hover:text-[#C6A77A] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/terms" className="hover:text-[#C6A77A] transition-colors">
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C6A77A]">
              Connect
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-[#F5F3EF]/75">
              <li>
                <a
                  href={`https://www.instagram.com/${instagram.replace(/^@/, '')}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#C6A77A] transition-colors"
                >
                  Instagram — {instagram}
                </a>
              </li>
              {whatsappNumbers.map((num) => (
                <li key={num}>
                  <a
                    href={buildWhatsAppUrl(num, 'Hello Carry Theory, I would like to know more about your collection.')}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#C6A77A] transition-colors"
                  >
                    WhatsApp — {num}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${email}`}
                  className="hover:text-[#C6A77A] transition-colors"
                >
                  Email — {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-[#C6A77A]/20 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F5F3EF]/50">
          <p>© Carry Theory. All Rights Reserved.</p>
          <p className="tracking-[0.18em] uppercase text-[#C6A77A]/70">
            For Every Form.
          </p>
        </div>
      </div>
    </footer>
  );
}
