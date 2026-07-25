export const buildWhereClause = (conditions = []) => {
  let clause = ' WHERE 1=1';
  const values = [];

  for (const condition of conditions) {
    const { sql, value, transform } = condition;
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const finalValue = transform ? transform(value) : value;
    let placeholderSql = sql;
    const placeholderCount = (sql.match(/\?/g) || []).length;

    for (let i = 0; i < placeholderCount; i += 1) {
      placeholderSql = placeholderSql.replace('?', `$${values.length + 1}`);
    }

    clause += placeholderSql;
    if (Array.isArray(finalValue)) {
      values.push(...finalValue);
    } else {
      values.push(finalValue);
    }
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
