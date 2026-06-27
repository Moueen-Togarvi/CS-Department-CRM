import { UserRole } from './enums'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string | null
  studentId?: string | null
  facultyId?: string | null
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
}