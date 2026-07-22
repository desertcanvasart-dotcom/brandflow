'use client'

import { Users, Building2, ListChecks } from 'lucide-react'

interface TeamStatsBarProps {
  totalMembers: number
  departmentCount: number
  totalActiveTasks: number
}

export function TeamStatsBar({
  totalMembers,
  departmentCount,
  totalActiveTasks,
}: TeamStatsBarProps) {
  const items = [
    {
      icon: Users,
      label: 'Team Members',
      value: totalMembers,
      color: 'text-blue-500',
    },
    {
      icon: Building2,
      label: 'Departments',
      value: departmentCount,
      color: 'text-purple-500',
    },
    {
      icon: ListChecks,
      label: 'Active Tasks',
      value: totalActiveTasks,
      color: 'text-green-500',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <div className={`flex-shrink-0 ${item.color}`}>
            <item.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">
              {item.value.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
