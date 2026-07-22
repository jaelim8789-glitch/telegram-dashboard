"use client";

import { Trophy, Medal } from "lucide-react";
import type { TopChatRoom } from "./mockData";

interface Top5TableProps {
  data: TopChatRoom[];
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-300" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center text-xs font-semibold text-app-text-muted">
      {rank}
    </span>
  );
}

export function Top5Table({ data }: Top5TableProps) {
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-app-card overflow-hidden">
      <div className="px-5 py-4 border-b border-app-border">
        <h3 className="text-sm font-semibold text-app-text">인기 채팅방 TOP5</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-app-border text-left">
              <th className="px-5 py-3 text-xs font-medium text-app-text-muted w-16">순위</th>
              <th className="px-5 py-3 text-xs font-medium text-app-text-muted">채팅방 이름</th>
              <th className="px-5 py-3 text-xs font-medium text-app-text-muted text-right">메시지 수</th>
              <th className="px-5 py-3 text-xs font-medium text-app-text-muted text-right">참여자</th>
              <th className="px-5 py-3 text-xs font-medium text-app-text-muted text-right">증감률</th>
            </tr>
          </thead>
          <tbody>
            {data.map((room, index) => (
              <tr
                key={room.rank}
                className={`border-b border-app-border/50 last:border-b-0 ${
                  index % 2 === 1 ? "bg-app-card-hover/50" : ""
                }`}
              >
                <td className="px-5 py-3.5">
                  <RankIcon rank={room.rank} />
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-app-text">{room.name}</td>
                <td className="px-5 py-3.5 text-sm text-app-text text-right tabular-nums">
                  {room.messages.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-sm text-app-text text-right tabular-nums">
                  {room.participants.toLocaleString()}
                </td>
                <td className={`px-5 py-3.5 text-sm text-right tabular-nums font-medium ${
                  room.change >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {room.change >= 0 ? "+" : "-"}
                  {Math.abs(room.change)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
