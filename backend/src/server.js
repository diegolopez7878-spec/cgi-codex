const fs = require('fs');
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const path = require('path');
const Database = require('better-sqlite3');
const { normalizeText } = require('./parser');

const PORT = process.env.PORT || 4000;

const DB_PATH = path.resolve(__dirname, '..', 'data', 'cgi.db');

if (!fs.existsSync(DB_PATH)) {
  console.log("Base SQLite introuvable, reconstruction en cours...");
  try {
    const { buildDatabase } = require('./buildDatabase');
    buildDatabase();
  } catch (error) {
    console.error("Échec de la reconstruction de la base SQLite.", error);
    process.exit(1);
  }
}

let db;

try {
  db = new Database(DB_PATH, { readonly: true });
} catch (error) {
  console.error(`Impossible d'ouvrir la base SQLite à ${DB_PATH}.`, error);
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

function buildFilters({ searchTerm, tag }) {
  const joins = [];
  const conditions = [];
  const params = [];

  if (tag) {
    joins.push('INNER JOIN article_tags at_filter ON at_filter.article_id = a.id');
    conditions.push('at_filter.tag = ?');
    params.push(tag);
  }

  if (searchTerm) {
    const normalizedTerm = normalizeText(searchTerm);
    if (normalizedTerm) {
      normalizedTerm.split(' ').forEach((term) => {
        conditions.push('a.search_text LIKE ?');
        params.push(`%${term}%`);
      });
    }
  }

  return {
    joins: joins.join(' '),
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function mapArticleRow(row) {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    summary: row.summary,
    tags: row.tags ? row.tags.split('|||').filter(Boolean) : [],
    context: {
      livre: row.context_livre || '',
      partie: row.context_partie || '',
      titre: row.context_titre || '',
      chapitre: row.context_chapitre || '',
      section: row.context_section || '',
      sousSection: row.context_sous_section || '',
    },
  };
}

const tagListStmt = db.prepare('SELECT name FROM tags ORDER BY name ASC');
const healthStmt = db.prepare('SELECT COUNT(*) as total FROM articles');
const articleDetailStmt = db.prepare(`
  SELECT
    a.id,
    a.number,
    a.title,
    a.content,
    a.summary,
    a.context_livre,
    a.context_partie,
    a.context_titre,
    a.context_chapitre,
    a.context_section,
    a.context_sous_section
  FROM articles a
  WHERE a.id = ?
`);
const articleTagsStmt = db.prepare('SELECT tag FROM article_tags WHERE article_id = ? ORDER BY tag ASC');
const articleReferencesStmt = db.prepare(`
  SELECT ar.label, ar.target_id, t.number, t.title, t.summary
  FROM article_references ar
  LEFT JOIN articles t ON t.id = ar.target_id
  WHERE ar.article_id = ?
  ORDER BY t.sort_key ASC
`);

app.get('/api/health', (_req, res) => {
  const { total } = healthStmt.get();
  res.json({ status: 'ok', articles: total });
});

app.get('/api/tags', (_req, res) => {
  const rows = tagListStmt.all();
  res.json({ tags: rows.map((row) => row.name) });
});

app.get('/api/search/suggestions', (req, res) => {
  const query = req.query.q || '';
  const normalized = normalizeText(String(query));
  if (!normalized) {
    return res.json({ suggestions: [] });
  }
  const terms = normalized.split(' ');
  const conditions = terms.map(() => 'search_text LIKE ?').join(' AND ');
  const params = terms.map((term) => `%${term}%`);
  const stmt = db.prepare(`
    SELECT id, number, title, summary
    FROM articles
    WHERE ${conditions}
    ORDER BY sort_key ASC
    LIMIT 8
  `);
  const suggestions = stmt.all(...params).map((row) => ({
    id: row.id,
    number: row.number,
    title: row.title,
    summary: row.summary,
  }));
  res.json({ suggestions });
});

app.get('/api/articles', (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 12, 1), 100);
  const sortField = ['number', 'title', 'order'].includes(req.query.sortField)
    ? req.query.sortField
    : 'number';
  const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
  const tag = req.query.tag ? String(req.query.tag) : '';
  const searchTerm = req.query.search ? String(req.query.search) : '';

  const { joins, where, params } = buildFilters({ searchTerm, tag });

  const countStmt = db.prepare(`
    SELECT COUNT(*) AS total
    FROM (
      SELECT a.id
      FROM articles a
      ${joins}
      ${where}
      GROUP BY a.id
    )
  `);
  const { total } = countStmt.get(...params);

  const orderColumn =
    sortField === 'title'
      ? 'a.title COLLATE NOCASE'
      : sortField === 'number'
      ? 'a.sort_key'
      : 'a.order_index';
  const orderDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

  const listStmt = db.prepare(`
    SELECT
      a.id,
      a.number,
      a.title,
      a.summary,
      a.context_livre,
      a.context_partie,
      a.context_titre,
      a.context_chapitre,
      a.context_section,
      a.context_sous_section,
      GROUP_CONCAT(at.tag, '|||') AS tags
    FROM articles a
    ${joins}
    LEFT JOIN article_tags at ON at.article_id = a.id
    ${where}
    GROUP BY a.id
    ORDER BY ${orderColumn} ${orderDirection}
    LIMIT ? OFFSET ?
  `);

  const items = listStmt.all(...params, pageSize, (page - 1) * pageSize).map(mapArticleRow);

  res.json({
    page,
    pageSize,
    total,
    pages: Math.ceil(total / pageSize),
    items,
  });
});

app.get('/api/articles/:id', (req, res) => {
  const row = articleDetailStmt.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Article introuvable' });
  }
  const tags = articleTagsStmt.all(req.params.id).map((tagRow) => tagRow.tag);
  const references = articleReferencesStmt
    .all(req.params.id)
    .filter((ref) => ref.target_id)
    .map((ref) => ({
      label: ref.label,
      articleId: ref.target_id,
      number: ref.number,
      title: ref.title,
      summary: ref.summary,
    }));
  res.json({
    id: row.id,
    number: row.number,
    title: row.title,
    content: row.content,
    tags,
    context: {
      livre: row.context_livre || '',
      partie: row.context_partie || '',
      titre: row.context_titre || '',
      chapitre: row.context_chapitre || '',
      section: row.context_section || '',
      sousSection: row.context_sous_section || '',
    },
    references: references.map((ref) => ({ label: ref.label, articleId: ref.articleId })),
  });
});

app.get('/api/articles/:id/references', (req, res) => {
  const rows = articleReferencesStmt
    .all(req.params.id)
    .filter((ref) => ref.target_id)
    .map((ref) => ({
      id: ref.target_id,
      number: ref.number,
      title: ref.title,
      summary: ref.summary,
    }));
  if (rows.length === 0) {
    const exists = articleDetailStmt.get(req.params.id);
    if (!exists) {
      return res.status(404).json({ error: 'Article introuvable' });
    }
  }
  res.json({ references: rows });
});

app.get('/api/articles/:id/pdf', (req, res) => {
  const row = articleDetailStmt.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Article introuvable' });
  }

  const references = articleReferencesStmt
    .all(req.params.id)
    .filter((ref) => ref.target_id)
    .map((ref) => ({ label: ref.label }));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${row.id}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text(`Article ${row.number}`, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(14).text(row.title, { bold: true });
  doc.moveDown();
  doc.fontSize(10).fillColor('#666');
  const breadcrumbs = [
    row.context_livre,
    row.context_partie,
    row.context_titre,
    row.context_chapitre,
    row.context_section,
    row.context_sous_section,
  ]
    .filter(Boolean)
    .join(' › ');
  if (breadcrumbs) {
    doc.text(breadcrumbs);
    doc.moveDown();
  }
  doc.fillColor('#000');
  row.content.split('\n').forEach((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      doc.moveDown();
    } else {
      doc.text(trimmed, { align: 'justify' });
    }
  });

  if (references.length) {
    doc.moveDown();
    doc.fontSize(11).text('Références :');
    doc.fontSize(10);
    references.forEach((reference) => {
      doc.text(`• Article ${reference.label}`);
    });
  }

  doc.end();
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.listen(PORT, () => {
  console.log(`CGI API disponible sur http://localhost:${PORT}`);
});
