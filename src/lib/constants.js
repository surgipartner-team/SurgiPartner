export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    SESSION: "/api/auth/session",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    VERIFY_RESET_TOKEN: "/api/auth/verify-reset-token",
    RESET_PASSWORD: "/api/auth/reset-password",
  },

  LEADS: "/api/v1/leads",
  PATIENTS: "/api/v1/patients",
  PIPELINE: "/api/v1/pipeline",
  HOSPITALS: "/api/v1/hospitals",
  MACHINES: "/api/v1/machines",
  CONSUMABLES: "/api/v1/consumables",
  BILLING: "/api/v1/billing",
  FINANCE: "/api/v1/finance",
  USERS: "/api/v1/users",
  CALENDAR: "/api/v1/calendar",

  PIPELINE_ACTIVITIES: (id) => `/api/v1/pipeline/${id}/activities`,
  PIPELINE_NOTES: (id) => `/api/v1/pipeline/${id}/notes`,
  PIPELINE_DOCUMENTS: (id) => `/api/v1/pipeline/${id}/documents`,
  PIPELINE_PAYMENTS: (id) => `/api/v1/pipeline/${id}/payments`,
  PATIENT_ACTIVITIES: (id) => `/api/v1/patients/${id}/activities`,
  PATIENT_NOTES: (id) => `/api/v1/patients/${id}/notes`,
  PATIENT_DOCUMENTS: (id) => `/api/v1/patients/${id}/documents`,
  PATIENT_PAYMENTS: (id) => `/api/v1/patients/${id}/payments`,
  LEAD_ACTIVITIES: (id) => `/api/v1/leads/${id}/activities`,

  REGISTER_USER: "/api/v1/users",
  ASSIGN_LEADS: "/api/v1/users/assign-leads",
  LEAD_ASSIGN: "/api/v1/leads/assign",
  CHECK_DUPLICATES: "/api/v1/leads/check-duplicates",
};

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
};

export const ROLE_ROUTES = {
  admin: "/admin/dashboard",
  sales: "/sales/dashboard",
  ops: "/ops/dashboard",
  carebuddy: "/carebuddy/dashboard",
  accountant: "/accountant/dashboard",
  outsourcing: "/outsourcing/dashboard",
  patient: "/patient/dashboard",
};

export const SESSION_CONFIG = {
  cookieName: process.env.SESSION_NAME || "surgipartner_session",
  password:
    process.env.SESSION_SECRET ||
    "complex_password_at_least_32_characters_long",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400, // 24 hours
    path: "/",
  },
};

export const SECURITY = {
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  LOCK_TIME_MINUTES: parseInt(process.env.LOCK_TIME_MINUTES) || 5,
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  PASSWORD_MIN_LENGTH: 8,
  RESET_TOKEN_EXPIRY: 3600000,
};

export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  EMAIL: {
    PATTERN: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  },
  MOBILE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 13,
    PATTERN: /^(?:\+91[- ]?)?[6-9]\d{9}$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  },
};
