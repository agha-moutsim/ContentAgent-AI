import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createUser, authenticateUser } from '@/backend/services/auth';

export const dynamic = 'force-dynamic';
// It seems createUser WAS exported in the file I viewed.

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await createUser(email, password);
    
    // Auto-login after signup: Generate token and set cookie (Requirements 1.6)
    const { token } = await authenticateUser(email, password);

    // Set HTTP-only cookie using next/headers to ensure reliability on Vercel
    const cookieStore = cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    const response = NextResponse.json({ user, token }, { status: 201 });
    
    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    const status = error.message === 'DB_DUPLICATE_EMAIL' ? 409 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status }
    );
  }
}
