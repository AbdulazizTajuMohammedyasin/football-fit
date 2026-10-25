# Database setup (MySQL)

Football Fit targets **MySQL 8**, configured either with separate `DB_*` variables or a single
`DATABASE_URL`. When neither is set, Django falls back to a local SQLite file
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
DB_NAME=football_fit
DB_USER=football_fit
DB_PASSWORD=choose-a-password
DB_HOST=127.0.0.1
DB_PORT=3306
```

`DATABASE_URL=mysql://user:password@host:3306/name` also works and takes precedence, but special
characters in the password must then be URL-encoded (`@` → `%40`).

Then apply migrations and load data:

```
cd backend
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_demo      # fictional demo league
.venv\Scripts\python manage.py import_fpl     # current Premier League data from the FPL API
```

`python -m pytest` uses the same settings, so it runs against MySQL (Django creates and drops a
`test_<name>` database; the user needs permission for that). To run the suite on SQLite instead,
clear the variable for that command, e.g. `DB_NAME= python -m pytest` in Git Bash.
