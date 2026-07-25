export const getPaginationParams = (query) => {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    return { page, pageSize, offset };
};
