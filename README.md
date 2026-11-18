# Unidos Rolamentos · Escala 5x2 de 40 horas

Capa interativa + painel (dimensionamento, grade/simulador com troca de escala, riscos e melhorias).

## Estrutura
```
unidos-escala/
├── index.html        # capa + painel (estrutura e textos)
├── css/style.css     # estilos (capa e painel)
├── js/app.js         # regras da escala, simulador, trocas, animação da capa
└── assets/logo.png   # logo Unidos Rolamentos
```

## Como abrir no VS Code
1. Descompacte a pasta e abra em **Arquivo › Abrir Pasta...**
2. Instale a extensão **Live Server** (Ritwick Dey).
3. Clique com o botão direito em `index.html` › **Open with Live Server**.

Também funciona com duplo clique no `index.html`, sem servidor.

## Onde editar
- **Colaboradores, turnos e escala padrão:** `js/app.js`, constantes `DEF` (pessoas, almoços, semanas A/B) e `SH` (horários dos turnos).
- **Horários de pico e mínimos de balcão:** `DEF.picos`, `DEF.pkMin`, `DEF.baseMin`.
- **Data do 1º sábado do ciclo:** `DEF.calStart`.
- **Cores da marca:** `css/style.css`, variáveis `--o`, `--o2`, `--k`, `--g` em `.cover`.

As alterações feitas pela tela (grade, trocas) ficam salvas no `localStorage` do navegador.
Para voltar ao modelo original, use o botão **Restaurar modelo**.
