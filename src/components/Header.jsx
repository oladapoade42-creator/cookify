import { Crown } from "lucide-react";

export default function Header({
  title,
  isPremium,
}) {
  return (
    <header className="flex justify-between items-center p-5 bg-white border-b">

      <div>

        <h1 className="text-3xl font-black">
          {title}
        </h1>

        <p className="text-gray-500">
          Welcome back 👋
        </p>

      </div>

      {isPremium && (
        <div className="bg-black text-white px-4 py-2 rounded-full flex items-center gap-2">
          <Crown size={18}/>
          PRO
        </div>
      )}

    </header>
  );
}