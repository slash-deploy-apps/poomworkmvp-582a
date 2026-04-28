import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../app/db/schema';
import { eq } from 'drizzle-orm';

const sqlite = new Database('sqlite.db');
sqlite.pragma("journal_mode = 'WAL'");
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  // Categories
  const categoryData = [
    { name: 'IT·개발', slug: 'it-dev', icon: 'Code', sortOrder: 1 },
    { name: '디자인', slug: 'design', icon: 'Palette', sortOrder: 2 },
    { name: '마케팅', slug: 'marketing', icon: 'Megaphone', sortOrder: 3 },
    { name: '영상·사진', slug: 'video-photo', icon: 'Video', sortOrder: 4 },
    { name: '번역·통역', slug: 'translation', icon: 'Languages', sortOrder: 5 },
    { name: '교육', slug: 'education', icon: 'GraduationCap', sortOrder: 6 },
    { name: '컨설팅', slug: 'consulting', icon: 'Lightbulb', sortOrder: 7 },
    { name: '기타', slug: 'other', icon: 'MoreHorizontal', sortOrder: 8 },
  ];

  for (const cat of categoryData) {
    await db.insert(schema.categories).values(cat).onConflictDoNothing();
  }
  console.log('✅ Categories seeded');

  // Admin user
  const [adminUser] = await db.insert(schema.user).values({
    name: '관리자',
    email: 'admin@poomwork.com',
    role: 'admin',
    bio: 'poomwork 플랫폼 관리자입니다.',
    rating: 5,
  }).returning();

  // Client users
  const clients = await db.insert(schema.user).values([
    { name: '김대표', email: 'client1@test.com', role: 'client', bio: '스타트업 CEO입니다. 다양한 IT 프로젝트를 진행하고 있습니다.', location: '서울', rating: 4.5, reviewCount: 12 },
    { name: '이매니저', email: 'client2@test.com', role: 'client', bio: '중소기업 마케팅 팀장입니다.', location: '부산', rating: 4.2, reviewCount: 8 },
    { name: '박이사', email: 'client3@test.com', role: 'client', bio: 'IT 기업 개발 이사입니다.', location: '서울', rating: 4.8, reviewCount: 15 },
  ]).returning();
  console.log('✅ Client users seeded');

  // Worker users
  const workers = await db.insert(schema.user).values([
    { name: '한개발', email: 'worker1@test.com', role: 'worker', bio: '10년차 풀스택 개발자입니다. React, Node.js 전문.', skills: 'React,Node.js,TypeScript,Python,AWS', location: '서울', rating: 4.9, reviewCount: 23 },
    { name: '최디자인', email: 'worker2@test.com', role: 'worker', bio: 'UI/UX 디자이너입니다. Figma와 Adobe 제품군에 능숙합니다.', skills: 'Figma,Photoshop,Illustrator,UI/UX', location: '서울', rating: 4.7, reviewCount: 18 },
    { name: '정마케터', email: 'worker3@test.com', role: 'worker', bio: '디지털 마케팅 전문가입니다. SEO, SNS 마케팅 강점.', skills: 'SEO,SNS마케팅,Google Ads,콘텐츠마케팅', location: '대전', rating: 4.5, reviewCount: 14 },
    { name: '윤영상', email: 'worker4@test.com', role: 'worker', bio: '영상 제작 및 편집 전문가입니다.', skills: 'Premiere Pro,After Effects,유튜브,모션그래픽', location: '인천', rating: 4.6, reviewCount: 10 },
    { name: '강번역', email: 'worker5@test.com', role: 'worker', bio: '영한/한영 번역 전문가입니다.', skills: '영어,일본어,번역,통역', location: '서울', rating: 4.8, reviewCount: 20 },
    { name: '송데이터', email: 'worker6@test.com', role: 'worker', bio: '데이터 분석가 및 AI 엔지니어입니다.', skills: 'Python,TensorFlow,SQL,데이터분석,머신러닝', location: '수원', rating: 4.4, reviewCount: 7 },
  ]).returning();
  console.log('✅ Worker users seeded');

  // Sample jobs
  const allCategories = await db.select().from(schema.categories);
  const jobsData = [
    { clientId: clients[0].id, categoryId: allCategories[0].id, title: 'React 웹앱 개발', description: '기존 웹사이트를 React로 리빌딩하는 프로젝트입니다.\n\n주요 기능:\n- 사용자 인증 시스템\n- 대시보드 구현\n- API 연동\n- 반응형 디자인\n\n3년 이상 React 경력자 우대합니다.', budgetMin: 5000000, budgetMax: 10000000, budgetType: 'fixed', duration: '3개월', status: 'open', urgency: 'high', requirements: 'React,TypeScript,Node.js', location: '서울', isRemote: 1, views: 45, applicationCount: 3 },
    { clientId: clients[0].id, categoryId: allCategories[0].id, title: '모바일 앱 백엔드 API 개발', description: '모바일 앱을 위한 RESTful API 서버를 개발합니다.\n\n기술 스택: Node.js + Express 또는 Python + FastAPI\n데이터베이스: PostgreSQL\n인증: JWT\n\n소셜 로그인, 푸시 알림, 결제 연동 포함.', budgetMin: 8000000, budgetMax: 15000000, budgetType: 'fixed', duration: '6개월', status: 'open', urgency: 'medium', requirements: 'Node.js,Python,PostgreSQL,REST API', location: '서울', isRemote: 1, views: 32, applicationCount: 2 },
    { clientId: clients[1].id, categoryId: allCategories[2].id, title: 'SNS 마케팅 전략 수립 및 실행', description: '신규 브랜드 런칭을 위한 SNS 마케팅 전략을 수립하고 실행해주실 분을 찾습니다.\n\n- 인스타그램, 틱톡 중심\n- 콘텐츠 기획 및 제작\n- 광고 소재 기획\n- 월간 리포트 작성', budgetMin: 2000000, budgetMax: 4000000, budgetType: 'fixed', duration: '3개월', status: 'open', urgency: 'medium', requirements: 'SNS마케팅,콘텐츠기획,Instagram', isRemote: 1, views: 28, applicationCount: 5 },
    { clientId: clients[2].id, categoryId: allCategories[1].id, title: '기업 홈페이지 리뉴얼 디자인', description: '기업 소개 홈페이지를 모던하게 리뉴얼하고자 합니다.\n\n- 반응형 웹 디자인\n- 브랜드 아이덴티티 반영\n- 10페이지 내외\n- 디자인 시스템 구축\n\nFigma 시안 우선 작업 후 개발사 연계 예정입니다.', budgetMin: 3000000, budgetMax: 6000000, budgetType: 'fixed', duration: '1개월', status: 'open', urgency: 'high', requirements: 'Figma,Web Design,UI/UX', location: '서울', isRemote: 0, views: 55, applicationCount: 7 },
    { clientId: clients[1].id, categoryId: allCategories[3].id, title: '제품 홍보 영상 제작', description: '신제품 런칭 홍보 영상을 제작해주실 분을 찾습니다.\n\n- 30초~1분 분량\n- 모션그래픽 포함\n- BGM 및 효과음\n- SNS용 세로형/가로형 버전', budgetMin: 1500000, budgetMax: 3000000, budgetType: 'fixed', duration: '2주일', status: 'open', urgency: 'low', requirements: 'Premiere Pro,After Effects,모션그래픽', isRemote: 1, views: 19, applicationCount: 4 },
    { clientId: clients[2].id, categoryId: allCategories[0].id, title: '데이터 분석 대시보드 구축', description: '사내 데이터 분석을 위한 대시보드를 구축합니다.\n\n- 실시간 데이터 시각화\n- 다양한 차트 타입\n- 데이터 필터링 및 내보내기\n- 관리자/일반 사용자 권한 분리\n\n기존 데이터베이스 연동 필요합니다.', budgetMin: 5000000, budgetMax: 80000000, budgetType: 'negotiable', duration: '3개월', status: 'open', urgency: 'medium', requirements: 'Python,SQL,Tableau,React', location: '서울', isRemote: 1, views: 38, applicationCount: 2 },
  ];
  const insertedJobs = await db.insert(schema.jobs).values(jobsData).returning();
  console.log('✅ Jobs seeded');

  // Sample portfolios
  const portfoliosData = [
    { workerId: workers[0].id, title: '이커머스 플랫폼 개발', description: '대형 이커머스 플랫폼을 풀스택으로 개발했습니다. 일일 방문자 10만 명 이상 처리 가능한 아키텍처를 설계했습니다.', skills: 'React,Node.js,PostgreSQL,AWS', imageUrl: '/placeholder-portfolio.svg' },
    { workerId: workers[0].id, title: '실시간 채팅 애플리케이션', description: 'WebSocket 기반 실시간 채팅 앱을 개발했습니다. 파일 공유, 이모티콘, 그룹 채팅 기능 포함.', skills: 'React,WebSocket,Redis', imageUrl: '/placeholder-portfolio.svg' },
    { workerId: workers[1].id, title: '금융 앱 UI 리디자인', description: '기존 금융 앱의 UX/UI를 전면 리디자인하여 사용자 만족도 40% 향상시켰습니다.', skills: 'Figma,UI/UX,Prototyping', imageUrl: '/placeholder-portfolio.svg' },
    { workerId: workers[1].id, title: '디자인 시스템 구축', description: '50개 이상의 컴포넌트를 포함한 디자인 시스템을 구축했습니다.', skills: 'Figma,Design System,Storybook', imageUrl: '/placeholder-portfolio.svg' },
    { workerId: workers[2].id, title: 'D2C 브랜드 마케팅 캠페인', description: 'D2C 화장품 브랜드의 인스타그램 마케팅을 담당하여 팔로워 300% 증가를 달성했습니다.', skills: 'Instagram,Google Ads,콘텐츠마케팅' },
    { workerId: workers[3].id, title: '기업 PR 영상 시리즈', description: '중견기업의 기업 PR 영상 5편을 기획부터 편집까지 전담했습니다.', skills: 'Premiere Pro,After Effects,기획' },
  ];
  await db.insert(schema.portfolios).values(portfoliosData);
  console.log('✅ Portfolios seeded');

  // Sample courses
  const coursesData = [
    {
      title: 'React 완벽 가이드: 기초부터 실전까지',
      description: 'React의 기본 개념부터 실제 프로젝트 적용까지 체계적으로 배우는 강좌입니다. JSX, 컴포넌트, 상태 관리, 라우팅, API 연동 등 실무에 바로 적용할 수 있는 내용을 다룹니다.',
      instructorId: workers[0].id,
      categoryId: allCategories[0].id,
      price: 49000,
      level: 'beginner',
      duration: '12시간',
      rating: 4.8,
      reviewCount: 156,
      enrollmentCount: 1234,
      status: 'published',
    },
    {
      title: 'Figma 마스터 클래스: UI/UX 디자인 실무',
      description: 'Figma를 활용한 UI/UX 디자인 실무 과정입니다. 오토 레이아웃, 컴포넌트, 프로토타이핑, 디자인 시스템 구축 등 실무에 필요한 모든 기능을 배웁니다.',
      instructorId: workers[1].id,
      categoryId: allCategories[1].id,
      price: 59000,
      level: 'intermediate',
      duration: '8시간',
      rating: 4.7,
      reviewCount: 89,
      enrollmentCount: 856,
      status: 'published',
    },
    {
      title: '디지털 마케팅 입문: SEO부터 광고까지',
      description: '디지털 마케팅의 기초부터 실전 캠페인 운영까지 배우는 강좌입니다. SEO 최적화, SNS 마케팅, Google Ads, 콘텐츠 마케팅 전략을 다룹니다.',
      instructorId: workers[2].id,
      categoryId: allCategories[2].id,
      price: 0,
      level: 'beginner',
      duration: '6시간',
      rating: 4.5,
      reviewCount: 203,
      enrollmentCount: 2341,
      status: 'published',
    },
    {
      title: 'Premiere Pro 영상 편집 실무',
      description: 'Adobe Premiere Pro를 활용한 전문적인 영상 편집 기법을 배웁니다. 컷 편집, 컬러 그레이딩, 오디오 믹싱, 모션 그래픽 등을 다룹니다.',
      instructorId: workers[3].id,
      categoryId: allCategories[3].id,
      price: 69000,
      level: 'intermediate',
      duration: '10시간',
      rating: 4.6,
      reviewCount: 67,
      enrollmentCount: 543,
      status: 'published',
    },
    {
      title: 'Python 데이터 분석 실전 프로젝트',
      description: 'Python을 활용한 데이터 분석 실전 과정입니다. Pandas, NumPy, Matplotlib을 사용하여 실제 데이터셋을 분석하고 시각화하는 방법을 배웁니다.',
      instructorId: workers[5].id,
      categoryId: allCategories[0].id,
      price: 39000,
      level: 'advanced',
      duration: '15시간',
      rating: 4.9,
      reviewCount: 112,
      enrollmentCount: 789,
      status: 'published',
    },
    {
      title: '비즈니스 영어 번역 실무',
      description: '비즈니스 문서, 이메일, 프레젠테이션 영한/한영 번역 실무 기법을 배웁니다.',
      instructorId: workers[4].id,
      categoryId: allCategories[4].id,
      price: 29000,
      level: 'intermediate',
      duration: '5시간',
      rating: 4.4,
      reviewCount: 45,
      enrollmentCount: 321,
      status: 'published',
    },
  ];
  const insertedCourses = await db.insert(schema.courses).values(coursesData).returning();
  console.log('✅ Courses seeded');

  // Sample chapters and lessons for each course
  for (const course of insertedCourses) {
    const chapters = await db.insert(schema.courseChapters).values([
      { courseId: course.id, title: '오리엔테이션', sortOrder: 0 },
      { courseId: course.id, title: '기본 개념 이해하기', sortOrder: 1 },
      { courseId: course.id, title: '실전 프로젝트', sortOrder: 2 },
      { courseId: course.id, title: '심화 학습', sortOrder: 3 },
    ]).returning();

    const lessonTemplate = [
      // Chapter 1: Orientation
      { chapterId: chapters[0].id, courseId: course.id, title: '강좌 소개 및 학습 가이드', duration: 180, sortOrder: 0, isFree: 1 },
      { chapterId: chapters[0].id, courseId: course.id, title: '개발 환경 설정하기', duration: 600, sortOrder: 1, isFree: 1 },
      // Chapter 2: Basics
      { chapterId: chapters[1].id, courseId: course.id, title: '핵심 개념 이해', duration: 900, sortOrder: 0, isFree: 0 },
      { chapterId: chapters[1].id, courseId: course.id, title: '기본 실습', duration: 1200, sortOrder: 1, isFree: 0 },
      { chapterId: chapters[1].id, courseId: course.id, title: '응용 실습', duration: 1500, sortOrder: 2, isFree: 0 },
      // Chapter 3: Project
      { chapterId: chapters[2].id, courseId: course.id, title: '프로젝트 기획', duration: 600, sortOrder: 0, isFree: 0 },
      { chapterId: chapters[2].id, courseId: course.id, title: '프로젝트 구현 1', duration: 2400, sortOrder: 1, isFree: 0 },
      { chapterId: chapters[2].id, courseId: course.id, title: '프로젝트 구현 2', duration: 2400, sortOrder: 2, isFree: 0 },
      // Chapter 4: Advanced
      { chapterId: chapters[3].id, courseId: course.id, title: '심화 기법 배우기', duration: 1800, sortOrder: 0, isFree: 0 },
      { chapterId: chapters[3].id, courseId: course.id, title: '실무 팁과 마무리', duration: 900, sortOrder: 1, isFree: 0 },
    ];
    await db.insert(schema.courseLessons).values(lessonTemplate);
  }
  console.log('✅ Chapters and lessons seeded');

  // Sample job applications
  const applicationsData = [
    { jobId: insertedJobs[0].id, workerId: workers[0].id, coverLetter: 'React 개발 경력 10년으로, 유사한 프로젝트를 다수 진행했습니다. 기존 코드 마이그레이션 경험도 풍부합니다.', proposedBudget: 8000000, proposedDuration: '3개월', status: 'pending' },
    { jobId: insertedJobs[0].id, workerId: workers[5].id, coverLetter: '풀스택 개발자로서 React와 Node.js 모두 능숙합니다. 데이터 처리 경험도 있습니다.', proposedBudget: 7000000, proposedDuration: '3개월', status: 'pending' },
    { jobId: insertedJobs[3].id, workerId: workers[1].id, coverLetter: 'Figma를 활용한 웹 디자인 전문가입니다. 기업 홈페이지 리뉴얼 경험이 5건 이상 있습니다.', proposedBudget: 4500000, proposedDuration: '1개월', status: 'accepted' },
    { jobId: insertedJobs[2].id, workerId: workers[2].id, coverLetter: 'SNS 마케팅 전문가로서 다수의 D2C 브랜드 마케팅을 성공적으로 진행했습니다.', proposedBudget: 3000000, proposedDuration: '3개월', status: 'pending' },
  ];
  await db.insert(schema.jobApplications).values(applicationsData);
  console.log('✅ Job applications seeded');

  // Sample enrollments
  const enrollmentsData = [
    { userId: workers[1].id, courseId: insertedCourses[0].id, progress: 65 },
    { userId: workers[2].id, courseId: insertedCourses[1].id, progress: 30 },
    { userId: clients[0].id, courseId: insertedCourses[2].id, progress: 100, completedAt: new Date() },
  ];
  await db.insert(schema.enrollments).values(enrollmentsData);
  console.log('✅ Enrollments seeded');

  // Sample payments
  const paymentsData = [
    { payerId: clients[0].id, payeeId: workers[0].id, amount: 8000000, type: 'job_payment', status: 'escrow', referenceId: insertedJobs[0].id, paymentMethod: 'card' },
    { payerId: clients[1].id, payeeId: workers[1].id, amount: 4500000, type: 'job_payment', status: 'completed', referenceId: insertedJobs[3].id, paymentMethod: 'bank_transfer', escrowReleasedAt: new Date() },
    { payerId: workers[1].id, amount: 49000, type: 'course_purchase', status: 'completed', referenceId: insertedCourses[0].id, paymentMethod: 'card' },
    { payerId: clients[0].id, amount: 0, type: 'course_purchase', status: 'completed', referenceId: insertedCourses[2].id, paymentMethod: 'card' },
  ];
  await db.insert(schema.payments).values(paymentsData);
  console.log('✅ Payments seeded');

  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('Test accounts:');
  console.log('  Admin: admin@poomwork.com');
  console.log('  Client: client1@test.com, client2@test.com, client3@test.com');
  console.log('  Worker: worker1@test.com ~ worker6@test.com');
  console.log('  Password: (use sign up to create new accounts)');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});