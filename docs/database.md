# Database setup (MySQL)

Football Fit targets **MySQL 8** through the `DATABASE_URL` environment variable.
When `DATABASE_URL` is not set, Django falls back to a local SQLite file
(`backend/db.sqlite3`) so tests and quick experiments need no database server.

## Create the database and user

Run once as a MySQL administrator (for example in MySQL Workbench or `mysql -u root -p`),
choosing your own password:

```sql
CREATE DATABASE football_fit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'football_fit'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON football_fit.* TO 'football_fit'@'localhost';
-- Needed only to run the test suite against MySQL (Django creates test_football_fit):
GRANT ALL PRIVILEGES ON test_football_fit.* TO 'football_fit'@'localhost';
FLUSH PRIVILEGES;
```

## Configure the backend

In `backend/.env` (never commit this file):

```
DATABASE_URL=mysql://football_fit:choose-a-password@127.0.0.1:3306/football_fit
```

Then apply migrations and load data:

```
cd backend
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_demo      # fictional demo league
.venv\Scripts\python manage.py import_fpl     # current Premier League data from the FPL API
```

Run the tests against MySQL with the same `DATABASE_URL` set: `.venv\Scripts\python -m pytest`.
