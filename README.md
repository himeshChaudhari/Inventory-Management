# 7Heven - E-Commerce Inventory & Order Management System

A modern, high-performance E-Commerce platform and Inventory Management System built with a decoupled architecture. Features a responsive customer storefront, a secure staff portal, and a comprehensive admin dashboard with real-time analytics.

## Features

- **Customer Storefront:** Browse products, live cart management, and seamless checkout with dynamic image handling.
- **Admin Dashboard:** Visual analytics, sales trends, dead stock identification, and automated reorder suggestions.
- **Staff Portal:** Order fulfillment processing, live stock alerts, and role-based access control (RBAC).
- **Secure Backend:** PDO prepared statements, Bcrypt password hashing, and session fixation protection.
- **Decoupled Architecture:** A clean separation of concerns using a PHP REST API backend and a pure HTML/CSS/JS frontend.

## Architecture

- **Frontend:** 100% Pure HTML/CSS/JS (Vanilla, No Frameworks). Single-Page Application (SPA) design.
- **Backend:** 100% PHP (Vanilla). Operates strictly as a JSON REST API.
- **Database:** MySQL relational database ensuring data consistency via soft deletes and transactional row-locking.

## Folder Structure

```
sen5 mini project/
├── css/                 # Global styling and CSS variables
├── js/                  # SPA routing and frontend logic
├── includes/            # PDO Database Connection
├── api/                 # PHP API endpoints (Auth, Storefront, Admin)
├── admin/               # Admin Dashboard view
├── staff/               # Staff Dashboard view
├── database.sql         # SQL script to initialize DB
└── index.html           # Customer Storefront entry point
```

## Setup Instructions

1. **Clone the Repository:**
   Navigate to your WAMP server's `www` directory and clone the project:
   ```bash
   cd C:\wamp64\www\
   git clone https://github.com/himeshChaudhari/Inventory-Management.git "sen5 mini project"
   ```
2. **Start WAMP:** Open WAMP Server and ensure all services are running (Green Icon).
3. **Database Setup:** 
   - Open `phpMyAdmin` (`http://localhost/phpmyadmin`).
   - Copy the contents of `database.sql` and paste it into the **SQL tab**.
   - Click **Go** to create the `inventory_system` database and populate the tables with sample data.
4. **Database Credentials:** 
   - Create a `.env` file in the root of the project and set `DB_PASS` to your local MySQL password. 
   - Example `.env` contents:
     ```
     DB_HOST=127.0.0.1
     DB_NAME=inventory_system
     DB_USER=root
     DB_PASS=your_password_here
     ```

## Accessing the Project

- **Customer Storefront:** `http://localhost/sen5 mini project/index.html`
- **System Login:** `http://localhost/sen5 mini project/login.html`

## License
MIT License
