# Simply Platform - Integration Design

## 1. Shopify Integration

### 1.1 Overview
Shopify handles all payments. When a customer purchases a product/course, Shopify sends a webhook to our platform to create/update the user account and grant course access.

### 1.2 Webhook Events

| Event | Trigger | Our Action |
|-------|---------|------------|
| `orders/paid` | Customer completes purchase | Create user (if new), create enrollment |
| `orders/cancelled` | Order is cancelled | Revoke enrollment |
| `orders/refunded` | Order is refunded | Revoke enrollment |
| `customers/create` | New customer in Shopify | Create user (for future orders) |
| `customers/update` | Customer info updated | Sync user data |

### 1.3 Provisioning Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Shopify   │────>│  Webhook API    │────>│    Database     │
│   (order)   │     │  /api/webhooks/ │     │                 │
└─────────────┘     │  shopify        │     └─────────────────┘
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Email Service  │
                    │  (Welcome +     │
                    │   Magic Link)   │
                    └─────────────────┘
```

### 1.4 Implementation

**Endpoint**: `POST /api/webhooks/shopify`

```typescript
// Webhook handler pseudocode
async function handleShopifyWebhook(req: Request) {
  // 1. Verify webhook signature (HMAC-SHA256)
  const isValid = verifyShopifySignature(req);
  if (!isValid) return { status: 401 };

  const { topic, body } = req;

  switch (topic) {
    case 'orders/paid':
      // Extract customer and line items
      const { customer, line_items } = body;
      
      // Find or create user
      let user = await findUserByEmail(customer.email);
      if (!user) {
        user = await createUser({
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
          shopifyCustomerId: customer.id.toString(),
        });
      }

      // Create enrollments for each product
      for (const item of line_items) {
        const mapping = await getProductMapping(item.product_id);
        if (mapping) {
          await createEnrollment({
            userId: user.id,
            courseId: mapping.courseId,
            startDate: new Date(),
            endDate: mapping.accessDays 
              ? addDays(new Date(), mapping.accessDays) 
              : null,
            shopifyOrderId: body.id.toString(),
            shopifyProductId: item.product_id.toString(),
          });
        }
      }

      // Send welcome email with magic link
      await sendWelcomeEmail(user);
      
      // Log audit
      await createAuditLog('enrollment.created', user.id, { orderId: body.id });
      break;

    case 'orders/refunded':
    case 'orders/cancelled':
      // Revoke enrollment
      await revokeEnrollmentByOrderId(body.id.toString());
      break;
  }

  return { status: 200 };
}
```

### 1.5 Product Mapping (Admin)

Admin interface to map Shopify products to courses:

| Shopify Product ID | Course | Access Duration |
|--------------------|--------|-----------------|
| 123456789 | 8 Weken Reset | 56 days |
| 987654321 | Hormoon Balans | Unlimited |
| 111222333 | 1-op-1 Traject | 90 days |

### 1.6 Security Considerations
- Verify HMAC signature on all webhooks
- Store `SHOPIFY_WEBHOOK_SECRET` in environment
- Idempotency: Check if enrollment already exists before creating
- Log all webhook events for debugging

---

## 2. Video Hosting

### 2.1 Provider Comparison

| Feature | Mux | Cloudflare Stream | Vimeo | Self-hosted (S3) |
|---------|-----|-------------------|-------|------------------|
| Adaptive streaming | ✅ | ✅ | ✅ | ❌ |
| Easy integration | ✅ | ✅ | ✅ | ⚠️ |
| Signed URLs | ✅ | ✅ | ✅ | ✅ |
| Cost | $$ | $ | $$$ | $ |
| Analytics | ✅ | ✅ | ✅ | ❌ |

**Recommendation**: **Mux** for best developer experience and quality, or **Cloudflare Stream** for cost efficiency.

### 2.2 Implementation (Mux)

```typescript
// Upload video
const asset = await mux.video.assets.create({
  input: uploadedFileUrl,
  playback_policy: ['signed'], // Require signed URLs
});

// Generate playback URL
const playbackId = asset.playback_ids[0].id;
const token = mux.jwt.sign(playbackId, {
  expiration: '2h',
  type: 'video',
});
const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
```

### 2.3 Loom Embed

Simple iframe embed for Loom videos:

```typescript
function getLoomEmbed(url: string) {
  // Extract Loom ID from URL
  // https://www.loom.com/share/abc123 -> abc123
  const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  
  const loomId = match[1];
  return `https://www.loom.com/embed/${loomId}`;
}

// In component
<iframe
  src={loomEmbedUrl}
  frameBorder="0"
  allowFullScreen
  className="w-full aspect-video rounded-lg"
/>
```

### 2.4 Video Player Component

Using `@mux/mux-player-react` for Mux, or `video.js` for generic:

```tsx
import MuxPlayer from '@mux/mux-player-react';

function VideoPlayer({ lesson }) {
  if (lesson.videoProvider === 'loom') {
    return (
      <iframe
        src={getLoomEmbed(lesson.videoUrl)}
        className="w-full aspect-video rounded-lg"
        allowFullScreen
      />
    );
  }

  if (lesson.videoProvider === 'mux') {
    return (
      <MuxPlayer
        playbackId={lesson.videoUrl}
        metadata={{ video_title: lesson.title }}
        onTimeUpdate={(e) => saveProgress(e.currentTarget.currentTime)}
      />
    );
  }

  // Fallback for direct URLs
  return <video src={lesson.videoUrl} controls className="w-full" />;
}
```

---

## 3. Live Video Coaching (WebRTC)

### 3.1 Provider Comparison

| Feature | Daily.co | Twilio Video | Jitsi (self-hosted) |
|---------|----------|--------------|---------------------|
| Setup complexity | Easy | Medium | Hard |
| Pricing | Generous free tier | Pay per minute | Free |
| Recording | ✅ | ✅ | ✅ |
| Customization | ✅ | ✅ | ✅ |

**Recommendation**: **Daily.co** for fastest implementation with good free tier (10,000 minutes/month).

### 3.2 Implementation (Daily.co)

```typescript
// Create room for session
async function createVideoRoom(session: Session) {
  const room = await daily.createRoom({
    name: `session-${session.id}`,
    privacy: 'private',
    properties: {
      exp: Math.floor(session.scheduledAt.getTime() / 1000) + 3600, // 1hr after start
      max_participants: 2,
      enable_chat: true,
      enable_screenshare: true,
    },
  });

  // Create tokens for participants
  const hostToken = await daily.createMeetingToken({
    room_name: room.name,
    is_owner: true,
    user_name: session.coach.firstName,
    exp: room.config.exp,
  });

  const clientToken = await daily.createMeetingToken({
    room_name: room.name,
    is_owner: false,
    user_name: session.client.firstName,
    exp: room.config.exp,
  });

  return { roomUrl: room.url, hostToken, clientToken };
}
```

### 3.3 Video Room Component

```tsx
import { DailyProvider, useDaily } from '@daily-co/daily-react';

function VideoRoom({ roomUrl, token }) {
  return (
    <DailyProvider url={roomUrl} token={token}>
      <div className="grid grid-cols-2 gap-4">
        <LocalVideo />
        <RemoteVideo />
      </div>
      <VideoControls />
    </DailyProvider>
  );
}
```

---

## 4. Calendar Integration (ICS)

### 4.1 ICS File Generation

```typescript
import ical, { ICalCalendarMethod } from 'ical-generator';

function generateSessionICS(session: Session): string {
  const calendar = ical({
    name: 'Simply Coaching',
    method: ICalCalendarMethod.REQUEST,
  });

  calendar.createEvent({
    start: session.scheduledAt,
    end: new Date(session.scheduledAt.getTime() + session.duration * 60000),
    summary: `Coaching sessie met ${session.coach.firstName}`,
    description: `
      Je coaching sessie via Simply.
      
      Klik hier om deel te nemen: ${process.env.APP_URL}/coaching/${session.id}/join
    `,
    location: `${process.env.APP_URL}/coaching/${session.id}/join`,
    organizer: {
      name: session.coach.firstName,
      email: session.coach.email,
    },
    attendees: [
      {
        name: session.client.firstName,
        email: session.client.email,
        rsvp: true,
      },
    ],
  });

  return calendar.toString();
}
```

### 4.2 Download Endpoint

```typescript
// GET /api/sessions/[id]/calendar
export async function GET(req, { params }) {
  const session = await getSession(params.id);
  const ics = generateSessionICS(session);

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar',
      'Content-Disposition': `attachment; filename="coaching-${session.id}.ics"`,
    },
  });
}
```

### 4.3 Future: Google/Outlook OAuth

For V2, add direct calendar sync:

```typescript
// Google Calendar API
async function addToGoogleCalendar(session: Session, accessToken: string) {
  const calendar = google.calendar({ version: 'v3', auth: accessToken });
  
  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: `Coaching sessie`,
      start: { dateTime: session.scheduledAt.toISOString() },
      end: { dateTime: endTime.toISOString() },
      conferenceData: {
        createRequest: { requestId: session.id },
      },
    },
  });
}
```

---

## 5. WhatsApp Integration

### 5.1 Provider: Twilio

Twilio WhatsApp Business API for reliable message delivery.

### 5.2 Setup Requirements
1. Twilio account with WhatsApp sandbox (dev) or approved sender (prod)
2. Message templates approved by WhatsApp (for proactive messages)
3. Webhook endpoint for delivery status

### 5.3 Implementation

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send WhatsApp message
async function sendWhatsAppMessage(
  userId: string,
  phoneNumber: string,
  message: string,
  templateId?: string
) {
  // Format phone number
  const formattedPhone = `whatsapp:${phoneNumber.replace(/\D/g, '')}`;

  try {
    const result = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: formattedPhone,
      body: message,
    });

    // Log message
    await db.whatsappMessage.create({
      data: {
        userId,
        phoneNumber,
        message,
        templateId,
        status: 'sent',
        externalId: result.sid,
        sentAt: new Date(),
      },
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    await db.whatsappMessage.create({
      data: {
        userId,
        phoneNumber,
        message,
        templateId,
        status: 'failed',
      },
    });
    throw error;
  }
}
```

### 5.4 Status Webhook

```typescript
// POST /api/webhooks/twilio
export async function POST(req: Request) {
  const body = await req.formData();
  const messageSid = body.get('MessageSid');
  const status = body.get('MessageStatus');

  await db.whatsappMessage.updateMany({
    where: { externalId: messageSid },
    data: { status: mapTwilioStatus(status) },
  });

  return new Response('OK');
}
```

### 5.5 Message Templates (Examples)

```
// Welcome message
Welkom bij Simply! 🌿

Je account is aangemaakt. Log in via: {{1}}

// Session reminder
Hi {{1}}! 

Reminder: je coaching sessie is morgen om {{2}}.

Link: {{3}}

// Check-in reminder
Hey {{1}}, vergeet je wekelijkse check-in niet! 📊

Log nu in: {{2}}
```

---

## 6. AI Integration (SIX AI)

### 6.1 Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client    │────>│   AI API        │────>│   OpenAI        │
│   Chat UI   │     │   /api/ai/chat  │     │   (GPT-4)       │
└─────────────┘     └────────┬────────┘     └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │   RAG Pipeline  │
                    │   1. Embed query│
                    │   2. Vector     │
                    │      search     │
                    │   3. Build      │
                    │      context    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   (pgvector)    │
                    └─────────────────┘
```

### 6.2 RAG Implementation

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI();

async function chat(userId: string, message: string) {
  // 1. Create embedding for user's question
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: message,
  });
  const queryVector = embedding.data[0].embedding;

  // 2. Find relevant sources via vector search
  const sources = await db.$queryRaw`
    SELECT id, title, content, type
    FROM "AiSource"
    WHERE "isActive" = true
    ORDER BY embedding <-> ${queryVector}::vector
    LIMIT 5
  `;

  // 3. Build context from sources
  const context = sources
    .map((s) => `[${s.type}] ${s.title}:\n${s.content}`)
    .join('\n\n---\n\n');

  // 4. Call GPT with context
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `Je bent SIX, de AI-assistent van Simply in Balance. 
        
Je helpt klanten met vragen over voeding, leefstijl, en de cursussen.

BELANGRIJKE REGELS:
- Baseer antwoorden ALLEEN op de meegeleverde context
- Geef NOOIT medische diagnoses of behandeladviezen
- Bij gezondheidsvragen: adviseer altijd om een arts te raadplegen
- Verwijs naar specifieke modules/lessen wanneer relevant
- Wees vriendelijk, ondersteunend, en beknopt

CONTEXT:
${context}`,
      },
      { role: 'user', content: message },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const response = completion.choices[0].message.content;

  // 5. Save conversation
  await saveAiMessage(userId, message, response, sources.map((s) => s.id));

  return {
    message: response,
    sources: sources.map((s) => ({ id: s.id, title: s.title, type: s.type })),
  };
}
```

### 6.3 Knowledge Base Management

Admin can:
1. Auto-index course content (lessons, descriptions)
2. Upload custom documents (PDFs, guidelines)
3. Add Q&A pairs manually
4. Tag sources for filtering

```typescript
// Index lesson content
async function indexLesson(lesson: Lesson) {
  const embedding = await createEmbedding(
    `${lesson.title}\n\n${lesson.content}`
  );

  await db.aiSource.upsert({
    where: { sourceRef: `lesson:${lesson.id}` },
    create: {
      title: lesson.title,
      content: lesson.content,
      type: 'course',
      sourceRef: `lesson:${lesson.id}`,
      embedding,
    },
    update: {
      content: lesson.content,
      embedding,
    },
  });
}
```

### 6.4 Safety Guardrails

```typescript
const MEDICAL_KEYWORDS = [
  'diagnose', 'ziekte', 'medicijn', 'behandeling',
  'arts', 'dokter', 'specialist', 'symptomen',
];

function requiresMedicalDisclaimer(message: string): boolean {
  return MEDICAL_KEYWORDS.some((kw) => 
    message.toLowerCase().includes(kw)
  );
}

// Add to response if triggered
const disclaimer = `
⚠️ Let op: SIX geeft algemene leefstijlinformatie, geen medisch advies. 
Raadpleeg altijd een arts of specialist voor medische vragen.
`;
```

---

## 7. Real-time Messaging (Chat/DMs)

### 7.1 Options

| Option | Pros | Cons |
|--------|------|------|
| Socket.io | Full control, self-hosted | Scaling complexity |
| Pusher | Managed, easy | Cost at scale |
| Ably | Managed, generous free tier | Less common |

**Recommendation**: **Pusher** for MVP simplicity, migrate to Socket.io if costs grow.

### 7.2 Implementation (Pusher)

```typescript
// Server: Send message
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: 'eu',
});

async function sendMessage(conversationId: string, senderId: string, content: string) {
  // Save to database
  const message = await db.message.create({
    data: { conversationId, senderId, content },
    include: { sender: true },
  });

  // Broadcast to conversation channel
  await pusher.trigger(
    `private-conversation-${conversationId}`,
    'new-message',
    {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.sender.firstName,
      createdAt: message.createdAt,
    }
  );

  return message;
}
```

```typescript
// Client: Subscribe to messages
import Pusher from 'pusher-js';
import { useEffect, useState } from 'react';

function useConversation(conversationId: string) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: 'eu',
      authEndpoint: '/api/pusher/auth',
    });

    const channel = pusher.subscribe(`private-conversation-${conversationId}`);
    
    channel.bind('new-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-conversation-${conversationId}`);
    };
  }, [conversationId]);

  return messages;
}
```

---

## 8. File Storage

### 8.1 Provider: Cloudflare R2

- S3-compatible API
- No egress fees
- Global CDN included
- Cost effective

### 8.2 Implementation

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Generate presigned upload URL
async function getUploadUrl(filename: string, contentType: string) {
  const key = `uploads/${Date.now()}-${filename}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl, key };
}
```

### 8.3 Usage Types

| Type | Bucket/Folder | Access |
|------|---------------|--------|
| Course videos | `videos/` | Private (signed URLs) |
| User photos | `photos/{userId}/` | Private |
| Voice memos | `voice/{userId}/` | Private |
| Recipe images | `recipes/` | Public |
| Lesson attachments | `attachments/` | Private |

---

## Environment Variables Summary

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://app.simplyinbalance.com"

# Shopify
SHOPIFY_SHOP_DOMAIN="simplyinbalance.myshopify.com"
SHOPIFY_WEBHOOK_SECRET="..."
SHOPIFY_API_KEY="..."
SHOPIFY_API_SECRET="..."

# Email (Resend recommended)
RESEND_API_KEY="..."
EMAIL_FROM="Simply <noreply@simplyinbalance.com>"

# Video (Mux)
MUX_TOKEN_ID="..."
MUX_TOKEN_SECRET="..."

# Live Video (Daily.co)
DAILY_API_KEY="..."

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_NUMBER="+31..."

# Real-time (Pusher)
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
NEXT_PUBLIC_PUSHER_KEY="..."

# Storage (R2)
R2_ENDPOINT="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="simply-uploads"
R2_PUBLIC_URL="https://cdn.simplyinbalance.com"

# AI (OpenAI)
OPENAI_API_KEY="..."

# App
APP_URL="https://app.simplyinbalance.com"
```
