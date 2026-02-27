# Simply Platform - Data Model

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE ENTITIES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌───────────────┐    ┌─────────┐                          │
│  │  User   │───<│  Enrollment   │>───│ Course  │                          │
│  └────┬────┘    └───────────────┘    └────┬────┘                          │
│       │                                    │                               │
│       │         ┌───────────────┐    ┌────┴────┐                          │
│       │    ┌───<│   Progress    │>───│ Module  │                          │
│       │    │    └───────────────┘    └────┬────┘                          │
│       │    │                              │                               │
│       │    │                         ┌────┴────┐                          │
│       └────┴────────────────────────>│ Lesson  │                          │
│                                      └─────────┘                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                            COMMUNITY ENTITIES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌───────────────┐    ┌─────────┐                          │
│  │  User   │───<│ SpaceMember   │>───│  Space  │                          │
│  └────┬────┘    └───────────────┘    └────┬────┘                          │
│       │                                    │                               │
│       │         ┌─────────┐          ┌────┴────┐                          │
│       └────────>│  Post   │<─────────│         │                          │
│                 └────┬────┘                                                │
│                      │                                                     │
│                 ┌────┴────┐                                                │
│                 │ Comment │                                                │
│                 └─────────┘                                                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           MESSAGING ENTITIES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌───────────────┐    ┌──────────────┐                     │
│  │  User   │───<│ Conversation  │───<│   Message    │                     │
│  └─────────┘    │   Participant │    └──────────────┘                     │
│                 └───────────────┘                                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           COACHING ENTITIES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌───────────────┐    ┌──────────────┐                     │
│  │  User   │───<│    Session    │>───│ SessionNote  │                     │
│  │ (client)│    │   (booking)   │                                          │
│  └─────────┘    └───────┬───────┘                                          │
│                         │                                                  │
│  ┌─────────┐            │                                                  │
│  │  User   │────────────┘                                                  │
│  │ (coach) │                                                               │
│  └─────────┘                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (PostgreSQL + Prisma)

### 1. Users & Authentication

```prisma
// User roles
enum Role {
  ADMIN
  COACH
  CLIENT
  SUPPORT
}

// User account
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  emailVerified   DateTime?
  passwordHash    String?   // Optional - for password login
  firstName       String
  lastName        String
  avatarUrl       String?
  role            Role      @default(CLIENT)
  phone           String?   // For WhatsApp
  shopifyCustomerId String? @unique
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?
  
  // Relations
  enrollments     Enrollment[]
  progress        Progress[]
  spaceMemberships SpaceMember[]
  posts           Post[]
  comments        Comment[]
  conversationParticipants ConversationParticipant[]
  messages        Message[]
  sessionsAsClient Session[] @relation("ClientSessions")
  sessionsAsCoach  Session[] @relation("CoachSessions")
  checkIns        CheckIn[]
  nutritionLogs   NutritionLog[]
  habitLogs       HabitLog[]
  cycleLogs       CycleLog[]
  symptomLogs     SymptomLog[]
  groceryLists    GroceryList[]
  mealPlans       MealPlan[]
  aiConversations AiConversation[]
  whatsappMessages WhatsappMessage[]
  
  @@index([email])
  @@index([shopifyCustomerId])
}

// Magic link tokens
model VerificationToken {
  id         String   @id @default(cuid())
  token      String   @unique
  email      String
  type       String   // "magic_link" | "password_reset"
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())
  
  @@index([token])
  @@index([email])
}

// Sessions for auth
model AuthSession {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token        String   @unique
  expiresAt    DateTime
  userAgent    String?
  ipAddress    String?
  createdAt    DateTime @default(now())
  
  @@index([token])
  @@index([userId])
}
```

### 2. Courses & Learning

```prisma
// Course (Program)
model Course {
  id              String    @id @default(cuid())
  title           String
  slug            String    @unique
  description     String?
  thumbnailUrl    String?
  isPublished     Boolean   @default(false)
  isPrivate       Boolean   @default(false) // For 1-on-1 trajecten
  
  // Dripping settings
  drippingEnabled Boolean   @default(false)
  drippingUnit    String?   // "days" | "weeks"
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  modules         Module[]
  enrollments     Enrollment[]
  
  @@index([slug])
}

// Module within a course
model Module {
  id              String    @id @default(cuid())
  courseId        String
  course          Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title           String
  description     String?
  position        Int       // Order within course
  
  // Dripping
  unlockAfterDays Int?      // Days after enrollment start
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  lessons         Lesson[]
  
  @@index([courseId])
}

// Lesson within a module
model Lesson {
  id              String    @id @default(cuid())
  moduleId        String
  module          Module    @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  title           String
  content         String?   @db.Text // Rich text / Markdown
  position        Int       // Order within module
  
  // Video
  videoUrl        String?   // Loom embed or uploaded video URL
  videoProvider   String?   // "loom" | "upload" | "vimeo" | "mux"
  videoDuration   Int?      // Duration in seconds
  
  // Dripping
  unlockAfterDays Int?      // Days after enrollment start (overrides module)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  progress        Progress[]
  attachments     LessonAttachment[]
  
  @@index([moduleId])
}

// Attachments (PDFs, images, etc.)
model LessonAttachment {
  id              String    @id @default(cuid())
  lessonId        String
  lesson          Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  name            String
  url             String
  type            String    // "pdf" | "image" | "file"
  size            Int?      // File size in bytes
  createdAt       DateTime  @default(now())
  
  @@index([lessonId])
}

// User enrollment in a course
model Enrollment {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId        String
  course          Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  // Access control
  startDate       DateTime  @default(now())
  endDate         DateTime? // Null = unlimited access
  
  // Source
  shopifyOrderId  String?
  shopifyProductId String?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([userId, courseId])
  @@index([userId])
  @@index([courseId])
}

// Lesson completion tracking
model Progress {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId        String
  lesson          Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  
  completedAt     DateTime?
  videoProgress   Int?      // Seconds watched
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([userId, lessonId])
  @@index([userId])
  @@index([lessonId])
}
```

### 3. Community

```prisma
// Community space
model Space {
  id              String    @id @default(cuid())
  name            String
  slug            String    @unique
  description     String?
  iconEmoji       String?
  
  // Access settings
  isPublic        Boolean   @default(false) // Visible to all clients
  isHostOnly      Boolean   @default(false) // Only admin can post
  
  position        Int       @default(0) // Order in sidebar
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  members         SpaceMember[]
  posts           Post[]
  
  @@index([slug])
}

// Space membership
model SpaceMember {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  spaceId         String
  space           Space     @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime  @default(now())
  
  @@unique([userId, spaceId])
  @@index([userId])
  @@index([spaceId])
}

// Post in a space
model Post {
  id              String    @id @default(cuid())
  spaceId         String
  space           Space     @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  authorId        String
  author          User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  
  content         String    @db.Text
  isPinned        Boolean   @default(false)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  comments        Comment[]
  attachments     PostAttachment[]
  likes           PostLike[]
  
  @@index([spaceId])
  @@index([authorId])
}

// Post attachment (images, voice memos)
model PostAttachment {
  id              String    @id @default(cuid())
  postId          String
  post            Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  url             String
  type            String    // "image" | "voice_memo" | "file"
  duration        Int?      // For voice memos (seconds)
  createdAt       DateTime  @default(now())
  
  @@index([postId])
}

// Post likes
model PostLike {
  id              String    @id @default(cuid())
  postId          String
  post            Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId          String
  createdAt       DateTime  @default(now())
  
  @@unique([postId, userId])
  @@index([postId])
}

// Comment on a post
model Comment {
  id              String    @id @default(cuid())
  postId          String
  post            Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId        String
  author          User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  
  content         String    @db.Text
  
  // For nested comments
  parentId        String?
  parent          Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies         Comment[] @relation("CommentReplies")
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([postId])
  @@index([authorId])
}
```

### 4. Messaging (DMs)

```prisma
// Conversation (DM thread)
model Conversation {
  id              String    @id @default(cuid())
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastMessageAt   DateTime?
  
  // Relations
  participants    ConversationParticipant[]
  messages        Message[]
}

// Conversation participants
model ConversationParticipant {
  id              String    @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Read status
  lastReadAt      DateTime?
  
  createdAt       DateTime  @default(now())
  
  @@unique([conversationId, userId])
  @@index([conversationId])
  @@index([userId])
}

// Message in a conversation
model Message {
  id              String    @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId        String
  sender          User      @relation(fields: [senderId], references: [id], onDelete: Cascade)
  
  content         String    @db.Text
  
  // Voice memo
  voiceUrl        String?
  voiceDuration   Int?      // Seconds
  
  createdAt       DateTime  @default(now())
  
  @@index([conversationId])
  @@index([senderId])
}
```

### 5. Coaching Sessions

```prisma
// Coaching session
model Session {
  id              String    @id @default(cuid())
  clientId        String
  client          User      @relation("ClientSessions", fields: [clientId], references: [id], onDelete: Cascade)
  coachId         String
  coach           User      @relation("CoachSessions", fields: [coachId], references: [id], onDelete: Cascade)
  
  title           String?
  scheduledAt     DateTime
  duration        Int       @default(45) // Minutes
  
  // Video room
  roomId          String?   // For video provider
  roomUrl         String?
  
  // Status
  status          String    @default("scheduled") // "scheduled" | "completed" | "cancelled"
  completedAt     DateTime?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  notes           SessionNote[]
  
  @@index([clientId])
  @@index([coachId])
  @@index([scheduledAt])
}

// Session notes
model SessionNote {
  id              String    @id @default(cuid())
  sessionId       String
  session         Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  content         String    @db.Text
  isSharedWithClient Boolean @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([sessionId])
}
```

### 6. Trackers

```prisma
// Weekly check-in
model CheckIn {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  weekNumber      Int
  year            Int
  date            DateTime
  
  // Measurements
  weight          Float?    // kg
  waist           Float?    // cm
  hip             Float?    // cm
  arm             Float?    // cm
  
  // Photos
  photoFront      String?
  photoSide       String?
  photoBack       String?
  
  notes           String?   @db.Text
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([userId, weekNumber, year])
  @@index([userId])
}

// Daily nutrition log
model NutritionLog {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  date            DateTime  @db.Date
  
  // Totals
  calories        Int?
  protein         Int?      // grams
  carbs           Int?      // grams (future)
  fat             Int?      // grams (future)
  
  // Individual entries (JSON for flexibility in MVP)
  entries         Json?     // [{meal, description, calories, protein}]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([userId, date])
  @@index([userId])
  @@index([date])
}

// Daily habit tracking
model HabitLog {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  date            DateTime  @db.Date
  
  // Habits
  waterGlasses    Int?      // Number of glasses
  steps           Int?
  supplements     Boolean?
  
  // Custom habits (JSON for flexibility)
  customHabits    Json?     // {habitName: boolean}
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([userId, date])
  @@index([userId])
  @@index([date])
}

// Cycle tracking
model CycleLog {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  date            DateTime  @db.Date
  
  // Cycle data
  phase           String?   // "menstrual" | "follicular" | "ovulation" | "luteal"
  flowLevel       Int?      // 1-5
  
  notes           String?   @db.Text
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([userId, date])
  @@index([userId])
  @@index([date])
}

// Symptom monitoring
model SymptomLog {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  date            DateTime  @db.Date
  
  // Symptoms (1-10 scale)
  energy          Int?
  cravings        Int?
  digestion       Int?      // Gut health
  sleep           Int?
  mood            Int?
  
  notes           String?   @db.Text
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([userId, date])
  @@index([userId])
  @@index([date])
}
```

### 7. Recipes & Meal Planning

```prisma
// Recipe
model Recipe {
  id              String    @id @default(cuid())
  title           String
  slug            String    @unique
  description     String?
  imageUrl        String?
  
  // Nutrition
  calories        Int?
  protein         Int?
  carbs           Int?
  fat             Int?
  
  // Content
  servings        Int       @default(2)
  prepTime        Int?      // Minutes
  cookTime        Int?      // Minutes
  
  ingredients     Json      // [{amount, unit, ingredient}]
  instructions    Json      // [{step, text}]
  
  // Categorization
  category        String?   // "ontbijt" | "lunch" | "diner" | "snack"
  tags            String[]  // ["high-protein", "vegetarian", etc.]
  
  isPublished     Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  groceryItems    GroceryItem[]
  mealPlanItems   MealPlanItem[]
  
  @@index([slug])
  @@index([category])
}

// User's grocery list
model GroceryList {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  name            String    @default("Boodschappenlijst")
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  items           GroceryItem[]
  
  @@index([userId])
}

// Grocery list item
model GroceryItem {
  id              String    @id @default(cuid())
  groceryListId   String
  groceryList     GroceryList @relation(fields: [groceryListId], references: [id], onDelete: Cascade)
  recipeId        String?
  recipe          Recipe?   @relation(fields: [recipeId], references: [id])
  
  ingredient      String
  amount          String?
  unit            String?
  isChecked       Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
  
  @@index([groceryListId])
}

// Meal plan
model MealPlan {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  weekStart       DateTime  @db.Date
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  items           MealPlanItem[]
  
  @@unique([userId, weekStart])
  @@index([userId])
}

// Meal plan item
model MealPlanItem {
  id              String    @id @default(cuid())
  mealPlanId      String
  mealPlan        MealPlan  @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
  recipeId        String
  recipe          Recipe    @relation(fields: [recipeId], references: [id])
  
  dayOfWeek       Int       // 0-6 (Mon-Sun)
  mealType        String    // "ontbijt" | "lunch" | "diner" | "snack"
  
  @@index([mealPlanId])
}

// User's personal nutrition plan (PDF/download)
model NutritionPlan {
  id              String    @id @default(cuid())
  userId          String
  
  title           String
  fileUrl         String
  
  createdAt       DateTime  @default(now())
  
  @@index([userId])
}
```

### 8. AI (SIX)

```prisma
// AI conversation
model AiConversation {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  messages        AiMessage[]
  
  @@index([userId])
}

// AI message
model AiMessage {
  id              String    @id @default(cuid())
  conversationId  String
  conversation    AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  role            String    // "user" | "assistant"
  content         String    @db.Text
  
  // Feedback
  feedback        String?   // "positive" | "negative"
  feedbackNote    String?
  
  // Sources used for RAG
  sourceIds       String[]
  
  createdAt       DateTime  @default(now())
  
  @@index([conversationId])
}

// Knowledge base source
model AiSource {
  id              String    @id @default(cuid())
  
  title           String
  content         String    @db.Text
  type            String    // "course" | "qa" | "guideline" | "recipe" | "custom"
  sourceRef       String?   // Reference to original (e.g., lessonId)
  
  // Vector embedding (for pgvector)
  embedding       Unsupported("vector(1536)")?
  
  tags            String[]
  isActive        Boolean   @default(true)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([type])
}

// Daily tip scheduler
model AiDailyTip {
  id              String    @id @default(cuid())
  content         String    @db.Text
  scheduledDate   DateTime  @db.Date
  isPublished     Boolean   @default(false)
  createdAt       DateTime  @default(now())
  
  @@unique([scheduledDate])
}
```

### 9. WhatsApp & Notifications

```prisma
// WhatsApp message log
model WhatsappMessage {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  phoneNumber     String
  message         String    @db.Text
  templateId      String?   // If using template
  
  status          String    // "pending" | "sent" | "delivered" | "failed"
  externalId      String?   // Provider message ID
  sentAt          DateTime?
  
  createdAt       DateTime  @default(now())
  
  @@index([userId])
  @@index([status])
}

// In-app notification
model Notification {
  id              String    @id @default(cuid())
  userId          String
  
  type            String    // "reminder" | "session" | "message" | "community"
  title           String
  body            String
  link            String?   // Deep link to page
  
  isRead          Boolean   @default(false)
  readAt          DateTime?
  
  createdAt       DateTime  @default(now())
  
  @@index([userId])
  @@index([isRead])
}
```

### 10. System & Audit

```prisma
// Shopify integration mapping
model ShopifyProductMapping {
  id              String    @id @default(cuid())
  shopifyProductId String   @unique
  courseId        String
  
  // Access settings
  accessDays      Int?      // Null = unlimited
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// Audit log
model AuditLog {
  id              String    @id @default(cuid())
  userId          String?   // Null for system actions
  action          String    // "user.created" | "enrollment.created" | etc.
  entityType      String?
  entityId        String?
  metadata        Json?
  ipAddress       String?
  createdAt       DateTime  @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

// Feature flags
model FeatureFlag {
  id              String    @id @default(cuid())
  key             String    @unique
  isEnabled       Boolean   @default(false)
  description     String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## Indexes Summary

Key indexes for performance:
- Users: `email`, `shopifyCustomerId`
- Enrollments: `userId`, `courseId`
- Progress: `userId`, `lessonId`
- Posts: `spaceId`, `authorId`
- Messages: `conversationId`
- All trackers: `userId`, `date`
- Audit: `userId`, `action`, `createdAt`

---

## Notes

1. **Vector Search**: For AI/RAG, using pgvector extension in PostgreSQL. The `embedding` column on `AiSource` stores 1536-dimensional vectors (OpenAI ada-002 embedding size).

2. **JSON Columns**: Using JSON for flexible structures like nutrition entries, recipe ingredients, and custom habits. Can be normalized later if needed.

3. **Soft Deletes**: Not implemented in MVP. Add `deletedAt` columns if needed for data recovery.

4. **Multi-tenancy**: Current schema is single-tenant. To support multiple brands later, add `tenantId` to relevant tables.
