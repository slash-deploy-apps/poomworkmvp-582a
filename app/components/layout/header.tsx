import { Link, useLoaderData } from 'react-router';
import { Briefcase, Menu } from 'lucide-react';
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
    <header className='sticky top-0 z-50 w-full px-4 pt-3 transition-all duration-300'>
      <div className='container mx-auto flex h-16 sm:h-20 items-center justify-between px-6 sm:px-8 rounded-[32px] sm:rounded-[40px] bg-white/70 backdrop-blur-xl shadow-clay-card'>
        <div className='flex items-center gap-8'>
          <Link to='/' className='flex items-center gap-2'>
            <Briefcase className='h-7 w-7 text-[#7C3AED]' />
            <span className='text-xl font-black text-[#332F3A]' style={{ fontFamily: "'Nunito', sans-serif" }}>poomwork</span>
          </Link>
          <nav className='hidden md:flex items-center gap-2'>
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className='rounded-[20px] px-4 py-2 text-sm font-medium text-[#635F69] hover:bg-[#7C3AED]/10 hover:text-[#7C3AED] transition-all duration-200'>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className='flex items-center gap-3'>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='relative h-10 w-10 rounded-full hover:bg-[#7C3AED]/10 transition-all duration-200'>
                  <Avatar className='h-10 w-10'>
                    <AvatarFallback className='bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white font-bold'>
                      {((user?.name ?? '') || (user?.email ?? '') || '?')[0]!.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-48' align='end'>
                <div className='px-2 py-1.5'>
                  <p className='text-sm font-medium text-[#332F3A]'>{user.name || user.email}</p>
                  <p className='text-xs text-[#635F69]'>{user.role === 'worker' ? '인력 제공자' : user.role === 'client' ? '일거리 제공자' : '관리자'}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to='/dashboard'>내 대시보드</Link>
                </DropdownMenuItem>
                {user.role === 'worker' && (
                  <DropdownMenuItem asChild>
                    <Link to={`/workers/${user.id}`}>내 프로필</Link>
                  </DropdownMenuItem>
                )}
                {user.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link to='/admin'>관리자</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action='/logout' method='POST'><button type='submit' className='w-full text-left'>로그아웃</button></form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className='hidden md:flex items-center gap-2'>
              <Button variant='ghost' asChild className='rounded-[20px] text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all duration-200'>
                <Link to='/login'>로그인</Link>
              </Button>
              <Button asChild className='rounded-[20px] bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clay-button hover:-translate-y-1 hover:shadow-clay-button-hover active:scale-[0.92] active:shadow-clay-pressed font-bold px-6 transition-all duration-200'>
                <Link to='/register'>회원가입</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className='md:hidden'>
              <Button variant='ghost' size='icon' className='text-[#332F3A] hover:bg-[#7C3AED]/10 rounded-[20px]'>
                <Menu className='h-5 w-5' />
              </Button>
            </SheetTrigger>
            <SheetContent side='right' className='w-72 bg-white/90 backdrop-blur-xl text-[#332F3A] border-[#7C3AED]/15 rounded-l-[32px]'>
              <nav className='flex flex-col gap-2 mt-8'>
                {navLinks.map((link) => (
                  <Link key={link.href} to={link.href} className='rounded-[20px] px-4 py-3 text-base font-medium text-[#635F69] hover:bg-[#7C3AED]/10 hover:text-[#7C3AED] transition-all duration-200'>
                    {link.label}
                  </Link>
                ))}
                <div className='pt-4 mt-2 space-y-1'>
                  {user ? (
                    <>
                      <Link to='/dashboard' className='block rounded-[20px] px-4 py-2 text-base font-medium text-[#635F69] hover:bg-[#7C3AED]/10'>대시보드</Link>
                      <form action='/logout' method='POST' className='block'><button type='submit' className='w-full text-left rounded-[20px] px-4 py-2 text-base font-medium text-[#635F69] hover:bg-[#7C3AED]/10'>로그아웃</button></form>
                    </>
                  ) : (
                    <>
                      <Link to='/login' className='block rounded-[20px] px-4 py-2 text-base font-medium text-[#635F69] hover:bg-[#7C3AED]/10'>로그인</Link>
                      <Link to='/register' className='block rounded-[20px] px-4 py-2 text-base font-bold text-[#7C3AED]'>회원가입</Link>
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