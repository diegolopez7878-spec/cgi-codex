const fs = require('fs');
const path = require('path');

const ARTICLE_NUMBER_SUFFIX =
  '(?:bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies|undecies|duodecies|terdecies|quaterdecies|quinquiesdecies)';

function extractArticleHeader(line) {
  if (!/^Article\b/i.test(line)) {
    return null;
  }
  const normalized = line.replace(/^Article\b/i, '').trim();
  if (!normalized) {
    return null;
  }

  const numberMatch = normalized.match(
    new RegExp(`^([0-9]+(?:\\s*(?:${ARTICLE_NUMBER_SUFFIX}))?)`, 'i')
  );

  if (!numberMatch) {
    return null;
  }

  const number = numberMatch[1].replace(/\s+/g, ' ').trim();
  let remainder = normalized.slice(numberMatch[0].length);
  remainder = remainder.replace(/^[\s.\-–—:]+/, '').trim();

  return {
    number,
    title: remainder,
  };
}

const headingMatchers = [
  { key: 'livre', regex: /^Livre\s+[IVXLC]+/i },
  { key: 'partie', regex: /^(?:Premi[eè]re|Deuxi[eè]me|Troisi[eè]me)\s+partie/i },
  { key: 'titre', regex: /^Titre\s+[IVXLC]+/i },
  { key: 'chapitre', regex: /^Chapitre\s+[IVXLC]+/i },
  { key: 'section', regex: /^Section\s+[IVXLC]+/i },
  { key: 'sousSection', regex: /^Sous[-\s]?section\s+[IVXLC]+/i },
  { key: 'titre', regex: /^TITRE\s+[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸ\s\-’']+/ },
  { key: 'chapitre', regex: /^CHAPITRE\s+[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸ\s\-’']+/ },
  { key: 'section', regex: /^SECTION\s+[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸ\s\-’']+/ },
];

function stripDiacritics(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/œ/gi, 'oe');
}

function slugify(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeText(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarize(content, limit = 50) {
  const words = content.replace(/\s+/g, ' ').trim().split(' ');
  return words.slice(0, limit).join(' ') + (words.length > limit ? '…' : '');
}

function detectTags(article, context) {
  const tags = new Set();
  const { titre, chapitre, section, livre } = context;
  const scopeText = [titre, chapitre, section, livre, article.title, article.content].join(' ').toUpperCase();

  if (/IMPOT\s+SUR\s+LES\s+SOCIETES/.test(scopeText) || /\bI\.S\.?\b/.test(scopeText)) {
    tags.add('IS');
  }
  if (/IMPOT\s+SUR\s+LE\s+REVENU/.test(scopeText) || /\bI\.R\.?\b/.test(scopeText)) {
    tags.add('IR');
  }
  if (/TAXE\s+SUR\s+LA\s+VALEUR\s+AJOUTEE/.test(scopeText) || /\bT\.V\.A\.?\b/.test(scopeText)) {
    tags.add('TVA');
  }
  if (/DROITS?\s+DENREGISTREMENT/.test(scopeText) || /ENREGISTREMENT/.test(scopeText)) {
    tags.add('Droits d\'enregistrement');
  }
  if (/TIMBRE/.test(scopeText)) {
    tags.add('Droits de timbre');
  }
  if (/PROCEDURES\s+FISCALES/.test(scopeText) || /CONTROLE/.test(scopeText)) {
    tags.add('Procédures fiscales');
  }
  if (/CONTRIBUTION\s+SOCIALE/.test(scopeText)) {
    tags.add('Contributions sociales');
  }
  return Array.from(tags);
}

function computeSortKey(number, order) {
  if (!number) {
    return order;
  }
  const base = number
    .toLowerCase()
    .replace(/[^0-9a-z\s]/g, ' ')
    .trim();
  const [main, suffix] = base.split(/\s+/);
  const mainNumber = parseInt(main, 10);
  let suffixWeight = 0;
  const suffixMap = [
    'bis',
    'ter',
    'quater',
    'quinquies',
    'sexies',
    'septies',
    'octies',
    'nonies',
    'decies',
    'undecies',
    'duodecies',
    'terdecies',
    'quaterdecies',
    'quinquiesdecies',
  ];
  if (suffix && !Number.isNaN(mainNumber)) {
    const idx = suffixMap.indexOf(suffix);
    suffixWeight = idx >= 0 ? (idx + 1) / 100 : 0;
  }
  return Number.isNaN(mainNumber) ? order : mainNumber + suffixWeight;
}

function extractReferences(content) {
  const refs = new Set();
  const regex = /article\s+([0-9]+(?:\s*(?:bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies))?)/gi;
  let match;
  while ((match = regex.exec(content))) {
    refs.add(match[1].replace(/\s+/g, ' ').trim());
  }
  return Array.from(refs);
}

function parseCGIText() {
  const filePath = path.resolve(__dirname, '..', '..', 'cgi-2025-fr-brut.txt');
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  const context = {
    livre: '',
    partie: '',
    titre: '',
    chapitre: '',
    section: '',
    sousSection: '',
  };

  let inTableOfContents = false;

  const articles = [];
  let currentArticle = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inTableOfContents) {
      const normalizedHeading = stripDiacritics(trimmed).toUpperCase();
      if (normalizedHeading === 'TABLE DES MATIERES') {
        inTableOfContents = true;
        continue;
      }
    }

    if (inTableOfContents) {
      continue;
    }

    if (!trimmed) {
      if (currentArticle) {
        currentArticle.contentLines.push('');
      }
      continue;
    }

    let headingApplied = false;
    for (const matcher of headingMatchers) {
      if (matcher.regex.test(trimmed)) {
        context[matcher.key] = trimmed.replace(/\s+/g, ' ').trim();
        headingApplied = true;
        break;
      }
    }
    if (headingApplied) {
      continue;
    }

    const articleMatch = extractArticleHeader(trimmed);
    if (articleMatch) {
      if (currentArticle) {
        finalizeArticle(currentArticle, context, articles.length, articles);
      }
      currentArticle = {
        number: articleMatch.number,
        title: articleMatch.title,
        contentLines: [],
        contextSnapshot: { ...context },
      };
      continue;
    }

    if (currentArticle) {
      currentArticle.contentLines.push(line);
    }
  }

  if (currentArticle) {
    finalizeArticle(currentArticle, context, articles.length, articles);
  }

  const articleByNumber = new Map();
  articles.forEach((article) => {
    articleByNumber.set(article.number.toLowerCase(), article);
  });

  for (const article of articles) {
    article.references = article.references
      .map((ref) => {
        const key = ref.toLowerCase();
        const target = articleByNumber.get(key);
        return {
          label: ref,
          articleId: target ? target.id : null,
        };
      })
      .filter((ref) => ref.articleId !== null);
  }

  const tags = Array.from(
    articles.reduce((acc, article) => {
      article.tags.forEach((tag) => acc.add(tag));
      return acc;
    }, new Set())
  ).sort();

  return { articles, tags };
}

function generateUniqueId(baseId, collector) {
  let uniqueId = baseId;
  let suffix = 2;
  while (collector.some((article) => article.id === uniqueId)) {
    uniqueId = `${baseId}-${suffix++}`;
  }
  return uniqueId;
}

function finalizeArticle(rawArticle, context, order, collector) {
  const content = rawArticle.contentLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const baseId = slugify(`article-${rawArticle.number}-${rawArticle.title}`) || `article-${order + 1}`;
  const id = generateUniqueId(baseId, collector);
  const normalizedSearchText = normalizeText(`${rawArticle.number} ${rawArticle.title} ${content}`);
  const tags = detectTags({ title: rawArticle.title, content }, rawArticle.contextSnapshot);
  const references = extractReferences(content);

  collector.push({
    id,
    number: rawArticle.number,
    title: rawArticle.title,
    content,
    summary: summarize(content, 60),
    context: rawArticle.contextSnapshot,
    tags,
    order,
    sortKey: computeSortKey(rawArticle.number, order),
    references,
    searchText: normalizedSearchText,
  });
}

module.exports = {
  parseCGIText,
  normalizeText,
};
