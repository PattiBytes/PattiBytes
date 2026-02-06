<!-- =========================
PattiBytes Express — Special Repo README
Replace placeholders like YOUR_GITHUB, YOUR_REPO, THRILLYVERSE_SITE, etc.
GitHub sanitizes CSS, so “3D/hover” is achieved via SVG banners, badges, and interactive <details>.
========================= -->

<p align="center">
  <!-- 3D/Animated Header (SVG) -->
  <img
    src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=220&section=header&text=PattiBytes%20Express&fontSize=48&fontAlignY=36&animation=fadeIn"
    alt="PattiBytes Express"
  />
</p>

<p align="center">
  <!-- Animated typing line -->
  <img
    src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=16&pause=900&center=true&vCenter=true&width=700&lines=Fully+Dynamic+PWA+Food+Delivery+Platform;Customer+%E2%80%A2+Merchant+%E2%80%A2+Driver+%E2%80%A2+Admin;Realtime+Orders+%7C+Live+Location+Tracking+%7C+Modern+UI"
    alt="Typing SVG"
  />
</p>

<p align="center">
  <a href="https://pbexpress.pattibytes.com"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-pbexpress.pattibytes.com-ff6a00?style=for-the-badge"></a>
  <a href="#-quick-start"><img alt="Quick Start" src="https://img.shields.io/badge/Quick%20Start-Now-111827?style=for-the-badge"></a>
  <a href="#-pwa-installation"><img alt="PWA" src="https://img.shields.io/badge/PWA-Installable-22c55e?style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App%20Router-000000?logo=nextdotjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strong%20Types-3178c6?logo=typescript&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Realtime-3ecf8e?logo=supabase&logoColor=white">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-Offline%20Ready-0ea5e9?logo=pwa&logoColor=white">
</p>

---

## ✨ Why this repo is special

> **PattiBytes Express** is a multi‑role, realtime, installable PWA built for real-world food delivery workflows.

- Fully dynamic UI powered by realtime updates (orders, status, notifications)
- Interactive UX (modals, address autocomplete, install prompts, role dashboards)
- Live order tracking using order-level **customer** + **driver** location payloads
- Clean role routing (Customer / Merchant / Driver / Admin / Superadmin)

---

## 🌍 Live Demo + PWA

- Web: https://pbexpress.pattibytes.com

### 📲 PWA Installation
<details>
  <summary><b>Install on Android</b> (tap to expand)</summary>

  1. Open the site in Chrome
  2. Tap menu ⋮ → **Install app** / **Add to Home screen**
  3. Launch from the home screen for full PWA experience
</details>

<details>
  <summary><b>Install on iPhone / iPad</b> (tap to expand)</summary>

  1. Open the site in Safari
  2. Tap **Share** → **Add to Home Screen**
  3. Launch from the home screen
</details>

<details>
  <summary><b>Install on Desktop (Chrome/Edge)</b> (tap to expand)</summary>

  1. Open the site
  2. Click the install icon in the address bar (or menu → Install)
  3. Pin it and run like an app
</details>

---

## 🧩 Features (Interactive)

<details open>
  <summary><b>Customer App</b></summary>

  - Browse restaurants, search, cart, promo codes
  - Checkout with saved addresses + instructions
  - Realtime order status + invoice download
  - Optional **Share live location** for delivery tracking
</details>

<details>
  <summary><b>Merchant App</b></summary>

  - Manage menu and restaurant profile
  - Receive orders in realtime
  - Order status lifecycle management
</details>

<details>
  <summary><b>Driver App</b></summary>

  - Pickup & drop navigation
  - Live location modal (driver + customer)
  - Start/Stop sharing driver location on the order
  - Mark picked up / delivered
</details>

<details>
  <summary><b>Admin / Superadmin</b></summary>

  - User access requests + approvals
  - Notifications + moderation-ready structure
  - Manage users, merchants, drivers, orders
</details>

---

## 🛰️ Live Location Tracking (Order-level)

Both driver and customer locations are stored on the order (recommended: JSONB columns).

**Example payload**
```json
{
  "lat": 30.745,
  "lng": 76.794,
  "accuracy": 25,
  "updatedat": "2026-02-01T08:09:19.860Z"
}
