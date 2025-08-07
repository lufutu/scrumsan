import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot Password - ScrumSan',
  description: 'Reset your ScrumSan password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Forgot your password?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        <ForgotPasswordForm />
        
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