import { beforeEach, describe, expect, it, vi } from 'vitest'

// auth-utils reaches for Prisma and NextAuth at import time; both are stubbed
// so the authorisation logic itself can be exercised directly.
const findFirst = vi.fn()
const findMany = vi.fn()
const findUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    courseOffering: { findFirst, findMany },
    timetable: { findFirst, findMany },
    course: { findFirst, findMany },
    faculty: { findUnique },
    student: { findUnique },
  },
}))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

const {
  AuthError,
  assertCanViewStudent,
  getSelfStudentId,
  resolveSectionScope,
  scopeToWhere,
} = await import('./auth-utils')

type Role = 'ADMIN' | 'FACULTY' | 'STUDENT'
const session = (role: Role, id = 'u1') =>
  ({ user: { id, role } }) as unknown as Parameters<typeof resolveSectionScope>[0]

beforeEach(() => {
  vi.clearAllMocks()
  findUnique.mockResolvedValue({ id: 'fac1' })
})

/** Point the three lookups inside getFacultyCourseSections at a fixed answer. */
function facultyHas({
  offerings = [] as string[],
  timetables = [] as string[],
  isInstructor = false,
}) {
  findMany
    .mockResolvedValueOnce(offerings.map((section) => ({ section })))
    .mockResolvedValueOnce(timetables.map((section) => ({ section })))
  findFirst.mockResolvedValue(isInstructor ? { id: 'course1' } : null)
}

describe('resolveSectionScope — admins', () => {
  it('is unrestricted when no section is requested', async () => {
    const scope = await resolveSectionScope(session('ADMIN'), 'c1', 's1', undefined)
    expect(scope.where).toEqual({})
    expect(scope.section).toBeUndefined()
  })

  it('honours an explicitly requested section', async () => {
    const scope = await resolveSectionScope(session('ADMIN'), 'c1', 's1', 'Morning A')
    expect(scope.where).toEqual({ section: 'Morning A' })
  })
})

describe('resolveSectionScope — faculty', () => {
  // The original bug: no section requested meant no filter at all, so a
  // faculty member saw every section of the course.
  it('narrows to the assigned sections when none is requested', async () => {
    facultyHas({ offerings: ['Morning A', 'Evening A'] })
    const scope = await resolveSectionScope(session('FACULTY'), 'c1', 's1', undefined)
    expect(scope.where).toEqual({ section: { in: ['Morning A', 'Evening A'] } })
    expect(scope.section).toBeUndefined()
  })

  it('pins the section when only one is assigned', async () => {
    facultyHas({ offerings: ['Evening B'] })
    const scope = await resolveSectionScope(session('FACULTY'), 'c1', 's1', undefined)
    expect(scope.section).toBe('Evening B')
    expect(scope.where).toEqual({ section: { in: ['Evening B'] } })
  })

  it('allows a requested section that is assigned', async () => {
    facultyHas({ offerings: ['Morning A', 'Evening A'] })
    const scope = await resolveSectionScope(session('FACULTY'), 'c1', 's1', 'Evening A')
    expect(scope.where).toEqual({ section: 'Evening A' })
  })

  it('refuses a requested section that is not assigned', async () => {
    facultyHas({ offerings: ['Morning A'] })
    await expect(
      resolveSectionScope(session('FACULTY'), 'c1', 's1', 'Evening B')
    ).rejects.toMatchObject({ name: 'AuthError', statusCode: 403 })
  })

  // The other half of the bug: an empty scope used to mean "no restriction".
  it('refuses a faculty member with no assignment at all', async () => {
    facultyHas({})
    await expect(
      resolveSectionScope(session('FACULTY'), 'c1', 's1', undefined)
    ).rejects.toMatchObject({ name: 'AuthError', statusCode: 403 })
  })

  it('draws sections from timetable slots as well as offerings', async () => {
    facultyHas({ offerings: ['Morning A'], timetables: ['Evening A'] })
    const scope = await resolveSectionScope(session('FACULTY'), 'c1', 's1', undefined)
    expect(scope.where).toEqual({ section: { in: ['Morning A', 'Evening A'] } })
  })

  // Only offerings and timetable slots confer access; nothing else may widen it.
  it('refuses a faculty member with no offering or timetable slot', async () => {
    facultyHas({ isInstructor: true })
    await expect(
      resolveSectionScope(session('FACULTY'), 'c1', 's1', undefined)
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('scopeToWhere', () => {
  it('places no restriction for a null scope (admin)', () => {
    expect(scopeToWhere(null)).toEqual({})
  })

  // An empty scope must match nothing, not everything.
  it('matches no rows for an empty scope', () => {
    expect(scopeToWhere(new Map())).toEqual({ currentSemester: -1 })
  })

  it('builds an OR branch per semester', () => {
    const scope = new Map<number, string[] | null>([
      [3, ['Morning A']],
      [5, null],
    ])
    expect(scopeToWhere(scope)).toEqual({
      OR: [{ currentSemester: 3, section: { in: ['Morning A'] } }, { currentSemester: 5 }],
    })
  })
})

describe('assertCanViewStudent', () => {
  it('lets admins and faculty view anyone', async () => {
    await expect(assertCanViewStudent(session('ADMIN'), 'other')).resolves.toBeUndefined()
    await expect(assertCanViewStudent(session('FACULTY'), 'other')).resolves.toBeUndefined()
  })

  it('lets a student view their own record', async () => {
    findUnique.mockResolvedValue({ id: 'stu1' })
    await expect(assertCanViewStudent(session('STUDENT'), 'stu1')).resolves.toBeUndefined()
  })

  it("refuses a student another student's record", async () => {
    findUnique.mockResolvedValue({ id: 'stu1' })
    await expect(assertCanViewStudent(session('STUDENT'), 'stu2')).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})

describe('getSelfStudentId', () => {
  it('refuses when the user has no student profile', async () => {
    findUnique.mockResolvedValue(null)
    await expect(getSelfStudentId('u1')).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('AuthError', () => {
  it('carries the status code the API layer maps to', () => {
    expect(new AuthError('nope', 401).statusCode).toBe(401)
    expect(new AuthError('nope').statusCode).toBe(400)
    expect(new AuthError('nope').name).toBe('AuthError')
  })
})
