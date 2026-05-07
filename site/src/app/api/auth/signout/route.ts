import { signOut } from '@/lib/auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  await signOut({ redirect: false })
  return NextResponse.redirect(new URL('/login', request.url))
}
