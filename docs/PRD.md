# Simply Platform - Product Requirements Document

## 1. Overview

### 1.1 Product Vision
Simply is a private learning and community platform for Simply in Balance clients. It combines the best features of Kajabi (courses), Circle (community), and Huddle (time-bound access) under the Simply brand.

### 1.2 Target Users
| Role | Description |
|------|-------------|
| **Admin/Host** | Platform owner (you) - full control over content, users, and settings |
| **Coach** | Can manage assigned clients, view progress, conduct sessions |
| **Client** | End users who access courses, community, trackers, and coaching |
| **Support** | Limited admin access for customer support tasks |

### 1.3 Key Differentiators
- **Shopify Integration**: Automatic account creation on purchase
- **Time-bound Access**: Like Huddle - courses with start/end dates, dripping content
- **1-on-1 Trajecten**: Private spaces for individual coaching clients
- **SIX AI**: Built-in AI assistant trained on your content
- **Holistic Tracking**: Nutrition, habits, symptoms, cycle - all in one place

---

## 2. User Stories

### 2.1 Authentication & Onboarding
| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| AUTH-1 | Client | receive a magic link after Shopify purchase | I can access the platform without setting a password | MVP |
| AUTH-2 | Client | log in with email + magic link | I don't need to remember passwords | MVP |
| AUTH-3 | Client | optionally set a password | I can choose my preferred login method | MVP |
| AUTH-4 | Admin | see all users and their access levels | I can manage the platform | MVP |
| AUTH-5 | Admin | manually create/invite users | I can add clients outside Shopify | MVP |

### 2.2 Courses (Kajabi/Huddle style)
| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| CRS-1 | Client | see my enrolled courses on dashboard | I know what I have access to | MVP |
| CRS-2 | Client | navigate program > module > lesson | I can follow the course structure | MVP |
| CRS-3 | Client | mark lessons as complete | I can track my progress | MVP |
| CRS-4 | Client | watch embedded videos (Loom/uploads) | I can learn from video content | MVP |
| CRS-5 | Client | see which content is locked (dripping) | I understand the timeline | MVP |
| CRS-6 | Admin | create courses with modules and lessons | I can build learning content | MVP |
| CRS-7 | Admin | duplicate an entire course | I can quickly create variations | MVP |
| CRS-8 | Admin | set time-bound access per enrollment | I can run challenges with deadlines | MVP |
| CRS-9 | Admin | configure dripping (content unlock schedule) | I can pace the learning experience | MVP |
| CRS-10 | Admin | upload videos or embed Loom links | I can add video content easily | MVP |

### 2.3 Community (Circle style)
| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| COM-1 | Client | see community spaces I have access to | I can participate in discussions | MVP |
| COM-2 | Client | create posts in allowed spaces | I can share and ask questions | MVP |
| COM-3 | Client | comment on posts | I can engage with others | MVP |
| COM-4 | Client | send DMs to other members | I can have private conversations | MVP |
| COM-5 | Client | upload voice memos in chat/posts | I can communicate by voice | V1 |
| COM-6 | Admin | create spaces with access rules | I can organize the community | MVP |
| COM-7 | Admin | create host-only announcement channels | I can broadcast without replies | MVP |
| COM-8 | Admin | lock/unlock spaces per client | I can control access granularly | MVP |

### 2.4 Coaching Sessions
| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| COACH-1 | Client | see upcoming coaching sessions | I know when to show up | MVP |
| COACH-2 | Client | join video sessions in-platform | I don't need external tools | MVP |
| COACH-3 | Client | download calendar invites (ICS) | I can add to my calendar | MVP |
| COACH-4 | Coach | schedule sessions with clients | I can manage my coaching | MVP |
| COACH-5 | Coach | add notes after sessions | I can track client progress | V1 |
| COACH-6 | Admin | see all scheduled sessions | I have full visibility | MVP |

### 2.5 WhatsApp Integration
| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| WA-1 | Admin | send WhatsApp messages to clients | I can reach them on their preferred channel | V1 |
| WA-2 | Admin | see message history per client | I know what was communicated | V1 |
| WA-3 | System | log all sent messages | There's an audit trail | V1 |

### 2.6 Simply Trackers ("Mijn Omgeving")
| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| TRK-1 | Client | log daily kcal and protein | I can track my nutrition | MVP |
| TRK-2 | Client | do weekly check-ins (weight, cm, photos) | I can see my progress over time | MVP |
| TRK-3 | Client | see progress graphs | I'm motivated by visual progress | MVP |
| TRK-4 | Client | track daily habits (water, steps, supplements) | I build healthy routines | MVP |
| TRK-5 | Client | log cycle data with notes | I understand my body better | MVP |
| TRK-6 | Client | log symptoms (energy, cravings, digestion) | I can spot patterns | MVP |
| TRK-7 | Client | receive reminders for missed check-ins | I stay accountable | V1 |
| TRK-8 | Coach | view client's tracker data | I can provide better guidance | MVP |

### 2.7 Recipes & Meal Planning
| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| RCP-1 | Client | browse recipe library | I can find meal ideas | MVP |
| RCP-2 | Client | see recipe details (ingredients, steps, macros) | I can cook the meal | MVP |
| RCP-3 | Client | add recipes to grocery list | I can shop efficiently | MVP |
| RCP-4 | Client | plan meals for the week | I'm organized with eating | V1 |
| RCP-5 | Client | download my personal nutrition plan | I have offline access | MVP |
| RCP-6 | Admin | add/edit recipes | I can expand the library | MVP |

### 2.8 SIX AI
| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| AI-1 | Client | ask questions to SIX AI | I get instant answers | MVP |
| AI-2 | Client | get answers based on Simply content | Answers are relevant and accurate | MVP |
| AI-3 | Client | give feedback (thumbs up/down) | The AI improves over time | MVP |
| AI-4 | Admin | manage knowledge base (upload docs) | AI has the right information | MVP |
| AI-5 | Admin | see AI conversation logs | I understand client questions | MVP |
| AI-6 | System | decline medical diagnosis questions | Users are kept safe | MVP |
| AI-7 | Client | see "tip of the day" from SIX | I get daily inspiration | V1 |

---

## 3. Feature Priority Matrix

### MVP (Milestone 1-4)
- ✅ Authentication (magic link, optional password)
- ✅ Shopify webhook integration (account provisioning)
- ✅ Course structure (program > module > lesson)
- ✅ Progress tracking (lesson completion)
- ✅ Video support (Loom embed + uploads)
- ✅ Time-bound access & dripping
- ✅ Course duplication
- ✅ Community spaces with access control
- ✅ Posts and comments
- ✅ Direct messages
- ✅ Host-only announcement channels
- ✅ In-platform video coaching
- ✅ Session scheduling + ICS export

### V1 (Milestone 5-7)
- ✅ Nutrition tracker (kcal + protein)
- ✅ Weekly check-ins with photos
- ✅ Progress graphs
- ✅ Habit tracker
- ✅ Cycle tracking
- ✅ Symptom monitoring
- ✅ Recipe library + grocery list
- ✅ Meal planning
- ✅ SIX AI with RAG
- ✅ Knowledge base management
- ✅ Voice memos
- ✅ WhatsApp integration

### Later
- Google/Outlook calendar sync (OAuth)
- Wearable integrations (Fitbit, Polar, Apple Health)
- Native mobile app
- Multi-tenant support
- Advanced analytics dashboard
- Gamification (badges, streaks)

---

## 4. Acceptance Criteria (MVP Features)

### AUTH: Magic Link Login
- [ ] User enters email, receives magic link within 30 seconds
- [ ] Link expires after 15 minutes
- [ ] Link can only be used once
- [ ] After click, user is logged in and redirected to dashboard
- [ ] Session persists for 30 days (remember me)

### AUTH: Shopify Integration
- [ ] Webhook receives order.created event
- [ ] System creates user if email doesn't exist
- [ ] System creates enrollment based on product-to-course mapping
- [ ] User receives welcome email with magic link
- [ ] Enrollment includes correct access dates

### COURSES: Structure & Navigation
- [ ] Dashboard shows all enrolled courses with progress %
- [ ] Course page shows all modules (locked/unlocked indicator)
- [ ] Module expands to show lessons
- [ ] Lesson page displays content (text, video, images)
- [ ] Dripped content shows unlock date
- [ ] Completed lessons show checkmark

### COURSES: Video Support
- [ ] Loom links auto-embed with player
- [ ] Uploaded videos play with standard controls
- [ ] Videos are responsive (mobile friendly)
- [ ] Progress saves on video (optional, V1)

### COMMUNITY: Spaces & Posts
- [ ] User sees only spaces they have access to
- [ ] User can create text posts with optional images
- [ ] Posts show author, timestamp, and content
- [ ] Comments thread under posts
- [ ] Host-only spaces don't show reply option for clients

### COACHING: Sessions
- [ ] Coach can create session with date/time/client
- [ ] Client sees upcoming sessions on dashboard
- [ ] Session detail page has "Join" button (video room)
- [ ] ICS download button generates valid calendar file
- [ ] Video room works for 1-on-1 (WebRTC)

---

## 5. Out of Scope (MVP)
- Public marketing website
- Payment processing (handled by Shopify)
- Email marketing automation
- Mobile native apps
- Multi-language support
- White-labeling for other coaches
