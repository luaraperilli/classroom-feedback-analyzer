// Política de senha do produto — usada no cadastro, na troca no 1º acesso e no perfil.
// Mantém uma única fonte da verdade no frontend (o backend valida os mesmos critérios).
export const PASSWORD_RULES = [
  { key: 'length', label: 'Pelo menos 8 caracteres', test: (p) => p.length >= 8 },
  { key: 'upper',  label: 'Uma letra maiúscula (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower',  label: 'Uma letra minúscula (a-z)', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'Um número (0-9)',           test: (p) => /[0-9]/.test(p) },
];

// true quando a senha atende a TODOS os critérios.
export const validatePassword = (p) => PASSWORD_RULES.every((r) => r.test(p || ''));

// retorna o rótulo do primeiro critério não atendido (ou null se estiver tudo ok).
export const firstPasswordError = (p) => {
  const failed = PASSWORD_RULES.find((r) => !r.test(p || ''));
  return failed ? failed.label : null;
};
