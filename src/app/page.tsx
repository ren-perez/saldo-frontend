'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import InitUser from '@/components/InitUser'

function RedirectToDashboard() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])
  return null
}

export default function Home() {
  return (
    <>
      <Authenticated>
        <InitUser />
        <RedirectToDashboard />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedHome />
      </Unauthenticated>
    </>
  )
}

function UnauthenticatedHome() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Saldo</h1>
          <p className="text-gray-600 mb-8">
            Import and manage your bank transactions with ease. Track spending,
            categorize transactions, and gain insights into your financial habits.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center text-left">
              <div className="text-2xl mr-3">📤</div>
              <div>
                <div className="font-medium">CSV Import</div>
                <div className="text-sm text-gray-500">Upload bank statements</div>
              </div>
            </div>
            <div className="flex items-center text-left">
              <div className="text-2xl mr-3">🏦</div>
              <div>
                <div className="font-medium">Multi-Account</div>
                <div className="text-sm text-gray-500">Manage all your accounts</div>
              </div>
            </div>
            <div className="flex items-center text-left">
              <div className="text-2xl mr-3">📊</div>
              <div>
                <div className="font-medium">Insights</div>
                <div className="text-sm text-gray-500">Track spending patterns</div>
              </div>
            </div>
          </div>

          <SignInButton mode="modal">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              Get Started - Sign In
            </button>
          </SignInButton>

          <p className="text-xs text-gray-500 mt-4">
            Secure authentication powered by Clerk
          </p>
        </div>
      </div>
    </div>
  )
}
