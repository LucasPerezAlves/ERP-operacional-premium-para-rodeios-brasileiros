Como Engenheiro de Software arquitetando sistemas de alta concorrência, estruturei o `CLAUDE.md` com uma fundação sólida em F# (Fable), adotando padrões que garantem tipagem forte e imutabilidade, fatores cruciais para evitar desastres em sistemas financeiros de eventos rápidos.

Analisando a dinâmica imprevisível e acelerada de um rodeio, aqui estão as minhas recomendações técnicas e estratégicas para elevar o nível de segurança e gestão do seu software:

### Sugestões para Melhorar o Controle Financeiro no Rodeio

**1. Operação Offline-First (Resiliência de Rede)**
Rodeios e eventos em grandes espaços abertos quase sempre sofrem com redes Wi-Fi ou 4G intermitentes devido à aglomeração. 
* *Ação:* Projetar o front-end (Fable/Elmish) como um **PWA (Progressive Web App)** utilizando *Service Workers* e *IndexedDB*. Se a rede cair, o garçom ou a bilheteria continua registando vendas e recebimentos localmente. Quando a conexão for restabelecida, o sistema envia a "fila" de transações em background para o banco de dados.

**2. Alertas Automatizados de Sangria (Segurança Física)**
Manter grandes volumes de dinheiro físico (espécie) num único caixa de bar ou portaria é um risco alto.
* *Ação:* Criar um limite configurável (por exemplo, R$ 2.000,00). Quando o operador atinge esse limite pelas vendas registadas no sistema, a interface emite um alerta visual bloqueando temporariamente certas funções até que um supervisor passe, recolha o dinheiro físico e autorize no sistema o registo de uma **Sangria**.

**3. Conciliação Automática: Dinheiro vs. Estoque**
Apenas verificar a "Sobra e Falta" de dinheiro pode mascarar desvios onde o operador de bar entrega a bebida, mas não regista a venda.
* *Ação:* Criar um módulo simples de "Carga de Pista/Bar". O garçom recebe um volume "X" de bebida (ex: 200 cervejas). No final da noite, a quantidade de dinheiro + débito + crédito tem que coincidir com `(Estoque Inicial - Estoque Devolvido) * Valor da Bebida`. 

**4. Autenticação por QR Code ou PIN Rápido**
Em ambientes com pouca luz e operando em alta velocidade, forçar funcionários a digitar e-mails longos e palavras-passe complexas nos telemóveis atrasa a fila.
* *Ação:* O módulo de cadastro deve gerar um *QR Code* ou um PIN numérico de 4 dígitos (exclusivo para aquele evento). O funcionário "bate o ponto" ou acede ao caixa simplesmente apontando a câmara ou inserindo 4 números num terminal partilhado.

**5. Preparação para Sistema Cashless (Próximo Passo)**
O fluxo financeiro atual exige contar centenas de notas ao fechar o evento, o que consome horas da madrugada e está propenso a erros.
* *Ação:* Deixe o modelo de base de dados já preparado para absorver uma abstração de "Fichas Virtuais" ou "Pulseiras RFID". No futuro, em vez de o garçom receber em débito ou dinheiro, ele simplesmente passará a pulseira RFID do cliente pelo leitor, e o saldo é debitado da recarga feita previamente numa "Central de Caixa".

**6. Rastreabilidade Rigorosa deortesias (Passe Livre)**
O vazamento de receita em eventos massivos ocorre intensamente pela distribuição descontrolada de pulseiras gratuitas.
* *Ação:* O sistema não deve ter apenas um botão "Emitir Passe Livre". Ao selecionar a opção, deve ser obrigatório registar o **Motivo** (Staff, Convidado do Patrocinador, Sorteio, Fornecedor) e o **Autorizador**. No painel do Admin, um gráfico deve destacar qual área/pessoa emitiu mais cortesias na noite.