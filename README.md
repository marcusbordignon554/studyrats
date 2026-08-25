readme_content = """# StudyRats 🐀
> **Acompanhe seu Progresso, Dispute com Seus Amigos!**

O **StudyRats** é uma plataforma completa e moderna voltada para a produtividade e a gamificação da rotina de estudos. Com ele, você registra detalhadamente o tempo dedicado a cada matéria, cria grupos fechados com códigos de convite, compete no ranking semanal e mantém sua constância através de ofensivas diárias (*streaks*).

---

## 🚀 Funcionalidades

- ⏱️ **Registro Flexível de Estudos:** Adicione data, conteúdo, categoria e tempo dedicado (com suporte completo para edição e exclusão de histórico).
- 👥 **Grupos Privados com Código de Convite:** Crie salas de estudo exclusivas com códigos permanentes de 6 dígitos fáceis de compartilhar.
- 🛡️ **Gerenciamento de Membros e Cargos:** O criador do grupo pode promover membros a Administradores, rebaixar ou expulsar participantes, além de poder excluir o grupo de forma segura.
- 🏆 **Ranking Semanal (Leaderboard):** Visualização dinâmica e em tempo real dos participantes que mais acumularam horas de estudo nos últimos 7 dias.
- 🔥 **Sistema de Streaks (Ofensivas):** Mantenha o hábito diário ativo e aumente a contagem de dias consecutivos de foco.
- 👤 **Perfis Personalizados:** Upload e remoção de fotos de avatar em nuvem e alteração dinâmica de nome de usuário.
- 🔄 **Sincronização & Offline-First:** O app funciona perfeitamente sem conexão com a internet e sincroniza todos os registros automaticamente assim que a conexão for restabelecida.
- 📱 **Multiplataforma:** Interface totalmente responsiva otimizada para Desktop, Web e compilação nativa para Android via Capacitor.

---

## 🛠️ Tecnologias Utilizadas

- **Front-end:** [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Estilização & UI:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Ícones)
- **Mobile Engine:** [Capacitor](https://capacitorjs.com/) (Integração e compilação nativa Android/iOS)
- **Back-end & Nuvem:** [Supabase](https://supabase.com/)
  - **PostgreSQL:** Banco relacional com políticas de segurança em nível de linha (**Row Level Security - RLS**)
  - **Auth:** Autenticação de usuários por e-mail e senha com gerenciamento de sessão
  - **Storage:** Servidor de arquivos em nuvem para upload seguro de fotos de perfil

---

## 💻 Como Rodar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)
- Conta no [Supabase](https://supabase.com/)

### 1. Clonar o Repositório
```bash
git clone [https://github.com/marcusbordignon554/studyrats.git](https://github.com/marcusbordignon554/studyrats.git)
cd studyrats