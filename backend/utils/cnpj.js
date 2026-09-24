function apenasDigitos(v) { return String(v || '').replace(/\D/g, ''); }
function cnpjValido(d) { return /^\d{14}$/.test(d); }
function formatarCnpj(d) {
  d = apenasDigitos(d);
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d;
}
module.exports = { apenasDigitos, cnpjValido, formatarCnpj };