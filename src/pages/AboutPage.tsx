import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import { usePageSeo } from '../utils/format';

export function AboutPage() {
  const { siteConfig } = useStore();

  usePageSeo({
    title: 'About Carry Theory — For Every Form',
    description:
      'Discover the story and design philosophy behind Carry Theory—everyday essentials built around refined materiality, functionality, and quiet permanence.',
    canonicalPath: '/about',
  });

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-[#F5F3EF] pt-28 pb-24">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#C6A77A]">
            Our Story
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl font-semibold uppercase tracking-[-0.015em]">
            FOR EVERY FORM.
          </h1>
          <p className="mt-5 font-editorial text-2xl sm:text-3xl italic text-[#F5F3EF]/85 leading-snug">
            “At Carry Theory, we believe the objects you reach for daily should feel calm, enduring, and effortlessly considered.”
          </p>
        </div>

        <div className="mt-12 overflow-hidden border border-[#F5F3EF]/12 aspect-[16/9] max-h-[560px]">
          <SafeImage
            src={siteConfig?.storyImage || '/src/assets/images/editorial_brand_story_1795586434801.jpg'}
            alt="Carry Theory studio workspace"
            loading="eager"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12 border-t border-[#F5F3EF]/12 pt-14">
          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.02em]">
              Designed Around Quiet Detail.
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-5 text-sm sm:text-base leading-relaxed text-[#F5F3EF]/72">
            <p>
              Carry Theory was created with a singular conviction: the essentials that accompany your mornings, commutes, and workspaces deserve the same architectural restraint as fine objects.
            </p>
            <p>
              From double-wall stainless tumblers and ergonomic travel mugs to matte ceramic coffee vessels, slim MagSafe wallets, and multifunctional desk clocks, every piece is shaped to eliminate visual noise while elevating tactile satisfaction.
            </p>
            <p>
              Whether chosen for your daily morning ritual or personalised at checkout as a thoughtful gift, Carry Theory brings consistency, utility, and timeless composure to every form.
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
