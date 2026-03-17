import type { DashboardActivity } from "@/lib/types/dashboard";

function formatActivityTime(isoTime: string) {
  const parsed = new Date(isoTime);
  if (Number.isNaN(parsed.getTime())) {
    return "刚刚";
  }

  return parsed.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentActivity({ activity }: { activity: DashboardActivity[] }) {
  if (activity.length === 0) {
    return <p className="text-gray-500 text-sm">还没有学习记录，快去完成第一题吧！</p>;
  }

  return (
    <div className="space-y-3">
      {activity.map((item, index) => (
        <div
          key={item.id}
          className={`flex justify-between items-center py-2 ${
            index !== activity.length - 1 ? "border-b" : ""
          }`}
        >
          <div>
            <p>{item.title}</p>
            <p className="text-gray-500 text-sm">{item.detail}</p>
          </div>
          <span className="text-gray-500 text-sm">{formatActivityTime(item.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
