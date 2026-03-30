// Placeholder for NextAuth - to be configured later
export const dynamic = 'force-dynamic';

const handler = async () => {
  return new Response('Auth not configured', { status: 501 });
};

export { handler as GET, handler as POST };
