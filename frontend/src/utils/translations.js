const subjectTranslations = {
  "Data Structures": "Estrutura de Dados",
  "Database Systems": "Sistemas de Banco de Dados",
  "Software Engineering": "Engenharia de Software",
  "Computer Networks": "Redes de Computadores",
  "Information Security": "Segurança da Informação",
};

export const translateSubject = (subjectName) => {
  return subjectTranslations[subjectName] || subjectName;
};