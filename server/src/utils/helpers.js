/**
 * Convert string to URL-safe lowercase slug
 * @param {string} text
 * @returns {string} URL slug
 */
export const slugify = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Escape regular expression special characters to prevent ReDoS & injection
 * @param {string} text
 * @returns {string} Escaped string safe for RegExp
 */
export const escapeRegex = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * Generate singular/plural stem patterns for a given word
 * @param {string} word
 * @returns {string} Regex pattern with alternation
 */
export const getWordStemPattern = (word) => {
  if (!word || typeof word !== 'string') return '';
  const escaped = escapeRegex(word);
  const patterns = [escaped];
  const lower = word.toLowerCase();

  if (lower.endsWith('ies') && lower.length > 4) {
    patterns.push(escapeRegex(word.slice(0, -3) + 'y'));
  } else if (lower.endsWith('sses') && lower.length > 5) {
    patterns.push(escapeRegex(word.slice(0, -2)));
  } else if (lower.endsWith('es') && !lower.endsWith('ss') && lower.length > 4) {
    patterns.push(escapeRegex(word.slice(0, -2)));
  } else if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) {
    patterns.push(escapeRegex(word.slice(0, -1)));
  }

  return patterns.join('|');
};

/**
 * Builds a multi-field MongoDB query condition for products matching:
 * - name
 * - description
 * - brand
 * - sku
 * - category (via Category collection lookup)
 *
 * Supports multi-word token queries, case-insensitivity, and singular/plural variations.
 *
 * @param {string} searchTerm
 * @param {import('mongoose').Model} CategoryModel
 * @returns {Promise<Object|null>}
 */
export const buildProductSearchFilter = async (searchTerm, CategoryModel) => {
  if (!searchTerm || typeof searchTerm !== 'string') return null;
  const trimmed = searchTerm.trim();
  if (!trimmed) return null;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  // 1. Gather all category lookup queries across all tokens + full phrase
  const categoryConditions = tokens.map((token) => {
    const pattern = getWordStemPattern(token);
    const regex = { $regex: pattern, $options: 'i' };
    return {
      $or: [{ name: regex }, { slug: regex }],
    };
  });

  const fullEscaped = escapeRegex(trimmed);
  categoryConditions.push({
    $or: [
      { name: { $regex: fullEscaped, $options: 'i' } },
      { slug: { $regex: fullEscaped, $options: 'i' } },
    ],
  });

  let matchingCategories = [];
  if (CategoryModel) {
    try {
      matchingCategories = await CategoryModel.find({
        $or: categoryConditions,
      }).select('_id name slug');
    } catch (e) {
      matchingCategories = [];
    }
  }

  // 2. Build token search conditions
  const tokenConditions = tokens.map((token) => {
    const pattern = getWordStemPattern(token);
    const tokenRegex = { $regex: pattern, $options: 'i' };
    const tester = new RegExp(pattern, 'i');

    const matchingCatIds = matchingCategories
      .filter(
        (c) =>
          tester.test(c.name || '') ||
          tester.test(c.slug || '')
      )
      .map((c) => c._id);

    const tokenOr = [
      { name: tokenRegex },
      { productName: tokenRegex },
      { description: tokenRegex },
      { brand: tokenRegex },
      { sku: tokenRegex },
    ];

    if (matchingCatIds.length > 0) {
      tokenOr.push({ category: { $in: matchingCatIds } });
    }

    return { $or: tokenOr };
  });

  // 3. If single token, simply return that token's $or condition
  if (tokens.length === 1) {
    return tokenConditions[0];
  }

  // 4. For multi-word queries:
  // Match either if ALL tokens are found across fields ($and of token conditions)
  // OR if the contiguous full phrase matches name, description, brand, or sku
  const fullRegex = { $regex: fullEscaped, $options: 'i' };
  const fullTester = new RegExp(fullEscaped, 'i');
  const fullCatIds = matchingCategories
    .filter(
      (c) =>
        fullTester.test(c.name || '') ||
        fullTester.test(c.slug || '')
    )
    .map((c) => c._id);

  const orBranches = [
    { $and: tokenConditions },
    { name: fullRegex },
    { productName: fullRegex },
    { description: fullRegex },
    { brand: fullRegex },
    { sku: fullRegex },
  ];

  if (fullCatIds.length > 0) {
    orBranches.push({ category: { $in: fullCatIds } });
  }

  return { $or: orBranches };
};

/**
 * RFC-4180 compliant CSV parser
 * Handles quoted fields, escaped quotes (""), commas, and multi-line strings.
 * @param {string} csvText
 * @returns {Array<Object>} Array of row objects with keys matching header columns
 */
export const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== 'string') return [];

  // Strip BOM if present
  let text = csvText.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i += 2;
        continue;
      } else {
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }

    if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  // First row is headers
  const headers = rows[0].map((h) => h.trim());
  const results = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = row[idx] !== undefined ? row[idx] : '';
    });
    results.push(rowObj);
  }

  return results;
};

export default { slugify, escapeRegex, parseCSV };

