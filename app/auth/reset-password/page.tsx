import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = {
  title: 'Reset Password - ScrumSan',
  description: 'Create a new password for your ScrumSan account',
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Create new password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter a new password for your account.
          </p>
        </div>
        
        <Suspense fallback={<div className="animate-pulse h-48 bg-gray-100 rounded" />}>
          <ResetPasswordForm />
        </Suspense>
        
        <div className="text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}