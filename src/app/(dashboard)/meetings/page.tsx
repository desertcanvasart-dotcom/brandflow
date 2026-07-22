'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Video,
  Calendar,
  Clock,
  Users,
  ExternalLink,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useDebounce } from '@/hooks/use-debounce'
import { useCurrentUser } from '@/hooks/use-current-user'
import { MeetingCard, type EnrichedMeeting } from '@/components/meetings/meeting-card'
import { ScheduleMeetingDialog } from '@/components/meetings/schedule-meeting-dialog'
import { EditMeetingDialog } from '@/components/meetings/edit-meeting-dialog'
import {
  MEETING_TYPE_LABELS,
  MEETING_STATUS_LABELS,
  MEETING_STATUS_COLORS,
} from '@/lib/constants'
import { toast } from 'sonner'

export default function MeetingsPage() {
  const { user } = useCurrentUser()
  const utils = trpc.useUtils()

  // ─── Filter state ──────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editMeeting, setEditMeeting] = useState<EnrichedMeeting | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  // ─── Query input (server-side filters) ─────────────
  const queryInput = useMemo(() => {
    const input: {
      status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      brandId?: string
      dateFrom?: string
      dateTo?: string
    } = {}
    if (statusFilter !== 'all')
      input.status = statusFilter as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
    if (brandFilter !== 'all') input.brandId = brandFilter
    if (dateFrom) input.dateFrom = dateFrom
    if (dateTo) input.dateTo = dateTo
    return Object.keys(input).length > 0 ? input : undefined
  }, [statusFilter, brandFilter, dateFrom, dateTo])

  // ─── Data fetching ─────────────────────────────────
  const { data: meetings, isLoading } = trpc.meeting.list.useQuery(queryInput)
  const { data: upcoming } = trpc.meeting.upcoming.useQuery()
  const { data: brands } = trpc.brand.list.useQuery()
  const { data: members } = trpc.member.list.useQuery()

  // ─── Member lookup map ─────────────────────────────
  const memberMap = useMemo(() => {
    const map = new Map<string, { display_name: string | null }>()
    for (const m of members ?? []) {
      map.set(m.user_id, { display_name: m.display_name })
    }
    return map
  }, [members])

  // ─── Stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    const all = meetings ?? []
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const upcomingCount = all.filter(
      (m) => m.status === 'scheduled' && new Date(m.scheduled_at) > now
    ).length

    const completedThisWeek = all.filter(
      (m) => m.status === 'completed' && new Date(m.updated_at) >= startOfWeek
    ).length

    const pendingNotes = all.filter(
      (m) => m.status === 'completed' && !m.summary && !m.transcript
    ).length

    return { upcomingCount, completedThisWeek, pendingNotes }
  }, [meetings])

  // ─── Client-side filtering (search + type) ─────────
  const filteredMeetings = useMemo(() => {
    let result = meetings ?? []

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.brands?.name?.toLowerCase().includes(q) ||
          m.projects?.name?.toLowerCase().includes(q)
      )
    }

    if (typeFilter !== 'all') {
      result = result.filter((m) => m.meeting_type === typeFilter)
    }

    return result
  }, [meetings, debouncedSearch, typeFilter])

  // ─── Group meetings by time ────────────────────────
  const meetingGroups = useMemo(() => {
    if (!filteredMeetings.length) return []

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + (6 - now.getDay()))
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0]

    const buckets = {
      today: [] as typeof filteredMeetings,
      tomorrow: [] as typeof filteredMeetings,
      thisWeek: [] as typeof filteredMeetings,
      upcoming: [] as typeof filteredMeetings,
      earlier: [] as typeof filteredMeetings,
    }

    for (const m of filteredMeetings) {
      const dateStr = m.scheduled_at.split('T')[0]
      if (dateStr === todayStr) buckets.today.push(m)
      else if (dateStr === tomorrowStr) buckets.tomorrow.push(m)
      else if (dateStr > tomorrowStr && dateStr <= endOfWeekStr) buckets.thisWeek.push(m)
      else if (dateStr > endOfWeekStr) buckets.upcoming.push(m)
      else buckets.earlier.push(m)
    }

    const groups: { label: string; meetings: typeof filteredMeetings }[] = []
    if (buckets.today.length) groups.push({ label: 'Today', meetings: buckets.today })
    if (buckets.tomorrow.length) groups.push({ label: 'Tomorrow', meetings: buckets.tomorrow })
    if (buckets.thisWeek.length) groups.push({ label: 'This Week', meetings: buckets.thisWeek })
    if (buckets.upcoming.length) groups.push({ label: 'Upcoming', meetings: buckets.upcoming })
    if (buckets.earlier.length) groups.push({ label: 'Earlier', meetings: buckets.earlier })

    return groups
  }, [filteredMeetings])

  // ─── Mutations ─────────────────────────────────────
  const cancelMutation = trpc.meeting.updateStatus.useMutation({
    onSuccess: () => {
      utils.meeting.list.invalidate()
      utils.meeting.upcoming.invalidate()
      toast.success('Meeting cancelled')
    },
    onError: (err) => toast.error(err.message),
  })

  // ─── Action handlers ──────────────────────────────
  function handleEdit(meeting: EnrichedMeeting) {
    setEditMeeting(meeting)
    setShowEditDialog(true)
  }

  function handleCancel(meetingId: string) {
    cancelMutation.mutate({ id: meetingId, status: 'cancelled' })
  }

  return (
    <>
      <TopBar title="Meetings" />
      <div className="flex flex-col gap-6 p-6">
        {/* ─── Header with stats ─────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Meetings</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  Upcoming:{' '}
                  <span className="font-semibold text-foreground">{stats.upcomingCount}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  Completed this week:{' '}
                  <span className="font-semibold text-foreground">{stats.completedThisWeek}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  Pending notes:{' '}
                  <span className="font-semibold text-foreground">{stats.pendingNotes}</span>
                </span>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowScheduleDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>

        {/* ─── Upcoming meetings ─────────────────────── */}
        {upcoming && upcoming.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              Next Up
              <span className="ml-2 text-xs font-normal">({upcoming.length})</span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((meeting: any) => (
                <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                  <Card className="transition-all hover:shadow-md hover:-translate-y-0.5 border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <Video className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate text-sm">{meeting.title}</h4>
                          {meeting.brands?.name && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {meeting.brands.name}
                              {meeting.projects?.name && ` › ${meeting.projects.name}`}
                            </p>
                          )}
                          {meeting.scheduled_at && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>
                            {meeting.meeting_participants?.length ?? 0} participant
                            {(meeting.meeting_participants?.length ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Join
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─── Filters ───────────────────────────────── */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(MEETING_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
            placeholder="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
            placeholder="To"
          />
        </div>

        {/* ─── Meeting list ──────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-48 rounded bg-muted" />
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-64 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMeetings.length > 0 ? (
          <div className="space-y-6">
            {meetingGroups.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                  {group.label}
                  <span className="ml-2 text-xs font-normal">({group.meetings.length})</span>
                </h3>
                <div className="space-y-3">
                  {group.meetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      memberMap={memberMap}
                      currentUserId={user?.id ?? ''}
                      onEdit={handleEdit}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-16 text-center">
            <Video className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-semibold">No meetings scheduled</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Schedule a meeting with your team or clients to collaborate and align on your
              projects.
            </p>
            <Button className="mt-4" onClick={() => setShowScheduleDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Your First Meeting
            </Button>
          </div>
        )}
      </div>

      {/* ─── Dialogs ─────────────────────────────────── */}
      <ScheduleMeetingDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
      />

      {editMeeting && (
        <EditMeetingDialog
          open={showEditDialog}
          onOpenChange={(v) => {
            setShowEditDialog(v)
            if (!v) setEditMeeting(null)
          }}
          meeting={editMeeting}
        />
      )}
    </>
  )
}
