const path = require('path');

module.exports = {
  PDF_TEMPLATE: path.join(__dirname, '..', '..', 'templates', 'modelo.pdf'),
  OUTPUT_DIR: path.join(__dirname, '..', '..', 'output'),

  FIELDS: {
    empresa: {
      page: 1,
      x: 150,
      yFromTop: 200,
      fontSize: 11,
      minFontSize: 7,
      maxWidth: 380
    },

    cnpj: {
      page: 1,
      x: 150,
      yFromTop: 230,
      fontSize: 11,
      minFontSize: 8,
      maxWidth: 200
    }
  }
};
