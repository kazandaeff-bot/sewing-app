---
Task ID: security-audit-fixes
Agent: Main
Task: Fix all security vulnerabilities identified by independent audit

Work Log:
- Analyzed all 11 audit findings against actual codebase
- Found several issues already partially fixed (bcrypt hashing, some password exclusions)
- Fixed password leaks in 10 API route files (sewing-tasks, ironing, cutting-plans, stats, customers, tasks, sewing-reworks, plans/[id], employees/[id])
- Created EMPLOYEE_PUBLIC_SELECT and EMPLOYEE_PUBLIC_INCLUDE in db.ts for consistent password exclusion
- Created rate-limit.ts for login brute force protection (5 attempts/min, 5-min lockout)
- Created proxy.ts with role-based access control for API routes
- Generated secure JWT_SECRET and added to .env
- Made JWT_SECRET mandatory in production (throws Error if missing)
- Fixed SewingTask status bug: 'done' → 'completed' in sewing-tasks-tab.tsx
- Unblocked seed endpoint for production (supervisor-only, ?force=true required)
- Added all 8 roles to seed endpoint (seller1, technologist1, cutter1, ironing1)
- Removed unprotected /api/hello endpoint
- Secured /api/route.ts as health check (no sensitive data)

Stage Summary:
- All critical (🔴) vulnerabilities fixed
- All medium (🟡) vulnerabilities fixed
- All low (🟢) issues fixed
- Server builds and runs successfully on port 3000
- Verified: No password leaks, role-based access works, rate limiting works
- All 7 roles can log in successfully
