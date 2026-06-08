const convertToCSV = (rows, fields) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('輸入資料無效或為空陣列');
  }

  const selectedFields = fields || Object.keys(rows[0]);
  const parser = new Parser({ fields: selectedFields });
  const csv = parser.parse(rows);

  return '\uFEFF' + csv;
}

export default convertToCSV;