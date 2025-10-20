const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { parseCGIText } = require('./parser');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(OUTPUT_DIR, 'cgi.db');

function normalizeContextValue(value) {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildDatabase() {
  const { articles, tags } = parseCGIText();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const db = new Database(DB_PATH);

  try {
    db.pragma('foreign_keys = ON');
    db.exec(`
      DROP TABLE IF EXISTS article_references;
      DROP TABLE IF EXISTS article_tags;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS articles;

      CREATE TABLE articles (
        id TEXT PRIMARY KEY,
        number TEXT,
        title TEXT,
        content TEXT,
        summary TEXT,
        order_index INTEGER,
        sort_key REAL,
        context_livre TEXT,
        context_partie TEXT,
        context_titre TEXT,
        context_chapitre TEXT,
        context_section TEXT,
        context_sous_section TEXT,
        search_text TEXT
      );

      CREATE TABLE tags (
        name TEXT PRIMARY KEY
      );

      CREATE TABLE article_tags (
        article_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (article_id, tag),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (tag) REFERENCES tags(name) ON DELETE CASCADE
      );

      CREATE TABLE article_references (
        article_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        label TEXT NOT NULL,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES articles(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_articles_sort_key ON articles(sort_key);
      CREATE INDEX idx_articles_order ON articles(order_index);
      CREATE INDEX idx_articles_title ON articles(title);
      CREATE INDEX idx_articles_search ON articles(search_text);
      CREATE INDEX idx_article_tags_tag ON article_tags(tag);
      CREATE INDEX idx_refs_article ON article_references(article_id);
    `);

    const insertArticle = db.prepare(`
      INSERT INTO articles (
        id,
        number,
        title,
        content,
        summary,
        order_index,
        sort_key,
        context_livre,
        context_partie,
        context_titre,
        context_chapitre,
        context_section,
        context_sous_section,
        search_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
    const insertArticleTag = db.prepare('INSERT OR IGNORE INTO article_tags (article_id, tag) VALUES (?, ?)');
    const insertReference = db.prepare('INSERT INTO article_references (article_id, target_id, label) VALUES (?, ?, ?)');

    const transaction = db.transaction(() => {
      tags.forEach((tag) => insertTag.run(tag));

      for (const article of articles) {
        const context = article.context || {};
        insertArticle.run(
          article.id,
          article.number,
          article.title,
          article.content,
          article.summary,
          article.order,
          article.sortKey,
          normalizeContextValue(context.livre),
          normalizeContextValue(context.partie),
          normalizeContextValue(context.titre),
          normalizeContextValue(context.chapitre),
          normalizeContextValue(context.section),
          normalizeContextValue(context.sousSection),
          article.searchText
        );
      }

      for (const article of articles) {
        for (const tag of article.tags) {
          insertTag.run(tag);
          insertArticleTag.run(article.id, tag);
        }

        for (const reference of article.references) {
          insertReference.run(article.id, reference.articleId, reference.label);
        }
      }
    });

    transaction();

    console.log(`Base SQLite générée avec ${articles.length} articles à l'emplacement ${DB_PATH}`);
  } finally {
    db.close();
  }
}

module.exports = { buildDatabase };

if (require.main === module) {
  buildDatabase();
}
