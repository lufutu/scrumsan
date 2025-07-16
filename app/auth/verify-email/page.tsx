import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Verify Email - ScrumSan',
  description: 'Verify your email address',
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-sm text-center">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Check your email</h2>
          <p className="text-gray-600">
            We've sent you an email with a link to verify your account. Please check your inbox and follow the instructions.
          </p>
          <div className="pt-4">
            <Link href="/login">
              <Button variant="outline">Return to login</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 