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
    <header className='sticky top-0 z-50 w-full border-b border-[#79747E]/20 bg-[#FFFBFE]/80 backdrop-blur-md transition-all duration-300'>
      <div className='container mx-auto flex h-16 items-center justify-between px-4'>
        <div className='flex items-center gap-8'>
          <Link to='/' className='flex items-center gap-2'>
            <Briefcase className='h-7 w-7 text-[#6750A4]' />
            <span className='text-xl font-bold text-[#1C1B1F]'>poomwork</span>
          </Link>
          <nav className='hidden md:flex items-center gap-2'>
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className='rounded-full px-4 py-2 text-sm font-medium text-[#49454F] hover:bg-[#6750A4]/10 transition-all duration-300 ease-in-out'>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className='flex items-center gap-3'>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='relative h-10 w-10 rounded-full hover:bg-[#6750A4]/10 transition-all duration-300'>
                  <Avatar className='h-10 w-10'>
                    <AvatarFallback className='bg-[#E8DEF8] text-[#1D192B] font-bold'>
                      {(user.name || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-48' align='end'>
                <div className='px-2 py-1.5'>
                  <p className='text-sm font-medium text-[#1C1B1F]'>{user.name || user.email}</p>
                  <p className='text-xs text-[#49454F]'>{user.role === 'worker' ? '인력 제공자' : user.role === 'client' ? '일거리 제공자' : '관리자'}</p>
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
                  <a href='/api/auth/sign-out' data-method='POST'>로그아웃</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className='hidden md:flex items-center gap-2'>
              <Button variant='ghost' asChild className='rounded-full text-[#6750A4] hover:bg-[#6750A4]/10 transition-all duration-300'>
                <Link to='/login'>로그인</Link>
              </Button>
              <Button asChild className='rounded-full bg-[#6750A4] text-white hover:bg-[#6750A4]/90 active:scale-95 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out px-6'>
                <Link to='/register'>회원가입</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className='md:hidden'>
              <Button variant='ghost' size='icon' className='text-[#1C1B1F] hover:bg-[#6750A4]/10 rounded-full'>
                <Menu className='h-5 w-5' />
              </Button>
            </SheetTrigger>
            <SheetContent side='right' className='w-72 bg-[#FFFBFE] text-[#1C1B1F] border-[#79747E]/20'>
              <nav className='flex flex-col gap-2 mt-8'>
                {navLinks.map((link) => (
                  <Link key={link.href} to={link.href} className='rounded-full px-4 py-3 text-base font-medium text-[#49454F] hover:bg-[#6750A4]/10 hover:text-[#6750A4] transition-all duration-300'>
                    {link.label}
                  </Link>
                ))}
                <div className='pt-4 mt-2 space-y-1'>
                  {user ? (
                    <>
                      <Link to='/dashboard' className='block rounded-full px-4 py-2 text-base font-medium text-[#49454F] hover:bg-[#6750A4]/10'>대시보드</Link>
                      <a href='/api/auth/sign-out' data-method='POST' className='block rounded-full px-4 py-2 text-base font-medium text-[#49454F] hover:bg-[#6750A4]/10'>로그아웃</a>
                    </>
                  ) : (
                    <>
                      <Link to='/login' className='block rounded-full px-4 py-2 text-base font-medium text-[#49454F] hover:bg-[#6750A4]/10'>로그인</Link>
                      <Link to='/register' className='block rounded-full px-4 py-2 text-base font-bold text-[#6750A4]'>회원가입</Link>
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