'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { User, Save, Upload, Loader2, KeyRound, Mail } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useCurrentUser } from '@/hooks/use-current-user'

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
]

export function AccountSettings() {
  const { role, orgId } = useCurrentUser()
  const utils = trpc.useUtils()
  const { upload, uploading } = useFileUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery()

  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [timezone, setTimezone] = useState('')

  // Email change dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')

  // Password change dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setAvatarUrl(profile.avatar_url ?? null)
      setTimezone(profile.timezone ?? '')
    }
  }, [profile])

  const allTimezones = useMemo(() => {
    try {
      const all = Intl.supportedValuesOf('timeZone')
      const commonSet = new Set(COMMON_TIMEZONES)
      const rest = all.filter((tz) => !commonSet.has(tz))
      return [...COMMON_TIMEZONES, ...rest]
    } catch {
      return COMMON_TIMEZONES
    }
  }, [])

  const updateMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated')
      utils.settings.getProfile.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const changeEmailMutation = trpc.settings.changeEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      setEmailDialogOpen(false)
      setNewEmail('')
    },
    onError: (err) => toast.error(err.message),
  })

  const changePasswordMutation = trpc.settings.changePassword.useMutation({
    onSuccess: () => {
      toast.success('Password updated')
      setPasswordDialogOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err) => toast.error(err.message),
  })

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    try {
      const url = await upload(file, {
        folder: `avatars/${orgId}`,
        maxSizeBytes: 2 * 1024 * 1024,
      })
      setAvatarUrl(url)
      updateMutation.mutate({ avatarUrl: url })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  function handleSave() {
    updateMutation.mutate({
      displayName: displayName || undefined,
      timezone: timezone || undefined,
    })
  }

  function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail) return
    changeEmailMutation.mutate({ newEmail })
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    changePasswordMutation.mutate({ newPassword })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
          <CardDescription>
            Your personal information visible to your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="space-y-2">
            <Label>Avatar</Label>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover border"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 2MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Full Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Role (read-only) */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Input
              value={role ? role.charAt(0).toUpperCase() + role.slice(1) : ''}
              disabled
              className="text-sm"
            />
          </div>

          {/* Personal Timezone */}
          <div className="space-y-2">
            <Label>Personal Timezone</Label>
            <Select
              value={timezone || '__default__'}
              onValueChange={(v) => setTimezone(v === '__default__' ? '' : v)}
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Use organization default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Use organization default</SelectItem>
                {allTimezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Overrides the organization timezone for your notifications and scheduling
            </p>
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email & Password</CardTitle>
          <CardDescription>
            Manage your login credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Email</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile?.email ?? '—'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailDialogOpen(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              Change Email
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Password</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                ••••••••
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              A confirmation will be sent to your new email address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={changeEmailMutation.isPending}
              >
                {changeEmailMutation.isPending ? 'Sending...' : 'Send Confirmation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
