// Placeholder for NextAuth - to be configured later
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response('Auth not configured', { status: 501 });
}

export async function POST() {
  return new Response('Auth not configured', { status: 501 });
}
