import { NextResponse } from 'next/server';
import { authenticateUser } from '@/backend/services/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { token, user } = await authenticateUser(email, password);

    const response = NextResponse.json({ user });

    // Set HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    // Force revalidate the dashboard to ensure fresh data
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard');

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
