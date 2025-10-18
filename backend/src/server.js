const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const { parseCGIText, normalizeText } = require('./parser');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

const { articles, tags } = parseCGIText();

function filterArticles({ searchTerm, tag, sortField, sortOrder }) {
  let results = articles;

  if (searchTerm) {
    const normalizedTerm = normalizeText(searchTerm);
    if (normalizedTerm.length > 0) {
      const terms = normalizedTerm.split(' ');
      results = results.filter((article) =>
        terms.every((term) => article.searchText.includes(term))
      );
    }
  }

  if (tag) {
    results = results.filter((article) => article.tags.includes(tag));
  }

  const orderFactor = sortOrder === 'desc' ? -1 : 1;
  results = [...results].sort((a, b) => {
    if (sortField === 'title') {
      return a.title.localeCompare(b.title, 'fr') * orderFactor;
    }
    if (sortField === 'number') {
      return (a.sortKey - b.sortKey) * orderFactor;
    }
    return (a.order - b.order) * orderFactor;
  });

  return results;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', articles: articles.length });
});

app.get('/api/tags', (_req, res) => {
  res.json({ tags });
});

app.get('/api/search/suggestions', (req, res) => {
  const query = req.query.q || '';
  const normalized = normalizeText(String(query));
  if (!normalized) {
    return res.json({ suggestions: [] });
  }
  const suggestions = articles
    .filter((article) => article.searchText.includes(normalized))
    .slice(0, 8)
    .map((article) => ({
      id: article.id,
      number: article.number,
      title: article.title,
      summary: article.summary,
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

  const filtered = filterArticles({ searchTerm, tag, sortField, sortOrder });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((article) => ({
    id: article.id,
    number: article.number,
    title: article.title,
    summary: article.summary,
    tags: article.tags,
    context: article.context,
  }));

  res.json({
    page,
    pageSize,
    total,
    pages: Math.ceil(total / pageSize),
    items,
  });
});

app.get('/api/articles/:id', (req, res) => {
  const article = articles.find((item) => item.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article introuvable' });
  }
  res.json({
    id: article.id,
    number: article.number,
    title: article.title,
    content: article.content,
    tags: article.tags,
    context: article.context,
    references: article.references,
  });
});

app.get('/api/articles/:id/references', (req, res) => {
  const article = articles.find((item) => item.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article introuvable' });
  }
  const linked = article.references
    .map((ref) => articles.find((item) => item.id === ref.articleId))
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      summary: item.summary,
    }));
  res.json({ references: linked });
});

app.get('/api/articles/:id/pdf', (req, res) => {
  const article = articles.find((item) => item.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article introuvable' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${article.id}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text(`Article ${article.number}`, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(14).text(article.title, { bold: true });
  doc.moveDown();
  doc.fontSize(10).fillColor('#666');
  const breadcrumbs = [
    article.context.livre,
    article.context.partie,
    article.context.titre,
    article.context.chapitre,
    article.context.section,
    article.context.sousSection,
  ]
    .filter(Boolean)
    .join(' › ');
  if (breadcrumbs) {
    doc.text(breadcrumbs);
    doc.moveDown();
  }
  doc.fillColor('#000');
  article.content.split('\n').forEach((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      doc.moveDown();
    } else {
      doc.text(trimmed, { align: 'justify' });
    }
  });

  if (article.references.length) {
    doc.moveDown();
    doc.fontSize(11).text('Références :');
    doc.fontSize(10);
    article.references.forEach((reference) => {
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
