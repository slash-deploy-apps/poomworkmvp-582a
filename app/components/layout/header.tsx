import { Link, useLoaderData } from 'react-router';
import { Briefcase, Menu, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';

export function Header({ user }: { user?: { id: string; name: string | null; email: string; role: string } | null }) {
  const navLinks = [
    { label: '일거리', href: '/jobs' },
    { label: '인력찾기', href: '/workers' },
    { label: '교육', href: '/courses' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">poomwork</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {(user.name || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-gray-500">{user.role === 'worker' ? '인력 제공자' : user.role === 'client' ? '일거리 제공자' : '관리자'}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">내 대시보드</Link>
                </DropdownMenuItem>
                {user.role === 'worker' && (
                  <DropdownMenuItem asChild>
                    <Link to={`/workers/${user.id}`}>내 프로필</Link>
                  </DropdownMenuItem>
                )}
                {user.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">관리자</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/api/auth/sign-out" data-method="POST">로그아웃</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to="/login">로그인</Link>
              </Button>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to="/register">회원가입</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link key={link.href} to={link.href} className="text-base font-medium text-gray-700 hover:text-blue-600">
                    {link.label}
                  </Link>
                ))}
                <div className="border-t pt-4 mt-2">
                  {user ? (
                    <>
                      <Link to="/dashboard" className="block py-2 text-base font-medium text-gray-700">대시보드</Link>
                      <a href="/api/auth/sign-out" data-method="POST" className="block py-2 text-base font-medium text-gray-700">로그아웃</a>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="block py-2 text-base font-medium text-gray-700">로그인</Link>
                      <Link to="/register" className="block py-2 text-base font-medium text-blue-600">회원가입</Link>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}