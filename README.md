# SurgiPartner Admin Dashboard

A comprehensive administrative interface built with Next.js for managing SurgiPartner operations.

## 🚀 Technologies

- **Framework:** [Next.js 16](https://nextjs.org/) (App Directory)
- **Language:** JavaScript/TypeScript
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Database:** MySQL (via `mysql2`)
- **Caching/Rate Limiting:** Redis (via `@upstash/redis` and `@upstash/ratelimit`)
- **Authentication:** Custom Auth with `iron-session`, `jsonwebtoken`, and `bcrypt`
- **State Management:** React Context / Hooks
- **Media:** Cloudinary, Sharp
- **Utilities:** `zod` (validation), `date-fns` (implied or standard JS Date), `jspdf` (PDF generation), `qrcode` (QR generation), `nodemailer` (Email)

## ✨ Features

- **Dashboard Analytics:** Visual data representation using chart libraries (implied by analytic needs).
- **User Management:** Admin and potentially other role management.
- **Secure Authentication:** Session management with encryption and password hashing.
- **Media Management:** Upload and process images.
- **Report Generation:** Generate PDFs for invoices or reports.
- **Security:** Code obfuscation for production builds using `javascript-obfuscator`.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MySQL Database
- Redis Instance (Upstash or local)
- Cloudinary Account (for media)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd surgipartner-admin
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the root directory and add the necessary environment variables:
   ```env
   # Database
   DATABASE_URL=mysql://user:password@host:port/database

   # Redis / Upstash
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=

   # Authentication
   SECRET_COOKIE_PASSWORD= # Must be at least 32 characters
   JWT_SECRET=

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=

   # Mail (Nodemailer)
   SMTP_HOST=
   SMTP_PORT=
   SMTP_USER=
   SMTP_PASS=
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📜 Scripts

- `npm run dev`: Runs the app in development mode.
- `npm run build`: Builds the app for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run postbuild`: Automatically runs after `build` to obfuscate the production code for security.

## 🔒 Security

This project includes `javascript-obfuscator` in the build process to protect logic in client-side bundles.

## 📄 License

[MIT](LICENSE)
