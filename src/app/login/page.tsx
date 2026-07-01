'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Shield, User, GraduationCap } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user, setUser, isAuthenticated, isLoading } = useAuthStore()

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, isLoading, router])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      // Fetch the full profile from session endpoint
      const sessionRes = await fetch('/api/auth/session')
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        const u = sessionData.user
        setUser({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          avatar: u.avatar,
          studentId: u.student?.id ?? null,
          facultyId: u.faculty?.id ?? null,
        })
        toast.success(`Welcome back, ${u.name}!`)
        router.replace('/')
      } else {
        setError('Failed to load session profile')
        toast.error('Failed to load session profile')
      }
    } catch {
      setError('Network error. Please try again.')
      toast.error('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillCredentials = (role: 'admin' | 'faculty' | 'student') => {
    if (role === 'admin') {
      form.setValue('email', 'admin@csdept.edu')
      form.setValue('password', 'admin123')
    } else if (role === 'faculty') {
      form.setValue('email', 'sarah.khan@csdept.edu')
      form.setValue('password', 'faculty123')
    } else if (role === 'student') {
      form.setValue('email', 'CS-2023-001@student.csdept.edu')
      form.setValue('password', 'student123')
    }
  }

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl border-[3px] border-slate-200 border-t-emerald-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel: Premium Brand Sidebar */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden select-none">
        {/* Abstract vector backgrounds/glows */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[80px]" />

        {/* Content */}
        <div className="flex flex-col justify-between p-16 z-10 w-full">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-semibold text-xl tracking-tight">CS Dept CRM</span>
          </div>

          {/* Core branding message */}
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight max-w-lg">
              Empowering Academic Excellence & Student Success
            </h1>
            <p className="text-slate-400 text-lg max-w-md">
              Manage courses, monitor attendance, evaluate final year projects, and check academic results in one unified platform.
            </p>
          </div>

          {/* Footer info */}
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} CS Department. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo (visible on smaller viewports) */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-slate-900">CS Dept CRM</span>
          </div>

          <Card className="border-slate-100 shadow-xl shadow-slate-100/50 bg-white">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 text-center">
                Sign in to your account
              </CardTitle>
              <CardDescription className="text-center text-slate-500">
                Enter your credentials to access the portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="name@csdept.edu"
                            type="email"
                            autoComplete="email"
                            className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-emerald-500 focus:border-emerald-500"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">Password</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="••••••••"
                            type="password"
                            autoComplete="current-password"
                            className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-emerald-500 focus:border-emerald-500"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600 font-medium">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/10 font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </Form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Demo Accounts</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Quick Login Shortcuts */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="flex flex-col h-auto py-2 px-1 border-slate-200 hover:bg-emerald-50/50 hover:border-emerald-200 hover:text-emerald-700 transition-all duration-200"
                  onClick={() => fillCredentials('admin')}
                  disabled={isSubmitting}
                >
                  <Shield className="h-4 w-4 mb-1 text-emerald-600" />
                  <span className="text-[10px] font-bold">Admin</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="flex flex-col h-auto py-2 px-1 border-slate-200 hover:bg-emerald-50/50 hover:border-emerald-200 hover:text-emerald-700 transition-all duration-200"
                  onClick={() => fillCredentials('faculty')}
                  disabled={isSubmitting}
                >
                  <User className="h-4 w-4 mb-1 text-emerald-600" />
                  <span className="text-[10px] font-bold">Faculty</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="flex flex-col h-auto py-2 px-1 border-slate-200 hover:bg-emerald-50/50 hover:border-emerald-200 hover:text-emerald-700 transition-all duration-200"
                  onClick={() => fillCredentials('student')}
                  disabled={isSubmitting}
                >
                  <GraduationCap className="h-4 w-4 mb-1 text-emerald-600" />
                  <span className="text-[10px] font-bold">Student</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
