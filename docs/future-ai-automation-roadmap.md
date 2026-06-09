# Future AI & Automation Roadmap

HOTELI is planned to evolve from a property management system into a hotel operations platform that combines property management, operational automation, revenue support, workforce planning, inventory intelligence, and guest engagement workflows.

This roadmap describes future product capabilities and the API surfaces that should support them.

## Intelligent Inventory Management

### Business Problem

Hotels frequently experience shortages of essential housekeeping and operational supplies, including linen, towels, guest amenities, cleaning products, and restaurant consumables. These shortages are often discovered too late, creating operational disruption and reducing guest satisfaction.

### Proposed Solution

HOTELI will support inventory management integrations through APIs that can monitor stock levels, generate low-stock alerts, forecast consumption based on occupancy trends, create purchase recommendations, and support supplier ordering workflows.

### Expected Benefits

- Reduced supply shortages
- Improved operational efficiency
- Lower inventory carrying costs
- Better guest experience

### API Design

#### Inventory Items

```http
GET /api/inventory/items
POST /api/inventory/items
GET /api/inventory/items/:id
PATCH /api/inventory/items/:id
```

Core fields:

```json
{
  "id": "INV-1001",
  "propertyId": "PROP-001",
  "name": "Bath Towel",
  "category": "LINEN",
  "unit": "piece",
  "currentQuantity": 420,
  "minimumQuantity": 250,
  "reorderQuantity": 300,
  "supplierId": "SUP-001",
  "status": "ACTIVE"
}
```

#### Stock Movement

```http
POST /api/inventory/items/:id/stock-movements
GET /api/inventory/items/:id/stock-movements
```

Supported movement types:

- RECEIVED
- CONSUMED
- ADJUSTED
- DAMAGED
- TRANSFERRED

#### Low-Stock Alerts

```http
GET /api/inventory/alerts
POST /api/inventory/alerts/:id/acknowledge
```

#### Purchase Recommendations

```http
GET /api/inventory/purchase-recommendations
POST /api/inventory/purchase-orders
```

Recommendation inputs:

- Current stock
- Minimum stock threshold
- Forecasted occupancy
- Historical consumption
- Supplier lead time

#### Supplier Integrations

```http
GET /api/inventory/suppliers
POST /api/inventory/suppliers
PATCH /api/inventory/suppliers/:id
POST /api/inventory/suppliers/:id/orders
```

## Occupancy-Driven Workforce Optimization

### Business Problem

Unexpected increases in occupancy can place pressure on front desk, restaurant, housekeeping, and guest services teams. Managers often have limited time to react to sudden demand changes.

### Proposed Solution

HOTELI will use occupancy forecasts and real-time reservation activity to identify staffing risks. When predefined occupancy thresholds are exceeded, the platform can notify managers, recommend staffing levels, generate scheduling suggestions, and integrate with workforce systems to contact available on-call employees.

### Expected Benefits

- Faster operational response
- Improved guest service levels
- Reduced employee burnout
- Better labor planning

### API Design

#### Staffing Rules

```http
GET /api/workforce/staffing-rules
POST /api/workforce/staffing-rules
PATCH /api/workforce/staffing-rules/:id
```

Example rule:

```json
{
  "id": "RULE-001",
  "propertyId": "PROP-001",
  "department": "FRONT_DESK",
  "occupancyThreshold": 85,
  "minimumEmployees": 3,
  "onCallEmployeesRequired": 1,
  "active": true
}
```

#### Staffing Risk Detection

```http
GET /api/workforce/staffing-risks?date=2026-06-09
POST /api/workforce/staffing-risks/evaluate
```

Risk factors:

- Occupancy percentage
- Arrivals count
- Departures count
- In-house count
- Group arrivals
- Event dates
- Existing schedule coverage

#### Scheduling Suggestions

```http
GET /api/workforce/scheduling-suggestions?date=2026-06-09
POST /api/workforce/scheduling-suggestions/:id/approve
```

#### On-Call Employee Workflow

```http
GET /api/workforce/on-call-employees
POST /api/workforce/on-call-requests
PATCH /api/workforce/on-call-requests/:id
```

Supported request statuses:

- DRAFT
- SENT
- ACCEPTED
- DECLINED
- CANCELLED

## Guest Retention & Cancellation Protection Automation

### Business Problem

Hotels lose revenue from avoidable no-shows and last-minute cancellations. Loyal and high-value guests may forget reservation details or miss cancellation deadlines even when they intend to keep or modify their stays.

### Proposed Solution

HOTELI will provide an automated guest engagement workflow for eligible loyalty and high-value guests. The system can identify reservations approaching cancellation deadlines, send email or SMS reminders, inform guests of cancellation policies, provide reservation management links, and encourage modification instead of cancellation when appropriate.

### Expected Benefits

- Reduced no-show rates
- Increased guest satisfaction
- Improved retention of high-value customers
- Better forecast accuracy
- Increased revenue protection

### API Design

#### Guest Segments

```http
GET /api/guest-engagement/segments
POST /api/guest-engagement/segments
PATCH /api/guest-engagement/segments/:id
```

Example segment:

```json
{
  "id": "SEG-001",
  "propertyId": "PROP-001",
  "name": "High-value loyalty guests",
  "minimumLifetimeSpend": 2500,
  "minimumStayCount": 4,
  "eligibleForCancellationReminder": true
}
```

#### Cancellation Policy Windows

```http
GET /api/guest-engagement/cancellation-policies
POST /api/guest-engagement/cancellation-policies
PATCH /api/guest-engagement/cancellation-policies/:id
```

Core fields:

```json
{
  "id": "POL-001",
  "propertyId": "PROP-001",
  "name": "Flexible 24 Hour Policy",
  "freeCancellationUntilHoursBeforeArrival": 24,
  "sendReminderHoursBeforeDeadline": 6,
  "active": true
}
```

#### Deadline Detection

```http
GET /api/guest-engagement/cancellation-deadlines?date=2026-06-09
POST /api/guest-engagement/cancellation-deadlines/evaluate
```

#### Reminder Workflow

```http
POST /api/guest-engagement/reminders
GET /api/guest-engagement/reminders
GET /api/guest-engagement/reminders/:id
PATCH /api/guest-engagement/reminders/:id
```

Supported reminder statuses:

- SCHEDULED
- SENT
- FAILED
- CANCELLED

#### Reservation Management Link

```http
POST /api/guest-engagement/reservation-links
GET /api/guest-engagement/reservation-links/:token
```

Security requirements:

- Time-limited token
- Reservation-scoped access
- No full account login required
- Audit log entry when opened

## Long-Term Platform Vision

The long-term vision for HOTELI is to become a unified hotel operations platform combining:

- Property Management
- Revenue Management
- Workforce Optimization
- Inventory Intelligence
- Guest Engagement Automation
- AI-Assisted Operational Decision Support

This direction is intended to help independent hotels and hotel groups improve profitability, operational efficiency, and guest satisfaction through data-driven automation.

## Implementation Priority

1. PostgreSQL and Prisma foundation
2. Modular backend structure
3. Property settings and configurable business rules
4. Inventory module API contracts
5. Workforce module API contracts
6. Guest engagement module API contracts
7. Background job processor
8. External integration adapters
9. AI recommendation services
10. Executive operations dashboard
