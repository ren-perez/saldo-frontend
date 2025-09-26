// src/app/page.tsx
'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import InitUser from '@/components/InitUser'
import AppLayout from '@/components/AppLayout'

export default function Home() {
  return (
    <AppLayout>
      <Authenticated>
        <InitUser />
        <AuthenticatedHome />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedHome />
      </Unauthenticated>
    </AppLayout>
  )
}

function AuthenticatedHome() {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Welcome to Your Finance Dashboard 💰
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Manage your accounts, import transactions, and track your spending.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Link href="/accounts" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">🏦</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
              Manage Accounts
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Set up your bank accounts and credit cards
            </p>
          </div>
        </Link>

        <Link href="/presets" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">⚙️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
              CSV Presets
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Configure how to import your bank statements
            </p>
          </div>
        </Link>

        <Link href="/import-csv" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">📤</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
              Import CSV
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Upload and process your transaction files
            </p>
          </div>
        </Link>

        <Link href="/transactions" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">💰</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
              View Transactions
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Browse and manage your imported transactions
            </p>
          </div>
        </Link>

        <Link href="/dashboard" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
              Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              View your financial overview and insights
            </p>
          </div>
        </Link>

        <Link href="/categories" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">🏷️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
              Manage Categories
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Organize your spending with categories
            </p>
          </div>
        </Link>
      </div>

      {/* Getting Started */}
      <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-3">
          🚀 Getting Started
        </h2>
        <ol className="text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
          <li>Create your first account (checking, savings, or credit)</li>
          <li>Set up a CSV preset to define how your bank exports data</li>
          <li>Link the preset to your account</li>
          <li>Import your first CSV file</li>
          <li>View your transactions and start tracking!</li>
        </ol>
      </div>
    </div>
  )
}

function UnauthenticatedHome() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Saldo
          </h1>
          <p className="text-gray-600 mb-8">
            Import and manage your bank transactions with ease.
            Track spending, categorize transactions, and gain insights into your financial habits.
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