# MediCare — Controle de Medicação para Idosos

Trabalho da disciplina de Programação para Dispositivos Móveis em Android  
Professor: Julio Cartier

---

## Integrantes

- Victor Pacheco da Silva Bathich
- Marcelo Alexandre Vitorino Raimundo
- Luiz Felipe de Matos do Nascimento Santos
- Gustavo Santana Soares do Nascimento
---

## Problema Social

Idosos frequentemente tomam múltiplos medicamentos ao longo do dia e têm dificuldade em lembrar os horários e as doses corretas. Esse problema pode levar a erros de medicação graves, comprometendo a saúde e a autonomia de quem vive sozinho.

O **MediCare** é um aplicativo móvel desenvolvido para auxiliar idosos e seus cuidadores no controle diário de medicamentos. Com ele é possível cadastrar remédios com nome, dose e horários, acompanhar o status de tomada ao longo do dia e consultar o histórico dos últimos 7 dias, tudo com uma interface simples e com texto grande, pensada para facilitar o uso por pessoas idosas.

---

## Tecnologias Utilizadas

- [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/)
- [Firebase Firestore](https://firebase.google.com/products/firestore) como banco de dados
- [React Navigation](https://reactnavigation.org/) para navegação entre telas

---

## Como Rodar o Projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado
- [Expo Go](https://expo.dev/go) instalado no celular (Android ou iOS)

### Passos

1. Clone o repositório:
   ```bash
   git clone https://github.com/zDinamic/App-Medicamentos-React.git
   cd App-Medicamentos-React
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o Firebase:
   - Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com)
   - Ative o **Firestore Database** em modo de teste
   - Registre um app Web e copie o `firebaseConfig`
   - Cole as credenciais em `src/config/firebase.js`

4. Inicie o servidor:
   ```bash
   npx expo start
   ```

5. Escaneie o QR code com o app **Expo Go** no celular.
