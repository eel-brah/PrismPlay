import { useEffect, useState } from "react";
import { apiGetGlobalLeaderboard, getStoredToken } from "@/api";

type Entry = {
  userId: number;
  username: string;
  avatarUrl: string | null;
  games: number;
  wins: number;
  totalKills: number;
  bestMass: number;
  score: number;
};

export default function AgarioLeaderboard() {
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    apiGetGlobalLeaderboard(token)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-white">
        <h1 className="text-4xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Leaderboard
        </h1>

        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.05] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">

      <h1 className="text-4xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
        Leaderboard
      </h1>

      {/* PODIUM */}
      {top3.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
          {top3.map((p, i) => (
            <div
              key={p.userId}
              className={`
              relative rounded-xl p-4 text-center backdrop-blur-xl border border-white/10
              bg-white/[0.04] hover:bg-white/[0.06] transition-all hover:-translate-y-1
              `}
            >

              <img
                src={p.avatarUrl || "/default-avatar.png"}
                className={`
                w-14 h-14 rounded-full mx-auto mb-2 border
                ${i === 0 ? "border-purple-400/70" : "border-white/20"}
                `}
              />

              <div className="text-sm font-semibold text-gray-200 truncate">
                {p.username}
              </div>

              {/* main score */}
              <div className="mt-2 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {p.score}
              </div>
              <div className="text-[11px] text-gray-400 tracking-wide">SCORE</div>

              {/* stats */}
              <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-300">
                <div>Wins {p.wins}</div>
                <div>Kills {p.totalKills}</div>
                <div>Mass {p.bestMass}</div>
                <div>Games {p.games}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE */}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-xl">

        {/* HEADER */}
        <div className="grid grid-cols-12 bg-gradient-to-r from-white/[0.06] to-white/[0.02] px-4 py-3 text-sm font-medium text-gray-300 tracking-wide">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-3">Player</div>
          <div className="col-span-2 text-center">Wins</div>
          <div className="col-span-2 text-center">Kills</div>
          <div className="col-span-2 text-center">Top Mass</div>
          <div className="col-span-1 text-center">Games</div>
          <div className="col-span-1 text-right">Score</div>
        </div>

        {/* ROWS */}
        {rest.map((p, i) => (
          <div
            key={p.userId}
            className="grid grid-cols-12 px-4 py-3 items-center border-t border-white/5 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 transition-colors"
          >
            <div className="col-span-1 text-center font-semibold text-white-500">
              #{i + 4}
            </div>

            <div className="col-span-3 flex items-center gap-3">
              <img
                src={p.avatarUrl || "/default-avatar.png"}
                className="w-9 h-9 rounded-full border border-white/10"
              />
              <span className="font-semibold text-gray-200 truncate">
                {p.username}
              </span>
            </div>

            <div className="col-span-2 text-center text-green-400 font-medium">{p.wins}</div>
            <div className="col-span-2 text-center text-red-400 font-medium">{p.totalKills}</div>
            <div className="col-span-2 text-center text-cyan-400 font-medium">{p.bestMass}</div>
            <div className="col-span-1 text-center text-gray-400">{p.games}</div>

            <div className="col-span-1 text-right font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {p.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// import { useEffect, useState } from "react";
// import { apiGetGlobalLeaderboard, getStoredToken } from "@/api";
//
// type Entry = {
//   userId: number;
//   username: string;
//   avatarUrl: string | null;
//   games: number;
//   wins: number;
//   totalKills: number;
//   bestMass: number;
//   score: number;
// };
//
// export default function AgarioLeaderboard() {
//   const [data, setData] = useState<Entry[]>([]);
//   const [loading, setLoading] = useState(true);
//
//   useEffect(() => {
//     const token = getStoredToken();
//     if (!token) return;
//
//     apiGetGlobalLeaderboard(token)
//       .then(setData)
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, []);
//
//   if (loading) {
//     return (
//       <div className="max-w-5xl mx-auto p-6 text-white">
//         <h1 className="text-4xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
//           Leaderboard
//         </h1>
//
//         <div className="space-y-3">
//           {Array.from({ length: 10 }).map((_, i) => (
//             <div key={i} className="h-14 rounded-xl bg-gray-800/60 animate-pulse" />
//           ))}
//         </div>
//       </div>
//     );
//   }
//
//   const top3 = data.slice(0, 3);
//   const rest = data.slice(3);
//
//   return (
//     <div className="max-w-5xl mx-auto p-6 text-white">
//
//       <h1 className="text-4xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
//         Leaderboard
//       </h1>
//
//       {/* PODIUM */}
//       {top3.length > 0 && (
//         <div className="grid md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
//           {top3.map((p, i) => (
//             <div
//               key={p.userId}
//               className="
//               relative rounded-xl p-4 text-center border border-white/10
//               bg-gradient-to-b from-gray-800/70 to-gray-900/90
//               hover:from-gray-800 hover:to-gray-900
//               transition-all hover:-translate-y-1
//               "
//             >
//               <img
//                 src={p.avatarUrl || "/default-avatar.png"}
//                 className={`
//                 w-14 h-14 rounded-full mx-auto mb-2 border
//                 ${i === 0 ? "border-purple-400/80" : "border-white/15"}
//                 `}
//               />
//
//               <div className="text-sm font-semibold text-gray-200 truncate">
//                 {p.username}
//               </div>
//
//               <div className="mt-2 text-2xl font-bold text-purple-300">
//                 {p.score}
//               </div>
//               <div className="text-[11px] text-gray-500 tracking-wide">SCORE</div>
//
//               <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-400">
//                 <div>Wins {p.wins}</div>
//                 <div>Kills {p.totalKills}</div>
//                 <div>Mass {p.bestMass}</div>
//                 <div>Games {p.games}</div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//
//       {/* TABLE */}
//       <div className="rounded-2xl overflow-hidden border border-white/10 bg-gray-900/80 backdrop-blur">
//
//         {/* HEADER */}
//         <div className="grid grid-cols-12 bg-gray-800/70 px-4 py-3 text-sm font-medium text-gray-300 tracking-wide">
//           <div className="col-span-1 text-center">#</div>
//           <div className="col-span-3">Player</div>
//           <div className="col-span-2 text-center">Wins</div>
//           <div className="col-span-2 text-center">Kills</div>
//           <div className="col-span-2 text-center">Top Mass</div>
//           <div className="col-span-1 text-center">Games</div>
//           <div className="col-span-1 text-right">Score</div>
//         </div>
//
//         {/* ROWS */}
//         {rest.map((p, i) => (
//           <div
//             key={p.userId}
//             className="grid grid-cols-12 px-4 py-3 items-center border-t border-white/5 hover:bg-purple-500/10 transition-colors"
//           >
//             <div className="col-span-1 text-center font-semibold text-gray-500">
//               #{i + 4}
//             </div>
//
//             <div className="col-span-3 flex items-center gap-3">
//               <img
//                 src={p.avatarUrl || "/default-avatar.png"}
//                 className="w-9 h-9 rounded-full border border-white/10"
//               />
//               <span className="font-semibold text-gray-200 truncate">
//                 {p.username}
//               </span>
//             </div>
//
//             <div className="col-span-2 text-center text-green-300 font-medium">{p.wins}</div>
//             <div className="col-span-2 text-center text-red-300 font-medium">{p.totalKills}</div>
//             <div className="col-span-2 text-center text-blue-300 font-medium">{p.bestMass}</div>
//             <div className="col-span-1 text-center text-gray-400">{p.games}</div>
//
//             <div className="col-span-1 text-right font-bold text-purple-300">
//               {p.score}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
