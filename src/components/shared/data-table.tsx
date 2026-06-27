'use client'

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Inbox } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  pageCount?: number
  pageIndex?: number
  pageSize?: number
  onPaginationChange?: (page: number, pageSize: number) => void
  onSortingChange?: (sorting: SortingState) => void
  sorting?: SortingState
  manualPagination?: boolean
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  onRowClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  pageCount: controlledPageCount,
  pageIndex: controlledPageIndex = 0,
  pageSize: controlledPageSize = 10,
  onPaginationChange,
  onSortingChange,
  sorting: controlledSorting,
  manualPagination = false,
  emptyMessage = 'No data found.',
  emptyIcon,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const sorting = controlledSorting ?? internalSorting
  const [internalPageIndex, setInternalPageIndex] = useState(0)
  const [internalPageSize, setInternalPageSize] = useState(controlledPageSize)

  const pageIndex = controlledPageIndex ?? internalPageIndex
  const pageSize = controlledPageSize ?? internalPageSize

  const pageCount = manualPagination
    ? controlledPageCount ?? 0
    : Math.ceil(data.length / pageSize)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualPagination ? undefined : getSortedRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      if (onSortingChange) {
        onSortingChange(newSorting)
      } else {
        setInternalSorting(newSorting)
      }
    },
    onPaginationChange: (updater) => {
      if (!updater || manualPagination) return
      const newState = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater
      setInternalPageIndex(newState.pageIndex)
      setInternalPageSize(newState.pageSize)
    },
    manualPagination,
    manualSorting: manualPagination,
    pageCount,
    state: {
      sorting,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
  })

  if (isLoading) {
    return <DataTableSkeleton columns={columns.length} rows={5} />
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        {emptyIcon || <Inbox className="size-10 text-muted-foreground/40 mb-3" />}
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'flex items-center gap-1 cursor-pointer select-none'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="size-3.5 text-muted-foreground/60" />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? 'cursor-pointer' : ''}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Page {pageIndex + 1} of {pageCount || 1}
          </span>
          {manualPagination && controlledPageCount !== undefined && (
            <span className="hidden sm:inline">({pageCount} pages total)</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              const newSize = Number(value)
              if (onPaginationChange) {
                onPaginationChange(0, newSize)
              } else {
                setInternalPageSize(newSize)
                setInternalPageIndex(0)
              }
            }}
          >
            <SelectTrigger size="sm" className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => {
                if (onPaginationChange) {
                  onPaginationChange(0, pageSize)
                } else {
                  setInternalPageIndex(0)
                }
              }}
              disabled={pageIndex === 0}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => {
                if (onPaginationChange) {
                  onPaginationChange(pageIndex - 1, pageSize)
                } else {
                  setInternalPageIndex(pageIndex - 1)
                }
              }}
              disabled={pageIndex === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => {
                if (onPaginationChange) {
                  onPaginationChange(pageIndex + 1, pageSize)
                } else {
                  setInternalPageIndex(pageIndex + 1)
                }
              }}
              disabled={pageIndex >= pageCount - 1}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => {
                if (onPaginationChange) {
                  onPaginationChange(pageCount - 1, pageSize)
                } else {
                  setInternalPageIndex(pageCount - 1)
                }
              }}
              disabled={pageIndex >= pageCount - 1}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DataTableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: columns }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}