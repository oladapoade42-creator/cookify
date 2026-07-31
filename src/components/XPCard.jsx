import { Flame, Star } from "lucide-react";

export default function XPCard({
  xp,
  streak,
}) {
  return (

    <div className="bg-black text-white rounded-3xl p-6">

      <div className="flex justify-between">

        <div>

          <p className="text-gray-300">
            XP
          </p>

          <h2 className="text-4xl font-black">
            {xp}
          </h2>

        </div>

        <div className="text-right">

          <Flame className="text-orange-400 ml-auto"/>

          <p>
            {streak} Day Streak
          </p>

        </div>

      </div>

    </div>

  );
}