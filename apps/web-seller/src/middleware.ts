import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Vérifier si le cookie de connexion existe
  const isAuthenticated = request.cookies.has('kalagban_seller_auth');
  const isAuthPage = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/register') || 
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password');

  // Si on n'est pas connecté et qu'on essaie d'accéder au dashboard, redirection vers /login
  if (!isAuthenticated && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si on est déjà connecté et qu'on essaie d'aller sur une page d'auth, redirection vers / (dashboard)
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Configurer le middleware pour s'exécuter sur toutes les pages sauf les fichiers statiques (images, css, etc.)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
