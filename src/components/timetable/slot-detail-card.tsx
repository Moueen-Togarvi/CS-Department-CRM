'use client'

import {
  BookOpen,
  CalendarDays,
  Clock,
  MapPin,
  Moon,
  Sun,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { DAY_FULL } from './constants'

export interface SlotDetail {
  id: string
  course: { id: string; code: string; name: string; courseType: string; semesterOffered?: number | null }
  faculty: { id: string; name: string; designation: string }
  room: { id: string; name: string; building: string }
  section: string
  day: string
  startTime: string
  endTime: string
  slotType: string
}

/** Shift has no column of its own - it is read out of the section string. */
function deriveShift(section: string): 'Morning' | 'Evening' {
  return (section || '').toLowerCase().includes('evening') ? 'Evening' : 'Morning'
}

/**
 * Section strings are inconsistent ("A", "Morning", "Morning A"), so show only
 * the trailing letter. A bare "Morning"/"Evening" carries no section letter.
 */
function sectionLetter(section: string): string | null {
  const trimmed = (section || '').trim()
  if (/^(morning|evening)$/i.test(trimmed)) return null
  const match = trimmed.match(/([A-Za-z])\s*$/)
  return match ? match[1].toUpperCase() : null
}

function ordinalSemester(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'
  return `${n}${suffix} Semester`
}

/** Decorative dotted grid in the code panel. */
function DotAccent({ uid }: { uid: string }) {
  return (
    <svg width="104" height="60" viewBox="0 0 104 60" fill="none" aria-hidden="true">
      <defs>
        <pattern id={`d-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="2" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="104" height="60" fill={`url(#d-${uid})`} />
    </svg>
  )
}

/** Tinted field row, matching the reference layout. */
function FieldRow({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: LucideIcon
  label: string
  value: string
  tint: string
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl px-4 py-3 min-w-0', tint)}>
      <Icon className="size-5 shrink-0" strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
        <p className="truncate text-[15px] font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function SlotDetailCard({ slot }: { slot: SlotDetail }) {
  const shift = deriveShift(slot.section)
  const section = sectionLetter(slot.section)
  const semester = ordinalSemester(slot.course.semesterOffered)

  // Green at two strengths for the primary facts, with the remaining brand
  // accents kept distinct so each row is scannable at a glance.
  const rows = [
    {
      icon: MapPin,
      label: 'Class Room',
      value: slot.room.name,
      tint: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    },
    semester && {
      icon: BookOpen,
      label: 'Semester',
      value: semester,
      tint: 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400',
    },
    {
      icon: CalendarDays,
      label: 'Day',
      value: DAY_FULL[slot.day] || slot.day,
      tint: 'bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400',
    },
    {
      icon: Clock,
      label: 'Time',
      value: `${slot.startTime} – ${slot.endTime}`,
      tint: 'bg-teal-50/70 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400',
    },
    section && {
      icon: Users,
      label: 'Section',
      value: section,
      tint: 'bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400',
    },
    {
      icon: shift === 'Evening' ? Moon : Sun,
      label: 'Shift',
      value: shift,
      tint: 'bg-teal-50/70 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400',
    },
    {
      icon: User,
      label: 'Teacher',
      value: slot.faculty.name,
      tint: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    },
  ].filter(Boolean) as { icon: LucideIcon; label: string; value: string; tint: string }[]

  return (
    <div className="flex overflow-hidden rounded-2xl bg-card shadow-lg">
      {/* Course code panel */}
      <div className="relative flex w-[92px] shrink-0 flex-col items-center justify-center gap-3.5 bg-emerald-800 p-3 text-white sm:w-[118px] dark:bg-emerald-900">
        <div className="pointer-events-none absolute bottom-4 left-3 text-emerald-100 opacity-20">
          <DotAccent uid={slot.id} />
        </div>
        <div className="relative z-10 flex size-14 items-center justify-center rounded-full bg-emerald-100/95 sm:size-16">
          <BookOpen className="size-7 text-emerald-800 sm:size-8" strokeWidth={1.75} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-2">
          <span className="rounded-full bg-emerald-950/40 px-2.5 py-0.5 text-[8px] font-bold tracking-widest">
            COURSE CODE
          </span>
          <span className="w-full break-words text-center text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
            {slot.course.code}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1 p-5 sm:p-7">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
            <BookOpen className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            Course Name
          </p>
        </div>
        <h3 className="mt-2 break-words text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
          {slot.course.name}
        </h3>

        <div className="my-4 border-t" />

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {rows.map((row) => (
            <FieldRow key={row.label} {...row} />
          ))}
        </div>
      </div>
    </div>
  )
}
