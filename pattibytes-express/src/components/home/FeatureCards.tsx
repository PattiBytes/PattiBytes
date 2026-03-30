import { ShoppingBag, Truck, Store, Shield, Star, Clock } from 'lucide-react';

const CARDS = [
  {
    gradient: 'from-orange-500 to-pink-500',
    Icon: ShoppingBag,
    title: 'Order easily',
    desc: 'Browse menus and place orders in seconds on mobile or desktop.',
  },
  {
    gradient: 'from-blue-500 to-purple-500',
    Icon: Truck,
    title: 'Fast delivery',
    desc: 'Reliable delivery partners with real-time tracking.',
  },
  {
    gradient: 'from-green-500 to-teal-500',
    Icon: Store,
    title: 'Support local',
    desc: 'Every order supports local restaurants and cafes in Patti.',
  },
  {
    gradient: 'from-yellow-500 to-orange-500',
    Icon: Star,
    title: 'Verified partners',
    desc: 'All merchants are verified before joining our platform.',
  },
  {
    gradient: 'from-pink-500 to-rose-500',
    Icon: Shield,
    title: 'Secure payments',
    desc: 'Your payment info is encrypted and never stored on our servers.',
  },
  {
    gradient: 'from-purple-500 to-indigo-500',
    Icon: Clock,
    title: 'Order history',
    desc: 'Reorder your favourites in one tap from your order history.',
  },
];

export default function FeatureCards() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-16 pb-6">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8 text-center">
        Why Pattibytes?
      </h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {CARDS.map(({ gradient, Icon, title, desc }) => (
          <div
            key={title}
            className="bg-white/90 backdrop-blur rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-sm`}>
              <Icon className="text-white" size={22} />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
            <p className="text-gray-600 mt-1 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}