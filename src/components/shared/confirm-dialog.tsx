'use client'

import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: ReactNode
  confirmLabel?: string
  pendingLabel?: string
  cancelLabel?: string
  /** Styles the confirm button as destructive. Default: true. */
  destructive?: boolean
  isPending?: boolean
  onConfirm: () => void
}

/**
 * Shared confirmation step for destructive actions, so a delete is never one
 * stray click away. Several modules already ship their own AlertDialog for
 * this; use this one for anything new.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  pendingLabel = 'Deleting...',
  cancelLabel = 'Cancel',
  destructive = true,
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(destructive && 'bg-red-600 hover:bg-red-700')}
            disabled={isPending}
            onClick={(event) => {
              // Keep the dialog up while the request is in flight; the caller
              // closes it once the mutation settles.
              event.preventDefault()
              onConfirm()
            }}
          >
            {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
