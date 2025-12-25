# SellerSync

**Seller Payments and Cash Flow Management System**

A modern, mobile-friendly web application for managing seller payments, tracking cash flow, and generating financial reports.

## Features

- **Dashboard**: Consolidated financial summary with trend analytics
- **Seller Tracking**: Manage payments from multiple sellers (Akriti, Bhagalpuri, Gauri)
- **Pending Amounts**: Track and monitor pending payments with due dates
- **User Authentication**: Secure login with JWT-based authentication
- **Role-Based Access**: Admin, Manager, and Viewer roles
- **Reporting**: Generate and export financial reports (JSON backup, printable reports)

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MySQL
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Authentication**: JWT (JSON Web Tokens)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MySQL Server

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure database:**

   - Create a MySQL database named `sellersync`
   - Update `.env` file with your MySQL credentials if needed

3. **Set up database schema:**

   ```bash
   # In MySQL client
   mysql -u root -p < database/schema.sql
   ```

4. **Set up admin user:**

   ```bash
   node setup-admin.js
   ```

5. **Start the server:**

   ```bash
   npm start
   ```

6. **Access the application:**
   Open `http://localhost:3000` in your browser

### Admin Credentials

- **Username**: admin
- **Password**: Axis#654321

## Project Structure

```
sellersync/
├── server.js           # Main Express server
├── package.json        # Project dependencies
├── .env               # Environment configuration
├── setup-admin.js     # Admin user setup script
├── config/
│   └── database.js    # MySQL connection pool
├── database/
│   ├── schema.sql     # Database schema
│   └── seed.sql       # Sample data
├── middleware/
│   └── auth.js        # JWT & RBAC middleware
├── routes/
│   ├── auth.js        # Authentication endpoints
│   ├── sellers.js     # Seller management
│   ├── payments.js    # Payment tracking
│   └── reports.js     # Reporting & export
└── public/
    ├── index.html     # Dashboard
    ├── login.html     # Login page
    ├── sellers.html   # Seller management
    ├── payments.html  # Payment history
    ├── reports.html   # Financial reports
    ├── css/
    │   └── style.css  # Design system
    └── js/
        ├── api.js      # API client
        ├── dashboard.js # Dashboard logic
        └── auth.js     # Authentication
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Sellers

- `GET /api/sellers` - List all sellers
- `GET /api/sellers/:id` - Get seller details
- `POST /api/sellers` - Create seller
- `PUT /api/sellers/:id` - Update seller
- `DELETE /api/sellers/:id` - Delete seller

### Payments

- `GET /api/payments` - List payments (with filters)
- `GET /api/payments/summary` - Financial summary
- `POST /api/payments` - Record payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Reports

- `GET /api/reports/financial` - Financial report
- `GET /api/reports/export/json` - Export data as JSON
- `GET /api/reports/printable` - Printable HTML report

## Deployment

### Hostinger / Render.com

1. Push code to GitHub
2. Connect repository to Hostinger or Render
3. Set environment variables:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `JWT_SECRET`
   - `PORT`
4. Run database migrations
5. Deploy!

## License

ISC
