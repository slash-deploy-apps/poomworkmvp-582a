import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { todos } from '~/db/schema';

function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE todo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  return drizzle(sqlite, { schema: { todos } });
}

describe('Todo CRUD', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates a todo', () => {
    db.insert(todos).values({ text: 'Test todo' }).run();
    const result = db.select().from(todos).all();
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe('Test todo');
    expect(result[0]!.completed).toBe(0);
  });

  it('toggles a todo', () => {
    db.insert(todos).values({ text: 'Toggle me' }).run();
    const [todo] = db.select().from(todos).all();

    db.update(todos)
      .set({ completed: todo!.completed ? 0 : 1 })
      .where(eq(todos.id, todo!.id))
      .run();

    const [updated] = db.select().from(todos).all();
    expect(updated!.completed).toBe(1);
  });

  it('deletes a todo', () => {
    db.insert(todos).values({ text: 'Delete me' }).run();
    const [todo] = db.select().from(todos).all();

    db.delete(todos).where(eq(todos.id, todo!.id)).run();

    const result = db.select().from(todos).all();
    expect(result).toHaveLength(0);
  });

  it('creates multiple todos and returns them all', () => {
    db.insert(todos).values({ text: 'First' }).run();
    db.insert(todos).values({ text: 'Second' }).run();
    db.insert(todos).values({ text: 'Third' }).run();

    const result = db.select().from(todos).all();
    expect(result).toHaveLength(3);
  });
});
