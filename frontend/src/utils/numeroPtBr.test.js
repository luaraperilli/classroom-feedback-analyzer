import { numeroPtBr, numeroComSinal } from './numeroPtBr';

describe('numeroPtBr', () => {
  it('usa vírgula como separador decimal', () => {
    expect(numeroPtBr(4.2, 1)).toBe('4,2');
    expect(numeroPtBr(3.8, 1)).toBe('3,8');
    expect(numeroPtBr(0.3, 1)).toBe('0,3');
  });

  it('mantém as casas decimais pedidas, inclusive os zeros', () => {
    expect(numeroPtBr(4, 1)).toBe('4,0');
    expect(numeroPtBr(0.5, 2)).toBe('0,50');
  });

  it('arredonda como o toFixed', () => {
    expect(numeroPtBr(4.25, 1)).toBe(numeroPtBr(4.25, 1));
    expect(numeroPtBr(1.999, 2)).toBe('2,00');
  });

  it('devolve string vazia para ausência de valor, em vez de NaN na tela', () => {
    expect(numeroPtBr(null)).toBe('');
    expect(numeroPtBr(undefined)).toBe('');
    expect(numeroPtBr('abc')).toBe('');
  });

  it('trata o zero como número, e não como valor ausente', () => {
    expect(numeroPtBr(0, 1)).toBe('0,0');
  });
});

describe('numeroComSinal', () => {
  it('marca o positivo e preserva o sinal do negativo', () => {
    expect(numeroComSinal(0.42, 2)).toBe('+0,42');
    expect(numeroComSinal(-0.42, 2)).toBe('-0,42');
  });

  it('não põe sinal no zero, que não é positivo nem negativo', () => {
    expect(numeroComSinal(0, 2)).toBe('0,00');
  });

  it('devolve string vazia para ausência de valor', () => {
    expect(numeroComSinal(null)).toBe('');
    expect(numeroComSinal(undefined)).toBe('');
  });
});
