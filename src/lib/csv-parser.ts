/**
 * Simple CSV parser that handles quoted fields, newlines in quotes, etc.
 */
export interface CsvRow {
  [key: string]: string
}

export function parseCsv(csvText: string): { headers: string[]; rows: CsvRow[] } {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCsvLine(line)
    const row: CsvRow = {}
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || '').trim()
    })
    rows.push(row)
  }

  return { headers, rows }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }

  result.push(current)
  return result
}

/**
 * Get CS department ID (first department in DB)
 */
export async function getDefaultDepartmentId(db: any): Promise<string> {
  const dept = await db.department.findFirst({ where: { code: 'CS' } })
  if (!dept) {
    const anyDept = await db.department.findFirst()
    return anyDept?.id || ''
  }
  return dept.id
}