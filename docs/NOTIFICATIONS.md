# Notification System

Agency Beats ships a multi-channel, real-time notification system with 5 delivery channels, 7 event types, user-level preferences, and a full suite of advanced features.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Delivery Channels](#delivery-channels)
- [Event Types](#event-types)
- [Core Flow](#core-flow)
- [Notification Grouping](#notification-grouping)
- [Search & Filtering](#search--filtering)
- [Quiet Hours / Do Not Disturb](#quiet-hours--do-not-disturb)
- [Digest Mode](#digest-mode)
- [Auto-Archival & Retention](#auto-archival--retention)
- [In-Notification Actions](#in-notification-actions)
- [Analytics & Tracking](#analytics--tracking)
- [Database Schema](#database-schema)
- [tRPC API Reference](#trpc-api-reference)
- [Cron Jobs](#cron-jobs)
- [Environment Variables](#environment-variables)
- [File Map](#file-map)
- [UI Components](#ui-components)
- [Integration Setup Guides](#integration-setup-guides)

---

## Architecture Overview

```
                         createNotification()
                                │
                    ┌───────────┼───────────────┐
                    ▼           ▼               ▼
             Check Prefs    Insert Row    Check Quiet Hours
             (5 channels)   (in-app)      (timezone-aware)
                    │                          │
                    │     ┌────────────────┐   │
                    │     │  Quiet Time?   │◄──┘
                    │     └───┬──────┬─────┘
                    │     No  │      │ Yes
                    │         ▼      ▼
                    │    dispatch  queueForLater()
                    │    Channels  (notification_queue)
                    │         │
              ┌─────┴─────────┼──────────────┐
              ▼         ▼     ▼       ▼      ▼
           In-App    Email   Push   Slack  Webhook
              │         │     │       │      │
              ▼         ▼     ▼       ▼      ▼
          (already   Resend  VAPID  Block   HMAC
          inserted)   API    Kit    Kit    SHA-256
                                           + retry
              └─────────┴─────┴───────┴──────┘
                              │
                        trackEvent()
                     (notification_events)
```

The system follows a **fire-and-forget** pattern: the notification row is always inserted first (for in-app display), then other channels are dispatched concurrently via `Promise.allSettled`. Channel failures don't block each other.

---

## Delivery Channels

| Channel | Description | Configuration |
|---------|-------------|---------------|
| **In-App** | Real-time via Supabase Realtime subscriptions | Always enabled, immediate |
| **Email** | Transactional emails via Resend | Per-event toggle, supports digest mode |
| **Web Push** | Native browser notifications via VAPID/Web Push | Per-event toggle, requires user permission |
| **Slack** | Messages to Slack channels via incoming webhooks | Admin configures webhook URL, Block Kit format |
| **Webhook** | HTTP POST to custom endpoints with HMAC signing | Admin configures URL + secret, per-event filtering |

### Channel Preference Matrix

Each user can toggle each channel on/off independently for every event type via Settings > Notification Preferences. Defaults: all channels enabled.

---

## Event Types

| Type | Label | Trigger |
|------|-------|---------|
| `task_assigned` | Task Assigned | A task is assigned to a user |
| `task_status_changed` | Task Status Changed | A task's status transitions |
| `comment_added` | Comment Added | A new comment is posted on a task |
| `due_date_approaching` | Due Date Approaching | A task's due date is within 24h (cron-driven) |
| `content_scheduled` | Content Scheduled | Content is scheduled for publishing |
| `content_published` | Content Published | Content is published to a platform |
| `meeting_starting` | Meeting Starting | A meeting is about to begin |

---

## Core Flow

### Creating a Notification

```typescript
import { createNotification } from '@/lib/notifications/create'

await createNotification({
  supabase,                         // SupabaseClient instance
  orgId: 'org_uuid',                // Organization ID
  recipientUserId: 'user_uuid',     // Who receives it
  actorId: 'actor_uuid',            // Who triggered it
  type: 'task_assigned',            // NotificationType
  title: 'New task assigned',       // Short title
  body: 'Design homepage mockup',   // Optional detail text
  link: '/projects/abc/tasks/xyz',  // Optional in-app link
  metadata: {                       // Optional key-value data
    taskTitle: 'Design homepage mockup',
    projectName: 'Website Redesign',
    actorName: 'Jane Doe',
  },
  groupKey: 'assignment:task_xyz',  // Optional grouping key
  actionType: 'approve_task',       // Optional in-notification action
  actionPayload: { task_id: 'xyz' },// Params for the action
})
```

### Bulk Notifications

```typescript
import { createNotifications } from '@/lib/notifications/create'

await createNotifications({
  ...params,
  recipientUserIds: ['user1', 'user2', 'user3'],
})
```

Self-notifications (actor === recipient) are automatically suppressed.

### Channel Dispatch Pipeline

1. **Preference Check** - Query `notification_preferences` for the recipient's per-event channel toggles
2. **Digest Check** - If `digest_frequency !== 'none'`, skip immediate email (digest cron handles it)
3. **Insert Row** - Always insert into `notifications` table (in-app channel)
4. **Quiet Hours Check** - If active, queue non-in-app channels via `notification_queue`
5. **Dispatch** - `dispatchToChannels()` fires all enabled channels concurrently
6. **Track** - Each channel delivery records a `delivered` or `failed` event in `notification_events`

---

## Notification Grouping

Related notifications are collapsed using a `group_key` convention:

| Pattern | Example | Use Case |
|---------|---------|----------|
| `comment:{task_id}` | `comment:abc-123` | Multiple comments on the same task |
| `status:{task_id}` | `status:abc-123` | Status changes on the same task |
| `assignment:{task_id}` | `assignment:abc-123` | Assignment changes on the same task |

When the `list` query is called with `grouped: true`:
- Notifications sharing the same `group_key` are collapsed
- The most recent notification becomes the representative
- A `groupCount` field indicates how many are in the group
- UI displays "3 new comments on Task X" with expandable detail

---

## Search & Filtering

The `search` tRPC endpoint supports:

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string?` | Full-text search across `title` and `body` fields |
| `types` | `string[]?` | Filter by notification type(s) |
| `dateFrom` | `string?` | ISO date lower bound |
| `dateTo` | `string?` | ISO date upper bound |
| `isRead` | `boolean?` | Filter by read/unread status |
| `isArchived` | `boolean?` | Filter archived vs active |

A GIN index on `to_tsvector('english', title || ' ' || COALESCE(body, ''))` powers fast text search. The API uses `ilike` for broad matching with automatic cursor-based pagination.

---

## Quiet Hours / Do Not Disturb

Users configure a "Do Not Disturb" window in Settings:

- **Start/End Time** - e.g., 22:00 to 08:00 (supports overnight ranges)
- **Timezone** - User's local timezone (dropdown with common zones)
- **Toggle** - Enable/disable without losing the configuration

### How It Works

1. When a notification is created, `checkQuietHours()` is called
2. The current time is converted to the user's timezone
3. If within the quiet window, non-in-app channels are queued
4. In-app notifications are always delivered immediately
5. The `process-queue` cron (every 15 minutes) dispatches queued items when `deliver_after` is reached

### Queue Processing

The `notification_queue` table stores deferred deliveries:

```
{ notification_id, channels: ['email', 'push', 'slack'], deliver_after: '2024-01-15T08:00:00Z' }
```

The cron at `/api/cron/process-queue` picks up items where `deliver_after <= now()` and `is_processed = false`, dispatches them, then marks them processed.

---

## Digest Mode

Instead of receiving individual emails, users can opt into a periodic email digest:

| Frequency | When Sent | Content |
|-----------|-----------|---------|
| `none` | N/A | Individual emails sent immediately |
| `daily` | 8:00 AM UTC daily | All notifications from the past 24 hours |
| `weekly` | 8:00 AM UTC Mondays | All notifications from the past 7 days |

### Digest Email Structure

- Branded header with "Agency Beats" branding
- Summary count ("12 notifications since your last digest")
- Grouped by notification type, sorted by count (highest first)
- Up to 5 items shown per group, with "...and X more" for overflow
- Each item links back to the relevant page in the app
- "View All Notifications" CTA button
- Footer with settings link

### How It Works

1. When `digest_frequency !== 'none'`, immediate email delivery is skipped
2. The `compileDigest()` function queries unread notifications since the last digest
3. `buildDigestEmailHtml()` generates a responsive HTML email
4. Digest cron at `/api/cron/digest` runs daily, compiling and sending via Resend
5. Weekly digests only compile on Mondays

---

## Auto-Archival & Retention

Automated lifecycle management via the `/api/cron/archive` endpoint:

| Rule | Action | Timing |
|------|--------|--------|
| **Auto-Archive** | Notifications > 30 days old are archived | Daily cron |
| **Hard Delete** | Archived notifications > 90 days old are permanently deleted | Daily cron |
| **Queue Cleanup** | Processed queue items > 7 days old are removed | Daily cron |

### Manual Archive

Users can also manually archive/unarchive notifications:
- **Archive**: Moves to the "Archived" tab, removes from main list
- **Unarchive**: Restores back to the main notification list

The Notifications page has 3 tabs: **All**, **Unread** (with badge count), and **Archived**.

---

## In-Notification Actions

Notifications can carry embedded actions that users execute directly from the notification:

| Action Type | Label | Effect |
|-------------|-------|--------|
| `approve_task` | Approve | Sets task status to `approved` |
| `reject_task` | Reject | Sets task status to `in_progress` |
| `mark_complete` | Complete | Sets task status to `done` |
| `acknowledge` | Acknowledge | Marks notification as read only |

### How It Works

1. When creating a notification, pass `actionType` and `actionPayload`:
   ```typescript
   actionType: 'approve_task',
   actionPayload: { task_id: 'xyz-123' }
   ```
2. The notification item renders inline action buttons
3. When clicked, `executeAction` mutation is called
4. The action handler reads the payload, performs the DB update, and marks `action_taken = true`
5. Once taken, action buttons are replaced with a "completed" state

---

## Analytics & Tracking

Every channel delivery is tracked in the `notification_events` table:

### Event Types

| Event | Description |
|-------|-------------|
| `delivered` | Successfully sent to channel |
| `failed` | Delivery attempt failed |
| `opened` | Email opened (tracking pixel) |
| `clicked` | User clicked a link/button |

### Tracking Mechanisms

- **In-App**: Tracked on notification insert
- **Email**: Open pixel (1x1 transparent image) + click redirect tracking via `/api/notifications/track`
- **Web Push**: Click tracking via service worker `notificationclick` event
- **Slack**: HTTP response status from webhook POST
- **Webhook**: HTTP response status with retry metadata

### Analytics API

The `analytics` query (admin-only) returns:

```typescript
{
  totalSent: number,
  byChannel: Record<string, { delivered, failed, clicked, opened }>,
  deliveryRate: number,   // percentage
  clickRate: number,      // percentage
  dailyTrend: Array<{ date, in_app, email, push, slack, webhook }>,
}
```

### Tracking Endpoint

`GET/POST /api/notifications/track`

| Method | Use Case | Parameters |
|--------|----------|------------|
| `GET` | Email open pixel OR click redirect | `?type=open&nid=xxx` or `?type=click&nid=xxx&url=xxx` |
| `POST` | Push notification click tracking | `{ notificationId, event: 'clicked' }` |

---

## Database Schema

### Modified Tables

**`notifications`** - Added columns:
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `group_key` | `TEXT` | `NULL` | Groups related notifications |
| `is_archived` | `BOOLEAN` | `FALSE` | Archive status |
| `archived_at` | `TIMESTAMPTZ` | `NULL` | When archived |
| `action_type` | `TEXT` | `NULL` | Action type enum |
| `action_payload` | `JSONB` | `NULL` | Parameters for the action |
| `action_taken` | `BOOLEAN` | `FALSE` | Whether action was executed |

**`notification_preferences`** - Added columns:
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `push` | `BOOLEAN` | `TRUE` | Web Push channel toggle |
| `slack` | `BOOLEAN` | `TRUE` | Slack channel toggle |
| `webhook` | `BOOLEAN` | `TRUE` | Webhook channel toggle |
| `digest_frequency` | `TEXT` | `'none'` | `none`, `daily`, or `weekly` |

### New Tables

**`push_subscriptions`** - Web Push endpoint storage
| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | Primary key |
| `organization_id` | `UUID` | FK to organizations |
| `user_id` | `UUID` | FK to auth.users |
| `endpoint` | `TEXT` | Push endpoint URL |
| `p256dh` | `TEXT` | Public key |
| `auth` | `TEXT` | Auth secret |
| `user_agent` | `TEXT` | Browser user agent |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

RLS: Users see/manage their own subscriptions only.

**`notification_quiet_hours`** - Per-user DND configuration
| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | Primary key |
| `organization_id` | `UUID` | FK to organizations |
| `user_id` | `UUID` | FK to auth.users |
| `is_enabled` | `BOOLEAN` | Toggle on/off |
| `start_time` | `TIME` | DND start (e.g., 22:00) |
| `end_time` | `TIME` | DND end (e.g., 08:00) |
| `timezone` | `TEXT` | User's timezone |

RLS: Users see/manage their own config only. Unique on `(organization_id, user_id)`.

**`organization_integrations`** - Slack & Webhook configs
| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | Primary key |
| `organization_id` | `UUID` | FK to organizations |
| `type` | `TEXT` | `slack` or `webhook` |
| `name` | `TEXT` | Display name |
| `config` | `JSONB` | Channel-specific config |
| `is_active` | `BOOLEAN` | Active toggle |
| `created_by` | `UUID` | FK to auth.users |

RLS: All org members can view, only admins can insert/update/delete. Unique on `(organization_id, type, name)`.

**Config shapes:**

Slack:
```json
{ "webhook_url": "https://hooks.slack.com/services/..." }
```

Webhook:
```json
{
  "url": "https://api.example.com/webhooks/agencybeats",
  "secret": "hex-encoded-32-byte-secret",
  "events": ["task_assigned", "comment_added"]
}
```

**`notification_events`** - Delivery analytics
| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | Primary key |
| `notification_id` | `UUID` | FK to notifications |
| `channel` | `TEXT` | Channel name |
| `event` | `TEXT` | `delivered`, `failed`, `opened`, `clicked` |
| `metadata` | `JSONB` | Extra data (error, status code, attempt) |
| `created_at` | `TIMESTAMPTZ` | Event timestamp |

RLS: Org members can view events for their org's notifications. Service role can insert.

**`notification_queue`** - Deferred delivery for quiet hours
| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | Primary key |
| `organization_id` | `UUID` | FK to organizations |
| `user_id` | `UUID` | FK to auth.users |
| `notification_id` | `UUID` | FK to notifications |
| `channels` | `TEXT[]` | Channels to deliver |
| `deliver_after` | `TIMESTAMPTZ` | Earliest delivery time |
| `is_processed` | `BOOLEAN` | Processing status |
| `processed_at` | `TIMESTAMPTZ` | When processed |

Partial index on `deliver_after WHERE is_processed = FALSE` for efficient cron queries.

### Indexes

| Index | Table | Purpose |
|-------|-------|---------|
| `idx_notifications_group_key` | notifications | Fast group lookups |
| `idx_notifications_archived` | notifications | Archive tab queries |
| `idx_notifications_search` | notifications | GIN full-text search |
| `idx_push_subs_user` | push_subscriptions | User subscription lookup |
| `idx_org_integrations_org` | organization_integrations | Org integration list |
| `idx_org_integrations_type` | organization_integrations | Type-filtered queries |
| `idx_notification_events_notif` | notification_events | Per-notification events |
| `idx_notification_events_channel` | notification_events | Channel analytics |
| `idx_notification_events_created` | notification_events | Time-series queries |
| `idx_notification_queue_pending` | notification_queue | Cron processing (partial) |

---

## tRPC API Reference

All endpoints are under `trpc.notification.*`.

### Queries

| Endpoint | Auth | Input | Description |
|----------|------|-------|-------------|
| `list` | org | `{ limit?, cursor?, unreadOnly?, isArchived?, grouped? }` | Paginated notification list with optional grouping |
| `search` | org | `{ query?, types?, dateFrom?, dateTo?, isRead?, isArchived?, cursor?, limit? }` | Full-text search with filters |
| `unreadCount` | org | none | Current unread notification count |
| `getPreferences` | org | none | User's per-event channel preferences |
| `getQuietHours` | org | none | User's quiet hours configuration |
| `getIntegrations` | org | none | Organization's Slack/Webhook integrations |
| `analytics` | admin | `{ dateFrom, dateTo }` | Delivery analytics aggregations |

### Mutations

| Endpoint | Auth | Input | Description |
|----------|------|-------|-------------|
| `markAsRead` | org | `{ id }` | Mark single notification as read |
| `markAllAsRead` | org | none | Mark all unread as read |
| `delete` | org | `{ id }` | Delete a notification |
| `archive` | org | `{ id }` | Archive a notification |
| `unarchive` | org | `{ id }` | Restore from archive |
| `executeAction` | org | `{ notificationId, actionType }` | Execute an in-notification action |
| `updatePreference` | org | `{ eventType, inApp, email, push, slack, webhook, digestFrequency? }` | Update channel preferences for an event type |
| `subscribePush` | org | `{ endpoint, p256dh, auth, userAgent? }` | Register Web Push subscription |
| `unsubscribePush` | org | `{ endpoint }` | Remove Web Push subscription |
| `updateQuietHours` | org | `{ isEnabled, startTime, endTime, timezone }` | Update quiet hours config |
| `upsertIntegration` | admin | `{ id?, type, name, config, isActive? }` | Create/update Slack or Webhook integration |
| `deleteIntegration` | admin | `{ id }` | Delete an integration |
| `testSlack` | admin | `{ webhookUrl }` | Send test message to Slack webhook |
| `generateWebhookSecret` | admin | none | Generate a random 32-byte hex secret |

---

## Cron Jobs

All cron endpoints require `Authorization: Bearer <CRON_SECRET>` header.

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/process-queue` | Every 15 minutes | Delivers queued notifications (quiet hours deferred) |
| `/api/cron/digest` | Daily at 8:00 AM UTC | Compiles and sends daily/weekly email digests |
| `/api/cron/archive` | Daily | Auto-archives >30d, hard-deletes >90d, cleans queue >7d |
| `/api/cron/due-reminders` | Daily | Sends due-date-approaching notifications (pre-existing) |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For Web Push | VAPID public key (generate with `web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | For Web Push | VAPID private key |
| `VAPID_CONTACT_EMAIL` | For Web Push | Contact email for VAPID (e.g., `support@agencybeats.app`) |
| `CRON_SECRET` | For crons | Bearer token for authenticating cron HTTP requests |
| `RESEND_API_KEY` | For email | Resend API key (pre-existing) |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL of the application |

### Generating VAPID Keys

```bash
npx web-push generate-vapid-keys
```

---

## File Map

### Core Library (`src/lib/notifications/`)

| File | Purpose |
|------|---------|
| `create.ts` | `createNotification()` / `createNotifications()` - main entry point |
| `channels.ts` | `dispatchToChannels()` - multi-channel orchestrator |
| `push.ts` | `sendPushNotification()` - VAPID-based Web Push delivery |
| `slack.ts` | `sendSlackNotification()` - Slack Block Kit via webhooks |
| `webhook.ts` | `sendWebhookNotification()` - HMAC-signed HTTP POST with retry |
| `quiet-hours.ts` | `checkQuietHours()` / `queueForLater()` - timezone-aware DND |
| `digest.ts` | `compileDigest()` / `buildDigestEmailHtml()` - email digest generation |
| `analytics.ts` | `trackEvent()` - notification event tracking |
| `actions.ts` | `executeNotificationAction()` - in-notification action handler |

### API Routes

| File | Purpose |
|------|---------|
| `src/app/api/cron/process-queue/route.ts` | Queue processor cron |
| `src/app/api/cron/digest/route.ts` | Digest email cron |
| `src/app/api/cron/archive/route.ts` | Auto-archive & retention cron |
| `src/app/api/notifications/track/route.ts` | Open pixel + click tracking endpoint |

### UI Components

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/notifications/page.tsx` | Notifications page (search, filter, tabs, grouping) |
| `src/components/notifications/notification-item.tsx` | Single notification row (grouping, actions, archive) |
| `src/components/notifications/notification-bell.tsx` | Header bell icon with popover (pre-existing) |
| `src/components/settings/notification-preferences.tsx` | 5-channel preference grid + digest selector |
| `src/components/settings/slack-integration.tsx` | Slack webhook configuration card |
| `src/components/settings/webhook-integration.tsx` | Custom webhook configuration card |
| `src/components/settings/quiet-hours.tsx` | Quiet hours / DND configuration card |

### Client Hooks

| File | Purpose |
|------|---------|
| `src/hooks/use-push-subscription.ts` | Web Push subscription management |

### Other

| File | Purpose |
|------|---------|
| `public/sw.js` | Service worker for Web Push |
| `src/trpc/routers/notification.ts` | All notification tRPC endpoints |
| `supabase/migrations/013_notifications_v2.sql` | Database migration |

---

## UI Components

### Settings Page Layout

The Settings page (`/settings`) includes notification features in this order:

1. **Organization Card** - Org name, ID
2. **Account Card** - User role display
3. **Figma Integration** - Figma connect button
4. **Slack Integration** (admin-only) - Webhook URL, test button, active toggle
5. **Webhook Integration** (admin-only) - Endpoint URL, signing secret, event subscriptions
6. **Notification Preferences** (all users) - 5-channel toggle grid per event type + digest frequency
7. **Quiet Hours** (all users) - Enable toggle, start/end time, timezone
8. **Auto-Assignment Rules** (manager+ only)

### Notifications Page

The Notifications page (`/notifications`) features:

- **Header** with unread count and "Mark all as read" button
- **Search bar** with debounced full-text search
- **Filter popover** with event type checkboxes
- **3-tab navigation**: All | Unread (with badge) | Archived
- **Notification list** with:
  - Grouped notifications showing count badge
  - Inline action buttons (Approve/Reject/Complete/Acknowledge)
  - Archive/Unarchive toggle
  - Delete button
  - Click to navigate to linked resource
- **Infinite scroll** with "Load more" pagination

---

## Integration Setup Guides

### Web Push Setup

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL` in `.env`
3. The service worker (`public/sw.js`) auto-registers on page load
4. Users enable push via the browser permission prompt
5. Subscriptions are stored in `push_subscriptions` and managed via the `usePushSubscription` hook

### Slack Setup

1. Create an [Incoming Webhook](https://api.slack.com/messaging/webhooks) in your Slack workspace
2. Navigate to Settings > Slack Integration (admin-only)
3. Paste the webhook URL and click "Save"
4. Click "Test Connection" to verify
5. Toggle "Active" to enable/disable without removing the config

Slack notifications use Block Kit format with:
- Emoji per event type
- Bold title
- Context block with message body
- Action button linking back to Agency Beats

### Custom Webhook Setup

1. Navigate to Settings > Webhook Integration (admin-only)
2. Enter your endpoint URL
3. Click the refresh icon to generate a signing secret
4. Copy the secret and configure your endpoint to verify it
5. Select which event types to subscribe to (empty = all events)
6. Click "Save"

**Payload format:**

```json
{
  "event": "task_assigned",
  "data": {
    "id": "notification-uuid",
    "type": "task_assigned",
    "title": "New task assigned",
    "body": "Design homepage mockup",
    "link": "/projects/abc/tasks/xyz",
    "metadata": { "taskTitle": "Design homepage mockup" },
    "created_at": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:01Z"
}
```

**Signature verification (Node.js example):**

```javascript
const crypto = require('crypto')

function verifySignature(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return signature === `sha256=${expected}`
}

// In your endpoint handler:
const signature = req.headers['x-agencybeats-signature']
const isValid = verifySignature(req.body, signature, YOUR_SECRET)
```

**Headers sent with each webhook:**

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-AgencyBeats-Signature` | `sha256=<hmac-hex>` |
| `X-AgencyBeats-Delivery` | Notification UUID |
| `User-Agent` | `AgencyBeats-Webhook/1.0` |

**Retry policy:** 3 attempts with exponential backoff (2s, 4s). 10-second timeout per attempt.

---

## Migration

Apply the schema changes:

```bash
supabase db push
# or manually run:
psql $SUPABASE_DB_URL -f supabase/migrations/013_notifications_v2.sql
```

Install the Web Push dependency:

```bash
npm install web-push
```
