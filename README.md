# Vaultrix

Enterprise personal finance tracker. React frontend, Node/Express backend, MongoDB Atlas.

## Structure

```
vaultrix/
  backend/     Express API, MongoDB models, auth, business logic
  frontend/    React app
```

## Modules planned

1. Auth and user management
2. Core transactions
3. Accounts
4. Budgeting and goals
5. Loans (no interest)
6. Rental management
7. Bill management
8. Group and shared expense splitting
9. Committees and ROSCA
10. Salary and tax calculator
11. Notifications and feedback
12. Internationalization
13. Reports and dashboard
14. Admin dashboard
15. Security hardening
16. Design system

Screens are built one at a time. Design comes first, then implementation, then the next screen is prompted for separately.

## Setup

Backend:

```
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend:

```
cd frontend
npm install
npm start
```

## Git workflow

Each feature gets its own commit (and ideally its own branch merged via PR) so history stays traceable feature by feature.
