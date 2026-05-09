# RackingHub Planner — Free Warehouse Racking Calculator

A client-side warehouse planning tool that recommends optimal racking systems based on user input. Collects sales leads and funnels them to the RackingHub sales team.

## Architecture

```
planner/
├── index.html          # Landing page + wizard (3-step form)
├── style.css           # Planner styles (matches rackinghub.com design system)
├── app.js              # Recommendation engine + Canvas layout + form logic
└── data/
    ├── products.json   # 6 product types with specs
    └── cases.json      # 3 case studies

functions/
└── planner/
    └── submit.js       # Cloudflare Pages Function (lead capture + notification)
```

## User Flow

1. **Landing Page** — Hero, How It Works, Case Studies, CTA
2. **Step 1/3** — Contact info (name, email required; company, phone, country optional)
3. **Step 2/3** — Warehouse specs (dimensions, pallet weight, SKU count, access pattern)
4. **Step 3/3** — Results (2-3 recommendation cards, comparison table, Canvas layout, disclaimer)

## Recommendation Engine

Multi-dimensional scoring system (weights sum to 100%):

| Criteria | Weight | Logic |
|----------|--------|-------|
| Load matching | 30% | Product max load ≥ user pallet weight → full points |
| Access efficiency | 25% | SKU count + frequency → selective vs. dense racking |
| Space utilization | 25% | Warehouse height + area → VNA/shuttle vs. standard |
| Cost efficiency | 20% | Price per position (relative to all products) |

Hard constraints: FIFO rotation requirement eliminates Drive-In and Push-Back.

## Deployment

### Prerequisites
- Push access to `github.com/rackinghub/rackinghub-site` (branch: `main`)
- Cloudflare Pages project connected to the repo

### Cloudflare Pages Configuration
1. **Framework preset:** None (static HTML)
2. **Build command:** Leave empty
3. **Build output directory:** `.` (root)

### Environment Variables (Cloudflare Dashboard)
| Variable | Required | Description |
|----------|----------|-------------|
| `FEISHU_WEBHOOK_URL` | Optional | Feishu bot webhook for new lead notifications |

### KV Namespace Binding
| Variable name | Namespace |
|---------------|-----------|
| `PLANNER_LEADS` | Create a new KV namespace |

### Push to Deploy
```bash
cd ~/rackinghub-site
git add planner/ functions/planner/submit.js
git commit -m "feat: rebuild RackingHub Planner — warehouse racking calculator"
https_proxy=http://127.0.0.1:1087 git push origin main
```

Cloudflare Pages auto-builds and deploys. Access at `https://rackinghub.com/planner/`

## EmailJS Configuration (Optional)

The EmailJS SDK is already loaded in `index.html`. To enable client-side email sending:

1. Sign up at [emailjs.com](https://www.emailjs.com/)
2. Create an email service (Gmail, Outlook, or custom SMTP)
3. Create an email template with these variables:
   - `{{to_name}}` — Contact name
   - `{{from_email}}` — Contact email
   - `{{message}}` — Recommendation summary
4. Get your Public Key from the EmailJS dashboard
5. Add this line to `app.js` (inside the IIFE, before `window.App = {}`):
   ```javascript
   emailjs.init('YOUR_EMAILJS_PUBLIC_KEY');
   ```
6. Replace the `requestQuote()` fetch call with `emailjs.send('service_id', 'template_id', templateParams)`

## Data Model

### Product (products.json)
```json
{
  "id": "selective-heavy",
  "name": "Heavy-Duty Selective Racking",
  "max_load_per_level": 3000,
  "upright_height_options": [3, 4.5, 6, 8, 10],
  "beam_length_options": [1.8, 2.4, 2.7, 3.0],
  "depth": 1.0,
  "aisle_width": 3.2,
  "price_per_position_cny": 120,
  "storage_density_pct": 35,
  "access_type": "selective",
  "supports_fifo": true,
  "supports_lifo": true
}
```

### Lead (stored in KV)
```json
{
  "id": "abc123def456",
  "submittedAt": "2026-05-09T12:00:00.000Z",
  "contact": { "name": "John", "email": "john@company.com", "company": "ABC", "phone": "", "country": "DE" },
  "specs": { "length": 60, "width": 40, "height": 9, "palletWeight": 1000, "skuCount": 500, "frequency": "medium", "rotation": "fifo" },
  "recommendations": []
}
```

## Technical Notes

- **Pure client-side** — all calculations happen in the browser, no server needed for recommendations
- **localStorage persistence** — user progress is saved, survives page reload (24h expiry)
- **Canvas 2D layout** — top-down warehouse view with rack rows, aisles, entrance, and scale bar
- **PDF export** — `window.print()` with `@media print` CSS hides navigation, shows only results
- **No build step** — plain HTML/CSS/JS, deploys on every git push
- **Responsive** — works on mobile, tablet, and desktop (breakpoints at 768px and 480px)
