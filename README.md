# University Research Opportunity Portal

A web application where faculty members can post, view, update, close and delete research opportunities in one place.

**GitHub Repository:** https://github.com/sawaira4/research-opportunity-portal

> Student: Sawaira Zaman &nbsp;|&nbsp; Reg. No: P23-0596 &nbsp;|&nbsp; Class: BS (AI 5A) &nbsp;|&nbsp; Course: Computer Networks (CN), Fall-2026

## Tech stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Node.js + Express (REST API)        |
| Database | MySQL (`mysql2` driver)             |
| Frontend | HTML, CSS, vanilla JavaScript       |
| Testing  | Postman (collection included)       |

## Project structure

```
research-opportunity-portal/
├── backend/
│   ├── server.js        # Express app + all 5 CRUD routes
│   ├── db.js            # MySQL connection pool
│   ├── validate.js      # Input validation
│   ├── package.json
│   └── .env.example     # Copy to .env and add your own DB password
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js           # Talks to the API using fetch()
├── database/
│   └── schema.sql       # Creates the database and table
├── postman/
│   └── Research-Opportunity-Portal.postman_collection.json
└── README.md
```

## Setup and run

**Requirements:** Node.js 18+ and MySQL 8+ installed and running.

1. **Create the database**
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. **Configure the backend**
   ```bash
   cd backend
   cp .env.example .env        # on Windows: copy .env.example .env
   ```
   Open `.env` and set `DB_PASSWORD` to your own MySQL password.
3. **Install dependencies and start the server**
   ```bash
   npm install
   npm start
   ```
4. **Open the app** at http://localhost:3000 (the backend also serves the frontend).

The API base URL is `http://localhost:3000/api/opportunities`.

## API endpoints

| Method | Endpoint                  | Purpose                     | Success | Error codes |
|--------|---------------------------|-----------------------------|---------|-------------|
| POST   | `/api/opportunities`      | Create an opportunity       | 201     | 400, 500    |
| GET    | `/api/opportunities`      | Get all opportunities       | 200     | 500         |
| GET    | `/api/opportunities/:id`  | Get one opportunity         | 200     | 400, 404, 500 |
| PUT    | `/api/opportunities/:id`  | Update (partial updates OK) | 200     | 400, 404, 500 |
| DELETE | `/api/opportunities/:id`  | Delete an opportunity       | 200     | 400, 404, 500 |

### Opportunity fields

| Field                  | Type / rule                                  |
|------------------------|----------------------------------------------|
| `id`                   | Auto-generated                               |
| `title`                | Text, required                               |
| `description`          | Text, required                               |
| `research_area`        | Text, required                               |
| `faculty_name`         | Text, required                               |
| `department`           | Text, required                               |
| `required_skills`      | Text, required                               |
| `available_positions`  | Whole number, at least 1                     |
| `application_deadline` | Date, `YYYY-MM-DD`                           |
| `status`               | `Open` or `Closed` (defaults to `Open`)      |

### Example request

```http
POST /api/opportunities
Content-Type: application/json

{
  "title": "Urdu Sentiment Analysis",
  "description": "Build a sentiment classifier for Urdu tweets.",
  "research_area": "Natural Language Processing",
  "faculty_name": "Dr. Omar Khan",
  "department": "Computer Science",
  "required_skills": "Python, NLP basics",
  "available_positions": 2,
  "application_deadline": "2026-12-31"
}
```

To close an opportunity, send `PUT /api/opportunities/:id` with `{ "status": "Closed" }`.

## Testing with Postman

1. Open Postman and choose **Import**.
2. Select `postman/Research-Opportunity-Portal.postman_collection.json`.
3. Make sure the server is running, then run the requests in order (1 to 10), or use the Collection Runner.

The collection stores the IDs of the created records automatically, so requests 5 to 9 work without editing anything. It covers: creating three opportunities, get all, get one, update, Open to Closed, delete, 404 after delete, and a 400 validation error.

## Frontend features

- List all opportunities (with an Open / Closed filter)
- View complete details of one opportunity
- Create form with required-field validation
- Edit an existing opportunity
- Close an open opportunity with one click
- Delete with a confirmation dialog
- Success and error messages shown as notifications

## Security note

Database credentials are read from `backend/.env`, which is listed in `.gitignore` and is never committed. Only `.env.example` (without a real password) is in the repository.
