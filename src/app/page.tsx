'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import InitUser from '@/components/InitUser'

export default function Home() {
  return (
    <>
      <Authenticated>
        <InitUser /> {/* <-- client mutation runs here */}
        <UserButton />
        <Content />
      </Authenticated>
      <Unauthenticated>
        <SignInButton />
      </Unauthenticated>
    </>
  )
}

function Content() {
  // const messages = useQuery(api.messages.getForCurrentUser)
  // return <div>Authenticated content: {messages?.length}</div>
}