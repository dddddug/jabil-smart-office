export const buildWhereClause = (conditions = []) => {
  let clause = ' WHERE 1=1';
  const values = [];

  for (const condition of conditions) {
    const { sql, value, transform } = condition;
    // Skip undefined, null, empty string, and boolean values
    if (value === undefined || value === null || value === '' || typeof value === 'boolean') {
      continue;
    }

    // Skip arrays that don't have enough elements for the placeholders
    const placeholderCount = (sql.match(/\?/g) || []).length;
    if (Array.isArray(value) && value.length < placeholderCount) {
      continue;
    }

    const finalValue = transform ? transform(value) : value;

    // First, push values to the array (so paramIndex can use values.length correctly)
    if (Array.isArray(finalValue)) {
      values.push(...finalValue);
    } else {
      values.push(finalValue);
    }

    // Then replace placeholders with correct parameter indices
    let placeholderSql = sql;
    const startIndex = values.length - (Array.isArray(finalValue) ? finalValue.length : 1);

    for (let i = 0; i < placeholderCount; i += 1) {
      placeholderSql = placeholderSql.replace('?', `$${startIndex + i + 1}`);
    }

    clause += placeholderSql;
  }

  return { clause, values };
};

export const buildPagination = (page = 1, pageSize = 10) => {
  const limit = Number.isNaN(parseInt(pageSize, 10)) ? 10 : parseInt(pageSize, 10);
  const pageNumber = Number.isNaN(parseInt(page, 10)) ? 1 : parseInt(page, 10);
  return {
    limit,
    offset: (pageNumber - 1) * limit,
    page: pageNumber,
  };
};
