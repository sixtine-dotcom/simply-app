# Simply Platform - Security & Compliance

## 1. Role-Based Access Control (RBAC)

### 1.1 Role Definitions

| Role | Description | User Count |
|------|-------------|------------|
| **ADMIN** | Platform owner, full access | 1-2 |
| **COACH** | Assigned coaches, view clients | 1-5 |
| **CLIENT** | Regular users, access own data | Unlimited |
| **SUPPORT** | Customer support, limited admin | 1-3 |

### 1.2 Permission Matrix

| Resource | Action | ADMIN | COACH | CLIENT | SUPPORT |
|----------|--------|-------|-------|--------|---------|
| **Users** | List all | ✅ | Own clients | ❌ | ✅ |
| | View profile | ✅ | Own clients | Own | ✅ |
| | Create | ✅ | ❌ | ❌ | ❌ |
| | Edit | ✅ | ❌ | Own | ❌ |
| | Delete | ✅ | ❌ | ❌ | ❌ |
| | Impersonate | ✅ | ❌ | ❌ | ❌ |
| **Courses** | List all | ✅ | ✅ | Enrolled | ✅ |
| | View content | ✅ | ✅ | Enrolled | ✅ |
| | Create/Edit | ✅ | ❌ | ❌ | ❌ |
| | Delete | ✅ | ❌ | ❌ | ❌ |
| | Duplicate | ✅ | ❌ | ❌ | ❌ |
| **Enrollments** | List | ✅ | Own clients | Own | ✅ |
| | Create | ✅ | ❌ | ❌ | ❌ |
| | Revoke | ✅ | ❌ | ❌ | ❌ |
| **Progress** | View | ✅ | Own clients | Own | ❌ |
| | Update | ❌ | ❌ | Own | ❌ |
| **Community** | View spaces | ✅ | ✅ | Accessible | ✅ |
| | Create space | ✅ | ❌ | ❌ | ❌ |
| | Post (regular) | ✅ | ✅ | ✅ | ❌ |
| | Post (host-only) | ✅ | ❌ | ❌ | ❌ |
| | Delete posts | ✅ | ❌ | Own | ❌ |
| | Moderate | ✅ | ❌ | ❌ | ✅ |
| **Messages** | View DMs | ✅* | Own | Own | ❌ |
| | Send DMs | ✅ | ✅ | ✅ | ❌ |
| **Sessions** | List all | ✅ | Own | Own | ✅ |
| | Create | ✅ | ✅ | ❌ | ❌ |
| | Join | ✅ | Own | Own | ❌ |
| | Cancel | ✅ | Own | Own* | ❌ |
| **Trackers** | View | ✅ | Own clients | Own | ❌ |
| | Edit | ❌ | ❌ | Own | ❌ |
| **Recipes** | View | ✅ | ✅ | ✅ | ✅ |
| | Create/Edit | ✅ | ❌ | ❌ | ❌ |
| **AI Chat** | Use | ✅ | ✅ | ✅ | ✅ |
| | View logs | ✅ | Own clients | Own | ❌ |
| | Manage KB | ✅ | ❌ | ❌ | ❌ |
| **WhatsApp** | Send | ✅ | Own clients | ❌ | ❌ |
| | View logs | ✅ | Own clients | ❌ | ✅ |
| **Audit Logs** | View | ✅ | ❌ | ❌ | ❌ |
| **Settings** | Platform | ✅ | ❌ | ❌ | ❌ |
| | Own profile | ✅ | ✅ | ✅ | ✅ |

*Admin can view DMs only when needed for support/moderation, with audit logging

### 1.3 Implementation

```typescript
// middleware/authorization.ts
import { Role, User } from '@prisma/client';

type Resource = 'user' | 'course' | 'enrollment' | 'progress' | 'space' | 'post' | 'message' | 'session' | 'tracker' | 'recipe' | 'ai' | 'whatsapp' | 'audit';
type Action = 'list' | 'view' | 'create' | 'update' | 'delete';

interface PermissionContext {
  user: User;
  resource: Resource;
  action: Action;
  resourceOwnerId?: string;
  additionalContext?: Record<string, any>;
}

export function canAccess(ctx: PermissionContext): boolean {
  const { user, resource, action, resourceOwnerId } = ctx;

  // Admin has full access (except editing others' personal data)
  if (user.role === 'ADMIN') {
    return true;
  }

  // Support has read-only access to most things
  if (user.role === 'SUPPORT') {
    return action === 'list' || action === 'view';
  }

  // Coach: can access own clients
  if (user.role === 'COACH') {
    if (action === 'view' && resourceOwnerId) {
      return isClientOfCoach(user.id, resourceOwnerId);
    }
  }

  // Client: can only access own resources
  if (user.role === 'CLIENT') {
    if (resourceOwnerId && resourceOwnerId !== user.id) {
      return false;
    }
    // Check enrollment for courses
    if (resource === 'course' && action === 'view') {
      return hasEnrollment(user.id, ctx.additionalContext?.courseId);
    }
    return ['view', 'create', 'update'].includes(action);
  }

  return false;
}

// Middleware for API routes
export function requirePermission(resource: Resource, action: Action) {
  return async (req: Request, ctx: { user: User }) => {
    if (!canAccess({ user: ctx.user, resource, action })) {
      throw new ForbiddenError('Access denied');
    }
  };
}
```

---

## 2. Authentication Security

### 2.1 Magic Link Security

```typescript
// Token generation
function generateMagicLink(email: string): { token: string; url: string } {
  // Use cryptographically secure random bytes
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store hashed token (never store plaintext)
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  await db.verificationToken.create({
    data: {
      email,
      token: hashedToken,
      type: 'magic_link',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
  });

  return {
    token,
    url: `${process.env.APP_URL}/auth/verify?token=${token}`,
  };
}

// Token verification
async function verifyMagicLink(token: string): Promise<User | null> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const record = await db.verificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!record) return null;
  if (record.usedAt) return null; // Already used
  if (record.expiresAt < new Date()) return null; // Expired

  // Mark as used
  await db.verificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return db.user.findUnique({ where: { email: record.email } });
}
```

### 2.2 Session Security

```typescript
// Session configuration
const sessionConfig = {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// Session token generation
function createSession(userId: string, req: Request) {
  const token = crypto.randomBytes(32).toString('hex');
  
  return db.authSession.create({
    data: {
      userId,
      token: hashToken(token),
      expiresAt: new Date(Date.now() + sessionConfig.maxAge * 1000),
      userAgent: req.headers.get('user-agent'),
      ipAddress: getClientIP(req),
    },
  });
}
```

### 2.3 Password Security (Optional Login)

```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Password requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false, // Keep it user-friendly
};
```

---

## 3. GDPR Compliance

### 3.1 Data Processing Principles

| Principle | Implementation |
|-----------|----------------|
| **Lawfulness** | Consent collected at signup, terms of service |
| **Purpose limitation** | Data used only for platform functionality |
| **Data minimization** | Only collect necessary data |
| **Accuracy** | Users can update their own data |
| **Storage limitation** | Retention policies defined below |
| **Integrity** | Encryption, access controls |
| **Accountability** | Audit logs, privacy policy |

### 3.2 Data Retention Policy

| Data Type | Retention Period | Deletion Trigger |
|-----------|-----------------|------------------|
| User account | Active + 2 years after last login | Account deletion request |
| Course progress | Same as user | Account deletion |
| Community posts | Same as user | Post deletion or account deletion |
| Direct messages | Same as user | Account deletion |
| Check-in photos | 2 years | User request or retention expiry |
| Tracker data | Same as user | Account deletion |
| AI conversations | 1 year | Automatic |
| Audit logs | 3 years | Automatic |
| WhatsApp logs | 1 year | Automatic |

### 3.3 User Rights Implementation

```typescript
// Right to access (data export)
async function exportUserData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      enrollments: true,
      progress: true,
      checkIns: true,
      nutritionLogs: true,
      habitLogs: true,
      cycleLogs: true,
      symptomLogs: true,
      posts: true,
      comments: true,
      aiConversations: { include: { messages: true } },
    },
  });

  // Generate JSON export
  return {
    exportedAt: new Date().toISOString(),
    personalData: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
    },
    courseProgress: user.enrollments,
    trackingData: {
      checkIns: user.checkIns,
      nutrition: user.nutritionLogs,
      habits: user.habitLogs,
      cycle: user.cycleLogs,
      symptoms: user.symptomLogs,
    },
    communityData: {
      posts: user.posts,
      comments: user.comments,
    },
    aiConversations: user.aiConversations,
  };
}

// Right to erasure (account deletion)
async function deleteUserData(userId: string) {
  // Soft delete user
  await db.user.update({
    where: { id: userId },
    data: {
      email: `deleted-${userId}@deleted.local`,
      firstName: 'Deleted',
      lastName: 'User',
      phone: null,
      avatarUrl: null,
      deletedAt: new Date(),
    },
  });

  // Delete photos from storage
  await deleteUserPhotos(userId);

  // Anonymize posts (keep for community context)
  await db.post.updateMany({
    where: { authorId: userId },
    data: { authorId: null }, // Or keep with "Deleted User" label
  });

  // Delete private data
  await db.message.deleteMany({ where: { senderId: userId } });
  await db.checkIn.deleteMany({ where: { userId } });
  await db.nutritionLog.deleteMany({ where: { userId } });
  // ... etc

  // Log deletion for audit
  await createAuditLog('user.deleted', null, { userId });
}
```

### 3.4 Consent Management

```typescript
// Consent types
enum ConsentType {
  TERMS_OF_SERVICE = 'terms',
  PRIVACY_POLICY = 'privacy',
  MARKETING_EMAIL = 'marketing_email',
  WHATSAPP = 'whatsapp',
  TRACKING_COOKIES = 'cookies',
}

model UserConsent {
  id        String      @id @default(cuid())
  userId    String
  type      ConsentType
  granted   Boolean
  grantedAt DateTime?
  revokedAt DateTime?
  ipAddress String?
  
  @@unique([userId, type])
}

// Require consent before certain actions
async function requireConsent(userId: string, type: ConsentType) {
  const consent = await db.userConsent.findUnique({
    where: { userId_type: { userId, type } },
  });

  if (!consent?.granted) {
    throw new ConsentRequiredError(`Consent required: ${type}`);
  }
}
```

---

## 4. API Security

### 4.1 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts
  message: 'Te veel pogingen, probeer later opnieuw',
});

// AI chat rate limit
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute
});
```

### 4.2 Input Validation

```typescript
import { z } from 'zod';

// Example: User registration
const registerSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  password: z.string().min(8).max(100).optional(),
});

// Example: Post creation
const postSchema = z.object({
  content: z.string().min(1).max(10000).trim(),
  spaceId: z.string().cuid(),
});

// Validation middleware
function validate<T>(schema: z.ZodSchema<T>) {
  return async (req: Request) => {
    const body = await req.json();
    return schema.parse(body);
  };
}
```

### 4.3 SQL Injection Prevention

Using Prisma ORM which provides parameterized queries by default:

```typescript
// Safe: Prisma handles escaping
const users = await db.user.findMany({
  where: { email: userInput },
});

// For raw queries, use $queryRaw with template literals
const results = await db.$queryRaw`
  SELECT * FROM "User" WHERE email = ${userInput}
`;
```

### 4.4 XSS Prevention

```typescript
// Sanitize user-generated content
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

// Content Security Policy header
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.openai.com wss://*.pusher.com;
  frame-src 'self' https://www.loom.com https://*.daily.co;
  media-src 'self' https://*.mux.com blob:;
`;
```

---

## 5. Audit Logging

### 5.1 Events to Log

| Category | Events |
|----------|--------|
| **Auth** | login, logout, magic_link_sent, password_changed |
| **User** | created, updated, deleted, role_changed |
| **Enrollment** | created, revoked, extended |
| **Course** | created, updated, deleted, duplicated |
| **Admin** | settings_changed, user_impersonated |
| **WhatsApp** | message_sent |
| **AI** | conversation_started (not individual messages) |

### 5.2 Implementation

```typescript
interface AuditEvent {
  action: string;
  userId: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

async function createAuditLog(event: AuditEvent) {
  await db.auditLog.create({
    data: {
      action: event.action,
      userId: event.userId,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata,
      ipAddress: event.ipAddress,
      createdAt: new Date(),
    },
  });
}

// Usage
await createAuditLog({
  action: 'user.role_changed',
  userId: adminId,
  entityType: 'User',
  entityId: targetUserId,
  metadata: { oldRole: 'CLIENT', newRole: 'COACH' },
  ipAddress: req.ip,
});
```

---

## 6. Infrastructure Security

### 6.1 Environment Variables

- Never commit secrets to git
- Use `.env.local` for development
- Use proper secrets management in production (Vercel, Railway, etc.)
- Rotate secrets periodically

### 6.2 Database Security

- Use SSL connections
- Restrict network access (private network if possible)
- Regular backups with encryption
- Separate read replicas for analytics (future)

### 6.3 File Upload Security

```typescript
// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm'];

const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 50 * 1024 * 1024, // 50MB
};

function validateUpload(file: File, type: 'image' | 'video' | 'audio') {
  const allowedTypes = {
    image: ALLOWED_IMAGE_TYPES,
    video: ALLOWED_VIDEO_TYPES,
    audio: ALLOWED_AUDIO_TYPES,
  }[type];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  if (file.size > MAX_FILE_SIZES[type]) {
    throw new Error('File too large');
  }
}
```

---

## 7. Security Checklist (Pre-Launch)

### Authentication
- [ ] Magic links expire after 15 minutes
- [ ] Magic links can only be used once
- [ ] Session tokens are httpOnly and secure
- [ ] Password hashing uses bcrypt with 12+ rounds
- [ ] Rate limiting on auth endpoints

### Authorization
- [ ] All API routes check user permissions
- [ ] Users can only access their own data
- [ ] Admin actions are audit logged
- [ ] File access requires authentication

### Data Protection
- [ ] HTTPS enforced everywhere
- [ ] Database connections use SSL
- [ ] Secrets not committed to git
- [ ] User data export available
- [ ] Account deletion works completely

### Input/Output
- [ ] All inputs validated with Zod
- [ ] HTML content sanitized
- [ ] CSP headers configured
- [ ] SQL injection prevented (Prisma)

### Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Audit logs for sensitive actions
- [ ] Rate limit alerts
- [ ] Uptime monitoring
