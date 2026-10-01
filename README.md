# E-Commerce Inventory Management System

A beginner-friendly, decoupled API-driven mini-project for Pillai HOC College of Engineering and Technology (Dept. of Electronics and Computer Science).

## Architecture Overview
This project uses a modern decoupled architecture:
- **Frontend (100% Pure HTML/CSS/JS):** The interface is built using Single-Page Application (SPA) principles with Vanilla JavaScript. No PHP is written inside the HTML files.
- **Backend (100% Pure PHP):** The backend serves strictly as an API, receiving requests and returning raw JSON data.
- **Database (MySQL):** Handles data persistence, ensuring relational integrity and atomic operations (like stock deduction during checkout).

## Folder Structure

```
sen5 mini project/
├── css/
│   └── style.css            # Global stylesheet
├── js/
│   ├── app.js               # Shared JS logic for Admin and Staff panels
│   └── store.js             # JavaScript logic for the Customer Storefront
├── includes/
│   └── db.php               # PDO Database Connection String
├── api/
│   ├── backend.php          # Unified PHP API for Auth, Admin, and Staff tasks
│   └── store_backend.php    # PHP API for Storefront and Checkout logic
├── admin/
│   └── index.html           # Admin Dashboard SPA
├── staff/
│   └── index.html           # Staff Dashboard SPA
├── login.html               # Staff/Admin Login Page
├── index.html               # Customer Storefront & Cart (Stage 5)
├── database.sql             # SQL script to initialize DB and sample data
└── README.md                # Project documentation
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

## Default Credentials

**Admin Account** (Full catalog management)
- Username: `admin`
- Password: `admin123`

**Staff Account** (Read-only catalog, Order processing)
- Username: `staff`
- Password: `staff123`
