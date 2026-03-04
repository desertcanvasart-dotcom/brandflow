'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Video, Calendar, Clock, Users } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/trpc/client'
import { useDebounce } from '@/hooks/use-debounce'
import { MeetingCard } from '@/components/meetings/meeting-card'
import { ScheduleMeetingDialog } from '@/components/meetings/schedule-meeting-dialog'
import { MEETING_TYPE_LABELS, MEETING_STATUS_LABELS, MEETING_STATUS_COLORS } from '@/lib/constants'

export default function MeetingsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const { data: meetings, isLoading } = trpc.meeting.list.useQuery(
    statusFilter !== 'all'
      ? { status: statusFilter as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' }
      : undefined
  )

  const { data: upcoming } = trpc.meeting.upcoming.useQuery()

  return (
    <>
      <TopBar title="Meetings" />
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Meetings</h2>
            <p className="text-muted-foreground">
              Schedule and manage video meetings with your team and clients
            </p>
          </div>
          <Button onClick={() => setShowScheduleDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>

        {/* Upcoming Meetings */}
        {upcoming && upcoming.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              Upcoming
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((meeting: any) => (
                <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                  <Card className="transition-colors hover:bg-accent/50 border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <Video className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium truncate text-sm">{meeting.title}</h4>
                          {meeting.scheduled_at && (
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(meeting.scheduled_at).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(meeting.scheduled_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(MEETING_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Meeting List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-48 rounded bg-muted" />
                      <div className="h-4 w-32 rounded bg-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : meetings && meetings.length > 0 ? (
          <div className="space-y-3">
            {meetings.map((meeting: any) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
            <div className="text-center">
              <Video className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-lg font-medium mt-4">No meetings yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Schedule your first meeting to get started
              </p>
              <Button className="mt-4" onClick={() => setShowScheduleDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Meeting
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScheduleMeetingDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
      />
    </>
  )
}
