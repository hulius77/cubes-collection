import { NextResponse } from 'next/server';

export function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';

  // Solo bloquear si la cadena contiene explícitamente "meta-externalagent"
  if (userAgent.toLowerCase().includes('meta-externalagent')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Permitir el paso a todo el resto del tráfico normal
  return NextResponse.next();
}

export const config = {
  // Aplicar a todas las rutas
  matcher: '/:path*',
};