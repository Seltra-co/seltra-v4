// import { NextRequest, NextResponse } from 'next/server'

// const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'seltra.store'

// export function middleware(req: NextRequest) {
//   const url      = req.nextUrl.clone()
//   const host     = req.headers.get('host') ?? ''
//   const hostname = host.replace(/:\d+$/, '')

//   if (hostname === 'localhost' || hostname === '127.0.0.1') return NextResponse.next()
//   if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) return NextResponse.next()
//   if (hostname.endsWith('.vercel.app')) return NextResponse.next()

//   if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
//     const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '')
//     const RESERVED  = ['www', 'app', 'api', 'dashboard', 'admin']
//     if (RESERVED.includes(subdomain)) return NextResponse.next()
//     url.pathname = `/store/${subdomain}${url.pathname}`
//     return NextResponse.rewrite(url)
//   }

//   url.pathname = `/store/${hostname}${url.pathname}`
//   return NextResponse.rewrite(url)
// }

// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
// }
import { NextResponse } from 'next/server'

export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}