import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const cookieStore = cookies();
  
  // Explicitly delete with all common options to ensure it's cleared
  cookieStore.delete({
    name: 'token',
    path: '/',
  });
  
  // Force revalidate the dashboard area
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard');
  
  redirect('/login');
}
