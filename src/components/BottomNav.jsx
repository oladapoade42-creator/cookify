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
    <nav className="sticky bottom-0 z-30 bg-black/70 backdrop-blur-2xl border-t border-white/10 px-2 py-2">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 min-w-0 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 transition-all duration-200 backdrop-blur-xl ${
                isActive
                  ? 'bg-white/90 text-black shadow-[0_8px_24px_rgba(255,255,255,0.18)]'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="w-full truncate text-center text-[9px] font-bold uppercase tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

}
