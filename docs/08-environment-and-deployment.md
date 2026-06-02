\# Environment and Deployment Notes



Southin PeoplePay uses Supabase PostgreSQL as the application database.



The application connects to Supabase through environment variables and Prisma.



Required local environment variables:



DATABASE\_URL=

DIRECT\_URL=

SUPABASE\_URL=

SUPABASE\_ANON\_KEY=

SUPABASE\_SERVICE\_ROLE\_KEY=



Sensitive values must not be committed to GitHub.



The `.env.example` file documents the required variables, while the real `.env` file remains local on developer machines.



Statutory records seeded into the system are marked as DRAFT and must be validated by HR and Finance before live payroll processing.

