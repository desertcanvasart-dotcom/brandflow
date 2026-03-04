'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Palette, FolderKanban, Calendar, GanttChart, Users, Settings } from 'lucide-react'
import { trpc } from '@/trpc/client'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const { data: brands } = trpc.brand.list.useQuery(undefined, { enabled: open })
  const { data: projects } = trpc.project.list.useQuery(undefined, { enabled: open })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function navigate(path: string) {
    setOpen(false)
    router.push(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search brands, projects, pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => navigate('/projects')}>
            <FolderKanban className="mr-2 h-4 w-4" />
            Projects
          </CommandItem>
          <CommandItem onSelect={() => navigate('/brands')}>
            <Palette className="mr-2 h-4 w-4" />
            Brands
          </CommandItem>
          <CommandItem onSelect={() => navigate('/calendar')}>
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </CommandItem>
          <CommandItem onSelect={() => navigate('/timeline')}>
            <GanttChart className="mr-2 h-4 w-4" />
            Timeline
          </CommandItem>
          <CommandItem onSelect={() => navigate('/team')}>
            <Users className="mr-2 h-4 w-4" />
            Team
          </CommandItem>
          <CommandItem onSelect={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        {brands && brands.length > 0 && (
          <CommandGroup heading="Brands">
            {brands.map((brand) => (
              <CommandItem
                key={brand.id}
                onSelect={() => navigate(`/brands/${brand.id}`)}
              >
                <Palette className="mr-2 h-4 w-4" />
                {brand.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {projects && projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                onSelect={() => navigate(`/projects/${project.id}`)}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                {project.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
