# K&Co FinOps Portal

A Financial Operations (FinOps) portal that helps you manage cloud spending, track savings opportunities, and generate PR notes. Built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Features

- 📤 **CSV Upload**: Upload AWS/GCP billing CSVs with automatic validation and deduplication
- 💰 **Spend Analytics**: Daily trend charts and top services with filters (date range, cloud, team, env)
- 💡 **Savings Pipeline**: Full CRUD for tracking savings ideas (Proposed → Approved → Realized)
- 📝 **PR Helper**: Generate copy-ready Markdown PR notes with savings calculations
- 🔐 **Role-Based Access Control**: Admin, Analyst, and Viewer roles

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Testing**: Jest
- **Authentication**: Session-based auth with bcrypt

## Prerequisites

Before you start, make sure you have these installed on your laptop:

- **Node.js 18 or higher** - You can download it from [nodejs.org](https://nodejs.org/)
- **npm** - This comes with Node.js automatically
- **PostgreSQL database** - You can either:
  - Install PostgreSQL locally on your machine
  - Use a cloud database like [Neon](https://neon.tech) or [Railway](https://railway.app) (both have free tiers)

## Setup Instructions

Follow these steps to get the project running on your laptop. I've tested these steps and they should work smoothly.

### Step 1: Clone and Install Dependencies

First, clone the repository and install all the required packages:

```bash
git clone <repository-url>
cd KCoAssignment
npm install
```

### 2. Database Setup

### Step 2: Set Up Your Database

You need a PostgreSQL database. Here are your options:

**Option A: Local PostgreSQL**
- If you have PostgreSQL installed locally, create a new database:
  ```sql
  CREATE DATABASE finops_db;
  ```

**Option B: Cloud Database (Easier)**
- Sign up for a free account at [Neon](https://neon.tech) or [Railway](https://railway.app)
- Create a new PostgreSQL database
- Copy the connection string they provide

**Create the `.env` file:**

Create a `.env` file in the root directory (same folder as `package.json`). You can copy from `.env.example`:

```bash
# On Windows (PowerShell)
Copy-Item .env.example .env

# On Mac/Linux
cp .env.example .env
```

Then edit the `.env` file and replace the `DATABASE_URL` with your actual database connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/finops_db?schema=public"
```

**Important:** 
- Replace `user` with your PostgreSQL username
- Replace `password` with your PostgreSQL password
- Replace `localhost:5432` with your database host and port (if using cloud database, use the connection string they provided)
- Replace `finops_db` with your database name

### Step 3: Set Up the Database Schema

Now we need to create the database tables and add some test users:

```bash
# Generate Prisma Client (this creates the database client)
npx prisma generate

# Run database migrations (this creates all the tables)
npx prisma migrate dev

# Seed the database with test users (this creates 3 test accounts)
npm run seed
```

**What each command does:**
- `npx prisma generate` - Creates the Prisma client so we can talk to the database
- `npx prisma migrate dev` - Creates all the database tables (User, SpendRecord, SavingIdea)
- `npm run seed` - Creates three test users (admin, analyst, viewer) so you can log in

### Step 4: Start the Development Server

Now you're ready to run the application:

```bash
npm run dev
```

You should see something like:
```
✓ Ready in 2.3s
○ Local: http://localhost:3000
```

Open your browser and go to [http://localhost:3000](http://localhost:3000). You should see the login page!

**Test Login Credentials:**
- **Admin**: `admin@kco.dev` / `Passw0rd!`
- **Analyst**: `analyst@kco.dev` / `Passw0rd!`
- **Viewer**: `viewer@kco.dev` / `Passw0rd!`

## Environment Variables

The `.env` file contains all the configuration the app needs. Here's what each variable does:

```env
# Database Connection String
# This tells the app where to find your PostgreSQL database
DATABASE_URL="postgresql://user:password@localhost:5432/finops_db?schema=public"

# Environment Mode
# "development" for local development, "production" for production
NODE_ENV="development"
```

**Note:** The `.env` file is already in `.gitignore`, so it won't be committed to GitHub. This keeps your database credentials safe.

## Test Users

After running `npm run seed`, you'll have three test accounts ready to use:

| Email | Password | Role | What They Can Do |
|-------|----------|------|-----------------|
| `admin@kco.dev` | `Passw0rd!` | ADMIN | Full access - can upload CSVs, edit savings ideas, and view everything |
| `analyst@kco.dev` | `Passw0rd!` | ANALYST | Can upload CSVs and edit savings ideas, but can't delete users |
| `viewer@kco.dev` | `Passw0rd!` | VIEWER | Read-only - can view dashboards and charts, but can't upload or edit anything |

**Tip:** Try logging in with different roles to see how the interface changes based on permissions!

## Sample CSV Files

The project includes sample CSV files for testing. You can find them in the `sample-data/` directory (if included) or you can use your own AWS/GCP billing exports.

### CSV Format Requirements

The upload system is pretty flexible and can handle different CSV formats. Here's what it looks for:

**Required columns (at least one of these):**
- Date: `date`, `usage_start_time`, or `usage_date`
- Service: `service`, `service_description`, or `sku_description`
- Cost: `cost_usd`, `cost`, or `cost_amount`

**What happens when you upload:**
- The system automatically detects if it's AWS or GCP based on the filename
- It validates each row and skips any that are missing required fields
- It removes duplicates automatically (so you can upload the same file twice without issues)
- It maps different column names to a standard format (so AWS and GCP CSVs work the same way)

## Running Tests

To make sure everything works correctly, you can run the test suite:

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs when you change files)
npm run test:watch
```

**What's tested:**
- API endpoints (upload, savings, PR helper)
- CSV parsing and validation
- Data processing logic

**Note:** Make sure your database is set up and accessible before running tests, as some tests need a database connection.

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed script for test users
│   └── migrations/            # Database migrations
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── upload/        # CSV upload endpoint
│   │   │   ├── spend/         # Spend analytics endpoint
│   │   │   ├── savings/       # Savings CRUD endpoints
│   │   │   ├── pr-helper/     # PR note generation
│   │   │   └── auth/          # Authentication endpoints
│   │   ├── dashboard/         # Main dashboard page
│   │   │   └── components/    # Dashboard components
│   │   ├── login/             # Login page
│   │   └── layout.tsx         # Root layout
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── auth.ts            # Authentication helpers
│   └── __tests__/             # Test files
├── public/                    # Static assets
└── README.md
```

## API Endpoints

### Upload
- `POST /api/upload` - Upload billing CSV file

### Spend Analytics
- `GET /api/spend?range=30&cloud=aws&team=backend&env=prod` - Get spend data with filters

### Savings Pipeline
- `GET /api/savings?status=PROPOSED` - List savings ideas (optional status filter)
- `POST /api/savings` - Create new savings idea
- `PUT /api/savings` - Update existing savings idea
- `DELETE /api/savings?id=<id>` - Delete savings idea

### PR Helper
- `POST /api/pr-helper` - Generate Markdown PR note for a savings idea

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout

## Features in Detail

### Spend Overview
- **Daily Trend Chart**: Line chart showing daily spend over selected period
- **Top 5 Services**: Bar chart of highest spending services
- **Filters**: 
  - Date range: 7, 30, or 90 days
  - Cloud provider: AWS, GCP, or All
  - Team: Filter by team name
  - Environment: Filter by environment (prod, staging, etc.)

### Savings Pipeline
- **Status Tracking**: Proposed → Approved → Realized
- **Full CRUD**: Create, read, update, and delete savings ideas
- **Fields**: Title, Service, Estimated Monthly Savings, Confidence (0-1), Owner, Status, Notes
- **Filtering**: Filter by status

### PR Helper
- Generates structured Markdown PR notes including:
  - Change description
  - Savings calculation (estimated × confidence)
  - Pre-checks checklist
  - Validation steps
  - Rollback plan
- One-click copy to clipboard

## Role-Based Access Control

- **ADMIN**: Full access to all features
- **ANALYST**: Can upload CSVs and manage savings ideas
- **VIEWER**: Read-only access to dashboards

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database studio (GUI for database)
npx prisma studio
```

## Deployment

If you want to deploy this to production, here are the easiest options:

### Vercel (Recommended for Next.js)

Vercel is made by the Next.js team, so it works great with Next.js apps:

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up with GitHub
3. Click "Add New Project" and select your repository
4. Add your environment variables (especially `DATABASE_URL`)
5. Click "Deploy" - Vercel will build and deploy automatically
6. After deployment, run `npx prisma migrate deploy` to set up the database

### Railway

Railway makes it easy to deploy with a database:

1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project
3. Add a PostgreSQL service (Railway will create a database for you)
4. Connect your GitHub repository
5. Railway will automatically set the `DATABASE_URL` environment variable
6. Deploy and you're done!

**Note:** After deploying, don't forget to run database migrations on your production database.

## Troubleshooting

If something doesn't work, here are some common issues and how to fix them:

### Database Connection Issues

**Problem:** You see errors like "Can't reach database" or "Connection refused"

**Solutions:**
- Double-check your `DATABASE_URL` in the `.env` file - make sure there are no typos
- If using local PostgreSQL, make sure the PostgreSQL service is running
- If using a cloud database, check that your IP is whitelisted (some cloud databases require this)
- Try connecting to your database using a tool like [pgAdmin](https://www.pgadmin.org/) or [DBeaver](https://dbeaver.io/) to verify the connection string works

### CSV Upload Fails

**Problem:** CSV upload doesn't work or shows an error

**Solutions:**
- Make sure your CSV has at least one of the required columns (date, service, cost)
- Check the file size - very large files might take a while to process
- Look at the browser console (F12) or terminal for error messages
- Make sure you're logged in as Admin or Analyst (Viewer can't upload)

### Tests Failing

**Problem:** Tests fail with database errors

**Solutions:**
- Make sure your database is set up and the `DATABASE_URL` is correct
- Run `npx prisma generate` before running tests
- Check that your `.env` file exists and has the correct `DATABASE_URL`

### Port Already in Use

**Problem:** You see "Port 3000 is already in use"

**Solutions:**
- Close any other applications using port 3000
- Or run on a different port: `npm run dev -- -p 3001`

### Prisma Client Not Found

**Problem:** You see errors about Prisma client not being generated

**Solutions:**
- Run `npx prisma generate` - this creates the Prisma client
- Make sure you're in the project root directory when running commands

## Screenshots

Screenshots showing all the features are in the `Screenshots/` directory. These help demonstrate what the application does without having to run it.

### Login Page
![Login Page with Test Account Buttons](./Screenshots/login.png)

### Dashboard Overview
![Dashboard Overview](./Screenshots/dashboard-1.png)

![Dashboard with Spend Analytics Charts](./Screenshots/dashboard-2.png)


### Filters in Action
![Filters - Date Range, Cloud, Team, Environment](./Screenshots/filters.png.png)

### CSV Upload Interface
![CSV Upload Interface](./Screenshots/upload-interface.png)

### Upload Success
![Upload Success Message](./Screenshots/upload-success.png)

### Savings Pipeline
![Savings Pipeline List View](./Screenshots/savings-pipeline.png)

### Create/Edit Savings Idea
![Create/Edit Savings Idea Form](./Screenshots/savings-form.png)

### PR Helper
![Generated PR Markdown](./Screenshots/pr-markdown.png)

### Viewer Role
![Viewer Role with Read-Only Access (Upload Button Hidden)](./Screenshots/viewer-role.png)

## Contact

For questions or issues, please refer to the documentation.
