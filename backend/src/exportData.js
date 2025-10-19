const fs = require('fs');
const path = require('path');
const { parseCGIText } = require('./parser');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUTPUT_DIR = path.join(BACKEND_ROOT, 'data');
const SOURCE_FILE = path.join(REPO_ROOT, 'cgi-2025-fr-brut.txt');

function resolveSourceLabel() {
  return path.relative(REPO_ROOT, SOURCE_FILE);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function exportToJSON(targetPath, dataset) {
  ensureDir(path.dirname(targetPath));
  const payload = {
    generatedAt: new Date().toISOString(),
    source: resolveSourceLabel(),
    tags: dataset.tags,
    articles: dataset.articles,
  };
  fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`JSON export écrit dans ${targetPath}`);
}

function exportToSQLite(targetPath, dataset) {
  // Charge dynamiquement la dépendance pour éviter les coûts inutiles
  const Database = require('better-sqlite3');

  ensureDir(path.dirname(targetPath));
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }

  const db = new Database(targetPath);
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE articles (
        id TEXT PRIMARY KEY,
        number TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        livre TEXT,
        partie TEXT,
        titre TEXT,
        chapitre TEXT,
        section TEXT,
        sous_section TEXT,
        order_index INTEGER,
        sort_key REAL,
        search_text TEXT
      );

      CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL UNIQUE
      );

      CREATE TABLE article_tags (
        article_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (article_id, tag_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE article_references (
        article_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        label TEXT NOT NULL,
        PRIMARY KEY (article_id, target_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES articles(id) ON DELETE CASCADE
      );
    `);

    const insertMetadata = db.prepare('INSERT INTO metadata(key, value) VALUES (?, ?)');
    const insertArticle = db.prepare(`
      INSERT INTO articles (
        id, number, title, content, summary,
        livre, partie, titre, chapitre, section, sous_section,
        order_index, sort_key, search_text
      )
      VALUES (@id, @number, @title, @content, @summary,
        @livre, @partie, @titre, @chapitre, @section, @sous_section,
        @order_index, @sort_key, @search_text)
    `);
    const insertTag = db.prepare('INSERT INTO tags(label) VALUES (?)');
    const insertArticleTag = db.prepare('INSERT OR IGNORE INTO article_tags(article_id, tag_id) VALUES (?, ?)');
    const insertReference = db.prepare('INSERT OR IGNORE INTO article_references(article_id, target_id, label) VALUES (?, ?, ?)');

    const tagIds = new Map();

    const insertAll = db.transaction(() => {
      insertMetadata.run('generated_at', new Date().toISOString());
      insertMetadata.run('source', resolveSourceLabel());

      dataset.tags.forEach((tag) => {
        const info = insertTag.run(tag);
        tagIds.set(tag, info.lastInsertRowid);
      });

      dataset.articles.forEach((article) => {
        insertArticle.run({
          id: article.id,
          number: article.number || null,
          title: article.title,
          content: article.content,
          summary: article.summary || null,
          livre: article.context?.livre || null,
          partie: article.context?.partie || null,
          titre: article.context?.titre || null,
          chapitre: article.context?.chapitre || null,
          section: article.context?.section || null,
          sous_section: article.context?.sousSection || null,
          order_index: article.order,
          sort_key: article.sortKey,
          search_text: article.searchText || null,
        });

        article.tags.forEach((tag) => {
          const tagId = tagIds.get(tag);
          if (tagId) {
            insertArticleTag.run(article.id, tagId);
          }
        });

        article.references.forEach((reference) => {
          if (reference.articleId) {
            insertReference.run(article.id, reference.articleId, reference.label);
          }
        });
      });
    });

    insertAll();
    console.log(`Base SQLite écrite dans ${targetPath}`);
  } finally {
    db.close();
  }
}

function parseArguments() {
  const args = process.argv.slice(2);
  const formats = new Set();
  let outputDir = DEFAULT_OUTPUT_DIR;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      return { help: true };
    }
    if (arg === '--format' || arg === '-f') {
      const value = args[i + 1];
      if (!value) {
        throw new Error('Option --format requiert une valeur.');
      }
      i += 1;
      value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .forEach((item) => formats.add(item));
      continue;
    }
    if (arg === '--json') {
      formats.add('json');
      continue;
    }
    if (arg === '--sqlite') {
      formats.add('sqlite');
      continue;
    }
    if (arg === '--output-dir' || arg === '-o') {
      const value = args[i + 1];
      if (!value) {
        throw new Error('Option --output-dir requiert une valeur.');
      }
      i += 1;
      outputDir = path.resolve(process.cwd(), value);
      continue;
    }
    throw new Error(`Option inconnue: ${arg}`);
  }

  if (formats.size === 0) {
    formats.add('json');
    formats.add('sqlite');
  }

  return { formats, outputDir };
}

function printHelp() {
  console.log(
    [
      'Usage: node src/exportData.js [options]',
      '',
      'Options:',
      '  --format, -f <json|sqlite|all>   Formats à générer (séparés par des virgules).',
      '  --json                          Raccourci pour ajouter le format JSON.',
      '  --sqlite                        Raccourci pour ajouter le format SQLite.',
      '  --output-dir, -o <chemin>       Dossier de sortie (par défaut backend/data).',
      '  --help, -h                      Affiche cette aide.',
      '',
    ].join('\n')
  );
}

function main() {
  let options;
  try {
    options = parseArguments();
  } catch (error) {
    console.error(error.message);
    printHelp();
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const formats = new Set(options.formats);
  if (formats.has('all')) {
    formats.delete('all');
    formats.add('json');
    formats.add('sqlite');
  }

  const dataset = parseCGIText();

  if (formats.has('json')) {
    const jsonPath = path.join(options.outputDir, 'cgi-2025.json');
    exportToJSON(jsonPath, dataset);
  }

  if (formats.has('sqlite')) {
    const sqlitePath = path.join(options.outputDir, 'cgi-2025.sqlite');
    exportToSQLite(sqlitePath, dataset);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  exportToJSON,
  exportToSQLite,
};
