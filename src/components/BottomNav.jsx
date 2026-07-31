import {
  House,
  BookOpen,
  Sparkles,
  User,
  UtensilsCrossed
} from "lucide-react";

export default function BottomNav({
  activeTab,
  setActiveTab,
}) {

  const tabs = [
    { id: "home", icon: House, label: "Feed" },
    { id: "learn", icon: BookOpen, label: "Learn" },
    { id: "restaurant", icon: UtensilsCrossed, label: "E-Food" },
    { id: "ai", icon: Sparkles, label: "AI" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="sticky bottom-0 z-30 bg-black/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 rounded-[22px] px-3 py-2 transition-all duration-200 ${
                activeTab === tab.id ? 'bg-white text-black shadow-[0_12px_34px_rgba(255,255,255,0.18)]' : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] uppercase tracking-[0.35em] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

}