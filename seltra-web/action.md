# action.md

# Seltra V5 — Commerce Operating System Roadmap

## Vision

July 15 is not simply launching an AI storefront builder.

It is the beginning of an AI-native commerce operating system.

Every merchant should eventually feel like they hired an operations team consisting of:

* Commerce Agent
* Store Designer
* Product Manager
* Order Manager
* Customer Success
* Marketing Assistant
* Finance Assistant

The merchant only chats.

Seltra executes.

---
# Priority 0 
- Find the login screen where merchant enters email and merchant ID to login into dashboard, improve the security there by adding - when merchant types or enters ID blind it or hide it, they can click the unhide icon to see what they type - do this for any sensitive input across the dashboard.
- In the merchant dashboard, for better UI/UX find a place to include a notification feature and it should be functional for alerting merchant know orders, payment, logins, security, announcement etc


# Priority 1 — Order Agent

## Goal

Every order becomes an autonomous workflow.

Instead of simply storing an Order row, Seltra begins managing the lifecycle automatically.

```
Customer Pays

↓

Order Created

↓

Merchant Notified

↓

Customer Receives SMS

↓

Merchant Updates Status

↓

Customer Receives SMS

↓

Agent Reminds Merchant

↓

Order Delivered

↓

Agent Records Success
```

---

## New Agent

```
OrderAgent
```

Responsibilities

* new orders

* payment confirmation

* merchant notification

* customer notification

* delivery reminders

* pending order reminders

* abandoned fulfillment reminders

* sales summaries

---

## Trigger Events

```
payment.completed

↓

OrderAgent
```

```
order.created

↓

OrderAgent
```

```
order.status.updated

↓

OrderAgent
```

---

## SMS Integration

Use Moolre SMS.
Reference here: https://docs.moolre.com/ai/approve-sender-id.html
Sender ID and VAS_KEY are in the dotenv file.

Merchant receives

```
🎉 New Order

Customer:

Ama Mensah

Amount:

GHS 240.00 || NAIRA 2,400.00

Open Seltra to fulfill.
```

Customer receives

```
Your order has been received.

We'll notify you when it is ready.
```

---

## Status Notifications

Merchant changes

```
Pending

↓

Processing

↓

Shipped

↓

Delivered
```

Every change triggers

```
OrderAgent

↓

SMS

↓

Email

↓

Conversation Memory
```

---

## Reminder Engine

Every hour

```
Find

Pending Orders

>

24h
```

Send

```
Reminder

You have 4 pending orders waiting.
```

---

## Sales Notifications

Immediate

```
New Sale

GHS 120.00 
```

Daily

```
You made

8 sales

today.

Revenue

GHS 3,240.00
```

Weekly

```
Top Product

Returning Customers

Revenue

Conversion
```

---

# Priority 2 — Merchant Memory

Current conversations are only chat history.

We need actual memory.

---

## Memory Layers

### Conversation Memory

Current conversation

```
Merchant

↓

Messages

↓

Assistant
```

Already exists.

---

### Merchant Memory

Persistent forever.

```
Brand tone

Audience

Preferences

Favorite colors

Pricing strategy

Business goals

Preferred layouts
```

Store inside

```
merchantContext
```

instead of only storing raw JSON.

---

### Context Engine

New service

```
ContextEngine
```

Responsibilities

```
Conversation

↓

Merchant Memory

↓

Store Data

↓

Orders

↓

Products

↓

Analytics

↓

Prompt Context
```

Every agent calls

```
ContextEngine.build()
```

before LLM inference.

---

## Prompt Example

Instead of

```
User:

Add another product.
```

Context becomes

```
Merchant owns

Glow Naturals

Luxury skincare

Premium branding

Gold palette

Current catalog

18 products

Best seller

Vitamin C Serum

Conversation

...

User:

Add another product.
```

Huge difference.

---

## Memory Extraction

Every assistant response runs

```
MemoryAgent
```

Extract

```
Merchant prefers premium branding

Merchant dislikes rounded buttons

Merchant sells in Ghana

Merchant uses Moolre
```

Persist.

---

# Priority 3 — Invoicing

Current dashboard

```
Orders

Sales

Payments
```

Missing

```
Invoices
```

---

New Sidebar Tab

```
Invoices
```

Capabilities

* generate invoice

* download PDF

* send email (using resend - merchants can email invoices to their customers in their merchant dashboard)

* mark paid

* overdue reminders

---

New Models

```
Invoice

InvoiceItem
```

Invoice

```
number

customer

subtotal

tax

discount

status

dueDate

pdfUrl
```

---

Agent

```
InvoiceAgent
```

Merchant

```
Create invoice for Ama Mensah with email amamen@gmail.com.
```

Agent

↓

Invoice created.

↓

PDF generated.

↓
Ready for download OR
Email sent.

---

# Priority 4 — Dashboard Navigation

Current sidebar is becoming overloaded.

Current

```
Store
Orders
Sales
Payments
Products
Customers
Analytics
Emails
Settings
```

Instead

```
Home
Store
Orders
Products
Finance - submenu (Payment, Sales)
Customers
Analytics
Marketing - submenu( Messaging (Emails+SMS) - send bulk emails/sms to customers, SEO - check store SEO and customer vitals )
```
Everything account-related moves to the profile dropdown.

---

Profile Menu

```
William Ofosu Parwar

────────────

Account - (merchant profile with image/avatar, number of stores allowed based on tier, store(s) name(s), language, region(africa/eu/usa etc), country, payout - merchant should set their payout details for disbursement (bank method/mobile money method) - if they desire to change payout info we will send an otp to thier phone to verify for now they should enter save and can change later)
Billing - (Show tier merchant is on, free trial(30days) | free tier ($0/m) | premium tier ($10/m), Default monthly member credit limit, everything else regarding billing for MVP) 
Domains  - View and manage all domains purchased through Seltra for your workspace. [Transfer in] [Buy a domain] -[No domains yet, Buy a domain here(at a fee)].  [If not premium member show modal - seltra logo, Upgrade to Premium
You need to be on a premium plan to connect a domain.Upgrade to Premium
$10
due today ] - [
You will unlock:
3 stores
100 product upgrades for each store
User roles & permissions
Custom domains
Remove the seltra badge
ChatBot on stores for customer assistance
Instant and priority support
Unused credits rollover
On-demand credit top-ups

Your plan will update to $10 / month for 100 credits
Downgrade or cancel at any time.
By upgrading you agree to our terms.
]

Get Help - Support
Sign Out
```

Settings disappears from sidebar.

Cleaner.

---

# Priority 5 — Product Management

Current CRUD is excellent.

Now make it AI-native.

Merchant says

```
Increase all prices by 10%
```

Agent executes

```
PATCH

all products
```

---

Merchant

```
Rename all products

to premium names.
```

Agent updates every row.

---

Merchant

```
Change every image

to dark background.
```

Agent updates assets.

---

Merchant

```
Create 5 Mother's Day bundles.
```

Agent

↓

creates products

↓

updates prices

↓

creates images

↓

updates storefront

No manual work.

---

# Priority 6 — Storefront UI Editing

Merchant should never edit JSX.

They talk.

```
Move hero higher

↓

Context

↓

UIAgent

↓

Manifest

↓

Renderer
```

---

Possible requests

```
Make buttons larger

Change font

Use dark mode

Move testimonials

Add FAQ

Hide newsletter

Add countdown

Show bestseller first
```

Everything updates

```
manifest

↓

Storefront
```

No regeneration.

---

# Priority 7 — Commerce Agent

Current agent mostly edits products.

Expand.

Capabilities

```
Products

Orders

Customers

Invoices

Marketing

Analytics

Store Design

Payments
```

Think

```
GitHub Copilot

for commerce.
```

---

# Priority 8 — Backend Agent Bus

Every agent becomes independent.

```
Conversation Agent

↓

Context Agent

↓

Memory Agent

↓

Blueprint Agent

↓

Manifest Agent

↓

Product Agent

↓

Order Agent

↓

Invoice Agent

↓

Marketing Agent

↓

Analytics Agent
```

Every one emits

```
AgentEvent
```

Current streaming architecture already supports this.

---

# Priority 9 — Agent Actions

Instead of

```
Assistant

↓

Text
```

Assistant returns

```
reply

actions
```

Example

```
[
{
action:

UPDATE_PRODUCTS
},

{
action:

SEND_SMS
},

{
action:

UPDATE_MANIFEST
},

{
action:

CREATE_INVOICE
}
]
```

Frontend becomes reactive.

---

# Priority 10 — Dashboard Evolution

Current

```
Dashboard

↓

CRUD
```

Future

```
Dashboard

↓

Mission Control
```

Merchant immediately sees

```
Today's Revenue

Pending Orders

Inventory Alerts

Customer Messages

Agent Suggestions

Top Products

Invoices Due

Marketing Tasks

AI Recommendations
```

The dashboard becomes the operating system for the business.

---

# Suggested Database Additions

## Tenant

```
merchantMemory Json?

brandVoice Json?

preferences Json?

agentSettings Json?
```

---

## Order

```
lastReminderAt

fulfilledBy

trackingNumber

timeline Json
```

---

## Customer

```
lastContactedAt

lifetimeValue

preferredChannel

notes
```

---

## New Models

```
Invoice

InvoiceItem

MerchantMemory

AgentTask

Notification

NotificationLog

Reminder

AgentEvent

StoreRevision
```

---

# Agent Priority

* Context Engine
* Merchant Memory
* Order Agent
* SMS Notifications
* Invoice Agent
* Marketing Agent
* Analytics Agent
* Autonomous Product Manager
* Autonomous Store Designer
* Autonomous Customer Success
* Autonomous Finance Assistant

---

# Definition of Done

Seltra is no longer "AI that builds stores."

Seltra becomes an AI commerce operating system where:

* merchants converse instead of navigating complex dashboards,
* every business interaction enriches long-term merchant memory,
* orders automatically trigger notifications, reminders, and fulfillment workflows,
* products, storefront layouts, pricing, and branding evolve through natural language,
* invoicing, billing, marketing, analytics, and customer engagement are agent-driven,
* every agent communicates through a shared event bus and context engine,
* the dashboard evolves into a real-time mission control center for commerce.

The long-term objective is that a merchant can run an entire online business by talking to Seltra, while the platform coordinates specialized agents behind the scenes to execute the operational work safely and reliably.
