import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import { usePageSeo } from '../utils/format';

export function AboutPage() {
  const { siteConfig } = useStore();

  usePageSeo({
    title: 'About Us — Carry Theory',
    description:
      'Everyday essentials, thoughtfully designed for every form of life. Founded by Kanishk, Pranav, Sayam, and Neel and backed by the Institute of Venture Building (IVB).',
    canonicalPath: '/about',
  });

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-24 sm:pt-28 pb-16 sm:pb-24">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
            Our Story
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl font-semibold uppercase tracking-[-0.015em]">
            FOR EVERY FORM.
          </h1>
          <p className="mt-4 sm:mt-5 font-editorial text-xl sm:text-3xl italic text-[#F5F3EF]/85 leading-snug">
            “Everyday essentials, thoughtfully designed for every form of life.”
          </p>
        </div>

        <div className="mt-8 sm:mt-12 overflow-hidden border border-[#F5F3EF]/12 aspect-[16/9] max-h-[560px]">
          <SafeImage
            src={
              siteConfig?.storyImage ||
              siteConfig?.heroImageUrl ||
              '/assets/aistudio/Warm_Studio_Still_Life_with_Tumblers_and_Mugs_2d1e9d8f.png'
            }
            alt="Carry Theory collection cover showcase"
            loading="eager"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="mt-10 sm:mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 border-t border-[#F5F3EF]/12 pt-10 sm:pt-14">
          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.02em]">
              About Us
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-5 text-sm sm:text-base leading-relaxed text-[#F5F3EF]/72">
            <p>
              Carry Theory is a lifestyle brand built around a simple idea - everyday essentials should be functional, stylish, and accessible. From drinkware to smart accessories, we bring together products that combine practicality, quality, and thoughtful design.
            </p>
            <p>
              Founded by Kanishk, Pranav, Sayam, and Neel, Carry Theory started with a shared passion for entrepreneurship and creating something of our own. What began as an idea has grown into a brand focused on delivering products that add value to people&apos;s everyday lives.
            </p>
            <p>
              Backed by the Institute of Venture Building (IVB), we are constantly learning, improving, and exploring new possibilities. Whether it&apos;s personal use, gifting, or customised corporate orders, our goal remains the same - to create products that fit seamlessly into different lifestyles.
            </p>

            <div className="pt-6 flex flex-wrap gap-4">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-[#F5F3EF] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B0B0B] hover:bg-[#C6A77A] transition-colors"
              >
                <span>Explore Collection</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 border border-[#F5F3EF]/35 px-7 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[#F5F3EF] hover:border-[#C6A77A] hover:text-[#C6A77A] transition-colors"
              >
                <span>Contact Us</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
