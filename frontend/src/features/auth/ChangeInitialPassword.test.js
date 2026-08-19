/**
 * Reproduz a digitação na tela de definição de senha do primeiro acesso.
 *
 * Motivo: uma participante relatou que a tela quebrava ao digitar o segundo
 * caractere, exibindo "Algo deu errado". A leitura do código não revelou a
 * causa, então este teste digita caractere a caractere e falha no ponto exato.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// virtual: o react-router-dom e ESM e o resolvedor do jest do CRA nao o encontra.
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });

jest.mock('../../services/api', () => ({
  changeInitialPassword: jest.fn(() => Promise.resolve({})),
}));

const mockContexto = {
  accessToken: 'token',
  user: { username: 'gabriela', first_name: 'Gabriela', role: 'aluno' },
  updateUser: jest.fn(),
  logout: jest.fn(),
};

jest.mock('./AuthContext', () => ({
  useAuth: () => mockContexto,
}));

import ChangeInitialPassword from './ChangeInitialPassword';

function montar() {
  return render(<ChangeInitialPassword />);
}

test('digitar caractere a caractere na nova senha nao quebra a tela', () => {
  montar();
  const campo = screen.getByLabelText(/nova senha/i);

  const senha = 'Gabriela123';
  for (let i = 1; i <= senha.length; i++) {
    const parcial = senha.slice(0, i);
    expect(() => fireEvent.change(campo, { target: { value: parcial } }))
      .not.toThrow();
  }
});

test('digitar na confirmacao com senhas diferentes nao quebra a tela', () => {
  montar();
  fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'Gabriela123' } });

  const confirmacao = screen.getByLabelText(/confirmar senha/i);
  const texto = 'Gabriela999';
  for (let i = 1; i <= texto.length; i++) {
    expect(() => fireEvent.change(confirmacao, { target: { value: texto.slice(0, i) } }))
      .not.toThrow();
  }
});

test('checklist aparece a partir do primeiro caractere e marca os criterios', () => {
  montar();
  const campo = screen.getByLabelText(/nova senha/i);

  fireEvent.change(campo, { target: { value: 'G' } });
  expect(screen.getByLabelText(/requisitos da senha/i)).toBeTruthy();

  fireEvent.change(campo, { target: { value: 'Gabriela123' } });
  expect(screen.getByRole('button', { name: /definir senha e entrar/i }).disabled).toBe(false);
});
