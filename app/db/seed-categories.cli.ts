import Database from 'better-sqlite3';

const KMONG_CATEGORIES = [
  { name: '디자인', slug: 'design', icon: '🎨', sortOrder: 1 },
  { name: 'IT·프로그래밍', slug: 'it-programming', icon: '💻', sortOrder: 2 },
  { name: '영상·사진·음향', slug: 'video-photo', icon: '🎬', sortOrder: 3 },
  { name: '마케팅', slug: 'marketing', icon: '📢', sortOrder: 4 },
  { name: '번역·통역', slug: 'translation', icon: '🌍', sortOrder: 5 },
  { name: '문서·글쓰기', slug: 'writing', icon: '📝', sortOrder: 6 },
  { name: '창업·비즈니스', slug: 'business', icon: '💼', sortOrder: 7 },
  { name: '직무 전문가', slug: 'professional', icon: '👔', sortOrder: 8 },
] as const;

const sqlite = new Database('sqlite.db');
sqlite.pragma('journal_mode = WAL');

const findStmt = sqlite.prepare('SELECT id FROM categories WHERE slug = ?');
const insertStmt = sqlite.prepare('INSERT INTO categories (name, slug, icon, sortOrder) VALUES (?, ?, ?, ?)');

for (const cat of KMONG_CATEGORIES) {
  const existing = findStmt.get(cat.slug);
  if (!existing) {
    insertStmt.run(cat.name, cat.slug, cat.icon, cat.sortOrder);
    console.log(`✓ Inserted category: ${cat.name} (${cat.slug})`);
  } else {
    console.log(`→ Skipped existing: ${cat.name} (${cat.slug})`);
  }
}

console.log('Category seeding complete.');
sqlite.close();