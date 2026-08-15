# Decisões das orientações 4 e 5 (Rodrigo)

Extraído das transcrições das reuniões 4 e 5. Só o que tem efeito sobre o código.

---

## O marco didático é o parâmetro central

Rodrigo, na reunião 5: *"toda a defesa do seu TCC é em cima do marco"* e *"cada um aqui pode definir o marco que quiser na sua matéria"*. Luara confirma: *"é pelo professor que define"*.

O piloto será nas duas disciplinas dele no próximo semestre:

- **IHC** (obrigatória): **3 marcos** — cinco aulas até a P1, cinco aulas até a P2, e o bloco de seminários (~3 semanas, vale nota 3).
- **Informática na Educação** (optativa): **2 marcos** — seminário e entrega/apresentação do produto. A prova final ficou de fora, porque *"é só avaliação final... depois acaba nem vendo mais o aluno"*.

Consequência: o sistema precisa suportar um número variável de marcos por disciplina, definidos pelo docente, e não pode assumir periodicidade fixa.

## A regra de submissão muda: um feedback por marco

Diálogo direto na reunião 5. Luara descreve o comportamento atual (*"é um por matéria por dia"*), Rodrigo pergunta *"Por marco?"*, e ela corrige: *"Por marco, isso."*

Hoje o código aplica um limite por matéria por dia (`routes.py:66-71`), comparando datas em UTC. Isso vira: **um feedback por aluno por marco**. Como efeito colateral, o bug de fuso horário desaparece — a regra deixa de depender de data.

## O gráfico de evolução não pode ser semanal

Rodrigo: *"Lembra que nós não vamos aplicar toda semana... se você põe média semanal, tá furado. Não vai ter toda semana."* Com 2 ou 3 marcos no semestre, uma série temporal semanal não tem pontos.

A conversa terminou em "põe opção", pela flexibilidade entre disciplinas com ritmos diferentes.

**Estado atual:** já resolvido pela metade. O gráfico não é mais semanal — usa `groupBy="day"` e rotula pela data real de cada envio (`SentimentTrendChart.js:20-33`), com um aviso explicando que segue o ritmo do professor. Falta decidir se ele passa a ter o eixo por **marco** (o mais coerente agora) e se vira opcional em vez de sempre visível. Sobra código morto: `getWeekLabel` (`utils/sentiment.js:38`) não é mais chamado.

## Já resolvidos desde a reunião

- **"Meu Progresso" não representava a funcionalidade** (*"ele não tá progredindo em relação a nada"*) → renomeado para **"Minhas Avaliações"** (`App.js:90`). ✔
- **Explicação sem jargão** — Rodrigo: *"quem sabe dos algoritmos é você, não o usuário final"*. O texto atual ("destacamos as palavras do seu comentário que mais pesaram...") foi aprovado na reunião. ✔
- **Aviso de processamento demorado** — Rodrigo validou pelo lado de IHC: se passa de dois segundos, tem que sinalizar. O `AnalyzingModal` cumpre isso, e ela cogitou adicionar mais mensagens porque a espera é longa. ✔ (o batching que apliquei encurta bastante essa espera)

## Pendências que vieram das reuniões

**Foco no topo após o envio.** Rodrigo notou que, ao enviar, a tela abre no meio: *"Por que que você não tá jogando o foco lá pra cima? Pra pessoa ler de cima pra baixo."* Luara confirmou ser bug. Falta o scroll para o topo depois de submeter.

**Excluir feedback** foi ideia nova da reunião e já existe no código (`routes.py:264`) — falta descrever na Seção 3.5 do texto.

## Restrições de prazo e de processo

- Luara quer o sistema pronto **dia 3**; Rodrigo viaja **do dia 16 ao 30**, e pediu para ver antes de sair, *"tudo pronto com cara de produto"*.
- A Seção 3.5 (dashboard) e as capturas de tela só podem ser escritas com o sistema finalizado: *"cê vai ter que capturar imagens pra ir linkando com tudo que cê tá explicando"*, *"não só a parte lógica, mas as funcionalidades"*.
- **Não há segunda chance.** Rodrigo: *"a hora que a gente levar isso pra sala de aula e não tem mais retorno. O aluno usou e cabou."* Luara: *"não dá pra mudar no meio, né?"* — *"Não, não dá não."*

Esse último ponto é o que justifica testar o fluxo inteiro antes do piloto, com as duas disciplinas simuladas (3 marcos e 2 marcos), como o próprio Rodrigo sugeriu: *"E até pra você testar, simulando como se você fosse aluno da matéria."*

## Da reunião 4

A referência de evasão de 2007 foi apontada como defasada e devia ser substituída por dados atuais — **já feito** no artigo, que agora cita Nierotka et al. (2023). ✔
