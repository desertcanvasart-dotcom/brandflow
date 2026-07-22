import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Calendar,
  Video,
  Bot,
  Settings,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Building2, label: "Brands" },
  { icon: FolderKanban, label: "Projects" },
  { icon: Calendar, label: "Calendar" },
  { icon: Video, label: "Meetings" },
  { icon: Bot, label: "AI Agents" },
  { icon: Settings, label: "Settings" },
];

const stats = [
  {
    label: "Total Brands",
    value: "12",
    color: "from-indigo-500/20 to-indigo-600/20",
    textColor: "from-indigo-400 to-indigo-300",
  },
  {
    label: "Active Projects",
    value: "8",
    color: "from-purple-500/20 to-purple-600/20",
    textColor: "from-purple-400 to-purple-300",
  },
  {
    label: "Tasks In Progress",
    value: "24",
    color: "from-cyan-500/20 to-cyan-600/20",
    textColor: "from-cyan-400 to-cyan-300",
  },
  {
    label: "Team Members",
    value: "6",
    color: "from-emerald-500/20 to-emerald-600/20",
    textColor: "from-emerald-400 to-emerald-300",
  },
];

const tasks = [
  {
    status: "#6366F1",
    name: "Homepage redesign wireframes",
    platform: "Web",
    platformColor: "bg-indigo-500/20 text-indigo-400",
    assignee: "AK",
  },
  {
    status: "#A855F7",
    name: "Instagram carousel — Q1 campaign",
    platform: "Instagram",
    platformColor: "bg-purple-500/20 text-purple-400",
    assignee: "SM",
  },
  {
    status: "#10B981",
    name: "Blog post: AI in marketing",
    platform: "Blog",
    platformColor: "bg-emerald-500/20 text-emerald-400",
    assignee: "JD",
  },
  {
    status: "#818CF8",
    name: "Brand guidelines PDF update",
    platform: "Docs",
    platformColor: "bg-indigo-500/20 text-indigo-300",
    assignee: "LR",
  },
  {
    status: "#06B6D4",
    name: "Twitter thread — product launch",
    platform: "Twitter",
    platformColor: "bg-cyan-500/20 text-cyan-400",
    assignee: "AK",
  },
];

const chartBars = [40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 68];

export function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-xl">
      <div className="flex h-[440px] bg-[#0B0F1A] text-white">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 border-r border-white/5 bg-[#0D1117] sm:block">
          <div className="p-3">
            <img src="/logo.png" alt="Agency Beats" className="h-6 w-auto rounded-sm" />
          </div>
          <nav className="space-y-0.5 px-2">
            {navItems.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs ${
                  item.active
                    ? "bg-indigo-500/10 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <item.icon className="size-3.5" />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 sm:px-5">
            <h2 className="text-sm font-semibold text-gray-200">Dashboard</h2>
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
            </div>
          </div>

          <div className="space-y-3 p-3 sm:p-5">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-lg bg-gradient-to-br ${stat.color} border border-white/5 p-2.5`}
                >
                  <p className="text-[10px] font-medium text-gray-500">
                    {stat.label}
                  </p>
                  <p
                    className={`mt-0.5 bg-gradient-to-r ${stat.textColor} bg-clip-text text-xl font-bold text-transparent`}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-5">
              {/* Recent Tasks */}
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2.5 lg:col-span-3">
                <h3 className="mb-2 text-xs font-semibold text-gray-400">
                  Recent Tasks
                </h3>
                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <div
                      key={task.name}
                      className="flex items-center gap-3 rounded-md bg-white/[0.02] px-2.5 py-1.5"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: task.status }}
                      />
                      <span className="flex-1 truncate text-xs text-gray-300">
                        {task.name}
                      </span>
                      <span
                        className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline-block ${task.platformColor}`}
                      >
                        {task.platform}
                      </span>
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-gray-400">
                        {task.assignee}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2.5 lg:col-span-2">
                <h3 className="mb-2 text-xs font-semibold text-gray-400">
                  Activity
                </h3>
                <div className="flex h-32 items-end gap-1.5">
                  {chartBars.map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/80 to-purple-500/80"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[9px] text-gray-600">
                  <span>Jan</span>
                  <span>Mar</span>
                  <span>Jun</span>
                  <span>Sep</span>
                  <span>Dec</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
