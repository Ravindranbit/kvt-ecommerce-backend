# 🛒 AI-Assisted E-commerce Backend

### Scalable Node.js + Prisma + PostgreSQL Architecture

------------------------------------------------------------------------

## 📌 Overview

This project is a **production-grade e-commerce backend system**
inspired by platforms like Amazon and Flipkart. It is designed with a
focus on **scalability, data integrity, and clean architecture**,
supporting complete user and admin workflows.

The system includes **authentication, product management, hierarchical
categories, persistent cart, transactional checkout, and payment
integration**, along with robust validation and error handling
mechanisms.

------------------------------------------------------------------------

## 🧠 Key Highlights

-   🔐 OTP-based authentication with JWT authorization\
-   🛠 Role-based admin system (SUPER_ADMIN & ADMIN)\
-   🗂 Hierarchical category system with recursive product filtering\
-   🛒 Persistent cart with **price snapshot consistency**\
-   💳 Transaction-safe checkout with **stock validation**\
-   💰 Razorpay payment integration with signature verification\
-   ✅ Input validation using **Zod middleware**\
-   ⚠️ Centralized error handling for clean API responses

------------------------------------------------------------------------

## ⚙️ Tech Stack

  Layer             Technology
  ----------------- ---------------------
  Backend           Node.js, Express.js
  Database          PostgreSQL
  ORM               Prisma
  Authentication    JWT
  Validation        Zod
  Payment Gateway   Razorpay
  Utilities         bcrypt, Axios

------------------------------------------------------------------------

## 🏗️ System Architecture

Client (Frontend) ↓ Express API (Routes) ↓ Controllers (Business Logic)
↓ Prisma ORM ↓ PostgreSQL Database

### Middleware Layer:

-   Authentication (JWT)
-   Role-based Authorization (Admin)
-   Validation (Zod)
-   Error Handling (Centralized)

------------------------------------------------------------------------

## 📂 Project Structure

src/ ├── config/ ├── middleware/ ├── modules/ │ ├── auth/ │ ├── admin/ │
├── product/ │ ├── category/ │ ├── cart/ │ ├── order/ │ ├── payment/ ├──
utils/ ├── app.js ├── server.js prisma/ ├── schema.prisma ├──
migrations/

------------------------------------------------------------------------

## 🔑 Core Features

### 🔐 Authentication System

-   OTP-based user registration (phone verification)
-   JWT-based login (email/phone)
-   Protected routes using middleware

### 🛠 Admin Management

-   SUPER_ADMIN creates and manages admins\
-   Admin activation/deactivation\
-   Secure password flow

### 📦 Product Management

-   Create, update, deactivate products\
-   Public product listing and search\
-   Category-based filtering

### 🗂 Category System (Hierarchical)

Food ├── Spices │ ├── Turmeric

-   Self-referencing schema (`parentId`)
-   Recursive category tree generation\
-   Products fetched across all subcategories

### 🛒 Cart System (Persistent)

-   Cart stored per user in database\
-   Add / update / remove items\
-   Prevent duplicate items (unique constraint)

**Price Snapshot:** Cart stores product price at time of adding

### 🧾 Order & Checkout System

-   Transaction-based checkout using Prisma\
-   Atomic operations:
    -   Order creation\
    -   Order items snapshot\
    -   Cart clearing\
    -   Stock decrement

**Key Features:** - Stock validation\
- Snapshot storage

### 💳 Payment Integration (Razorpay)

-   Create payment order\
-   Secure signature verification\
-   Order marked CONFIRMED after payment

### ✅ Validation System (Zod)

-   Centralized request validation\
-   Structured error responses

### ⚠️ Error Handling

-   Centralized middleware\
-   Consistent API responses

------------------------------------------------------------------------

## 🔄 API Overview

### Auth

-   POST /auth/register/initiate
-   POST /auth/register/verify
-   POST /auth/login

### Products

-   GET /products
-   GET /products/:id

### Categories

-   GET /categories
-   GET /categories/:slug

### Cart

-   POST /cart/add
-   PATCH /cart/update
-   DELETE /cart/remove/:productId
-   GET /cart

### Orders

-   POST /orders/place
-   GET /orders/my

### Payment

-   POST /payment/create-order
-   POST /payment/verify

------------------------------------------------------------------------

## 🔍 Key Engineering Decisions

-   Prisma transactions for atomic checkout\
-   Price snapshot for consistency\
-   Recursive category design\
-   Zod validation middleware\
-   Centralized error handling

------------------------------------------------------------------------

## ⚙️ Setup Instructions

git clone `<repo-url>`{=html} cd `<project-folder>`{=html}

npm install

Create .env:

DATABASE_URL=your_postgres_url JWT_SECRET=your_secret
RAZORPAY_KEY_ID=your_key RAZORPAY_KEY_SECRET=your_secret

npx prisma migrate dev

npm run dev

------------------------------------------------------------------------

## 🚀 Future Enhancements

-   AI recommendations\
-   Semantic search\
-   Admin analytics\
-   Reviews & ratings\
-   Image uploads
