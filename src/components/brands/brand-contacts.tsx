'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserPlus, Pencil, Trash2, Users, Phone, Mail, Star } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type BrandContact = Database['public']['Tables']['brand_contacts']['Row']

interface ContactFormState {
  name: string
  email: string
  phone: string
  jobTitle: string
  isPrimary: boolean
  notes: string
}

const emptyForm: ContactFormState = {
  name: '',
  email: '',
  phone: '',
  jobTitle: '',
  isPrimary: false,
  notes: '',
}

export function BrandContacts({ brandId }: { brandId: string }) {
  const [open, setOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<BrandContact | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<ContactFormState>(emptyForm)

  const utils = trpc.useUtils()
  const { data: contacts, isLoading } = trpc.brandContact.list.useQuery({ brandId })

  const createMutation = trpc.brandContact.create.useMutation({
    onSuccess: () => {
      utils.brandContact.list.invalidate({ brandId })
      toast.success('Contact added')
      closeDialog()
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = trpc.brandContact.update.useMutation({
    onSuccess: () => {
      utils.brandContact.list.invalidate({ brandId })
      toast.success('Contact updated')
      closeDialog()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.brandContact.delete.useMutation({
    onSuccess: () => {
      utils.brandContact.list.invalidate({ brandId })
      toast.success('Contact removed')
      setDeleteId(null)
    },
    onError: (err) => toast.error(err.message),
  })

  function closeDialog() {
    setOpen(false)
    setEditingContact(null)
    setForm(emptyForm)
  }

  function openEdit(contact: BrandContact) {
    setEditingContact(contact)
    setForm({
      name: contact.name,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      jobTitle: contact.job_title ?? '',
      isPrimary: contact.is_primary,
      notes: contact.notes ?? '',
    })
    setOpen(true)
  }

  function handleSubmit() {
    if (!form.name.trim()) return

    if (editingContact) {
      updateMutation.mutate({
        id: editingContact.id,
        brandId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        jobTitle: form.jobTitle,
        isPrimary: form.isPrimary,
        notes: form.notes,
      })
    } else {
      createMutation.mutate({
        brandId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        jobTitle: form.jobTitle,
        isPrimary: form.isPrimary,
        notes: form.notes,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="mt-4 space-y-3">
            <div className="h-16 rounded bg-muted" />
            <div className="h-16 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contacts</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                People associated with this brand — clients, stakeholders, decision-makers.
              </p>
            </div>
            <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true) }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
                  <DialogDescription>
                    {editingContact
                      ? 'Update the contact details.'
                      : 'Add a person associated with this brand.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name *</Label>
                    <Input
                      id="contact-name"
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-title">Job Title</Label>
                    <Input
                      id="contact-title"
                      placeholder="Marketing Director"
                      value={form.jobTitle}
                      onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="jane@company.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Phone</Label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-notes">Notes</Label>
                    <Textarea
                      id="contact-notes"
                      placeholder="Any additional notes..."
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="contact-primary"
                      checked={form.isPrimary}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: v }))}
                    />
                    <Label htmlFor="contact-primary">Primary contact</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()}>
                    {editingContact ? 'Save Changes' : 'Add Contact'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {contacts && contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{contact.name}</p>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Star className="h-3 w-3" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    {contact.job_title && (
                      <p className="text-xs text-muted-foreground">{contact.job_title}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </a>
                      )}
                    </div>
                    {contact.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{contact.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
              <div className="text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No contacts added yet.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this contact from the brand.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
