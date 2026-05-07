import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { sql } from './db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const rows = await sql`
          SELECT id, email, password_hash
          FROM users
          WHERE email = ${credentials.email as string}
          LIMIT 1
        `
        const user = rows[0]
        if (!user) return null

        const ok = await bcrypt.compare(
          credentials.password as string,
          user.password_hash as string
        )
        if (!ok) return null

        return { id: user.id as string, email: user.email as string }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
