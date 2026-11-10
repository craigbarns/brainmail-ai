// Liste partagée des départements pour la prospection SIRENE.
// Les gros départements (le plus de cabinets NAF 69.20Z) d'abord : la rotation
// de maintenance les rafraîchit en premier.
export const DEPARTEMENTS = [
  '13', '75', '69', '33', '31', '59', '44', '06', '83', '92', // top densité
  '75', '94', '78', '91', '34', '38', '76', '67', '57', '35',
  '01', '02', '03', '04', '05', '07', '08', '09', '10', '11', '12', '14', '15',
  '16', '17', '18', '19', '2A', '2B', '21', '22', '23', '24', '25', '26', '27',
  '28', '29', '30', '32', '36', '37', '39', '40', '41', '42', '43', '45', '46',
  '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '58', '60', '61',
  '62', '63', '64', '65', '66', '70', '71', '72', '73', '74', '77', '79', '80',
  '81', '82', '84', '85', '86', '87', '88', '89', '90', '93', '94', '95',
  '971', '972', '973', '974', '976',
];

// Nettoie la liste (déduplique 75/94 doublons ci-dessus) en gardant l'ordre.
export const DEPARTEMENTS_UNIQUES = [...new Set(DEPARTEMENTS)];
