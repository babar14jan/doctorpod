const fs = require('fs');
const path = require('path');

function ensurePdfDir(){
  const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
  return pdfDir;
}

module.exports = { ensurePdfDir };
