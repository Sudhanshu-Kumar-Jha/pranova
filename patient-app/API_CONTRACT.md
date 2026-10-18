# PRANOVA Patient App — API Contract

**Base URL:** resolved by `src/config.ts` — `EXPO_PUBLIC_API_URL`, else the Metro host IP, else `app.json` `extra.apiUrl`, else the LAN fallback. `localhost` is unreachable from a device.
**Envelope:** every response is `{ success, message, data, meta?, timestamp }`. Lists put the count in `meta.total`.
**Auth:** send `Authorization: Bearer <accessToken>` on every `/app/*` call. Dev OTP = `123456`.
**Allowed surface:** `/auth/otp/*`, `/auth/refresh-token`, `/auth/me`, and `/app/*` **only**.

## App configuration (public — no token)
| Method | Path | Returns |
|---|---|---|
| GET | `/app/config` | `{ appName, tagline, logoUrl, primaryColor, supportEmail, supportPhone, emergencyNumber, pharmacy: { deliveryFee, freeDeliveryThreshold, minOrderAmount, codEnabled, onlinePaymentEnabled } }` |

Fetched before sign-in so the splash and login screens can brand themselves. `logoUrl` may be a
hosted URL **or** an inline `data:` URL. The `pharmacy` block is for **display only** — the server
prices every order itself.

## Authentication
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/otp/send` | `{ phone, role: "PATIENT" }` | mock OTP info |
| POST | `/auth/otp/verify` | `{ phone, otp, role: "PATIENT", firstName?, lastName? }` | `{ user, tokens }` |
| POST | `/auth/refresh-token` | `{ refreshToken }` (or HttpOnly cookie) | `{ tokens }` |
| GET | `/auth/me` | — | current user |

## Discovery & Consultation
| Method | Path | Notes |
|---|---|---|
| GET | `/app/specialties` | active specialties |
| GET | `/app/doctors` | query: `specialtyId`, `city`, `q`, `page`, `perPage` |
| GET | `/app/doctors/:id` | profile + availability slots |
| GET | `/app/appointments` | my appointments |
| POST | `/app/appointments` | `{ doctorId, type: VIDEO\|AUDIO\|IN_CLINIC, scheduledStart (ISO), durationMinutes?, reason?, symptoms? }` → includes `videoJoinUrl` for tele-consults |
| GET | `/app/appointments/:id` | one of mine |
| POST | `/app/appointments/:id/video-token` | `{ roomId, token, joinUrl, expiresInSeconds, provider }` |
| POST | `/app/appointments/:id/cancel` | `{ cancelReason }` |

## Pharmacy
| Method | Path | Notes |
|---|---|---|
| GET | `/app/medicines` | query: `q`, `category` (OTC\|PRESCRIPTION\|WELLNESS\|DEVICE) |
| GET | `/app/orders` | my orders |
| POST | `/app/orders` | `{ items:[{ medicineId, quantity }], deliveryAddress, city?, pincode?, phone, paymentMethod?: COD\|ONLINE, prescriptionUrl?, notes? }` — **server computes totals** from admin-configured rules. Rejects `ONLINE` unless enabled (no gateway is integrated), `COD` if switched off, and a basket under the configured minimum. |
| GET | `/app/orders/:id` | track an order |

## Diagnostics
| Method | Path | Notes |
|---|---|---|
| GET | `/app/lab-tests` | query: `q`, `category` |
| GET | `/app/lab-bookings` | my bookings |
| POST | `/app/lab-bookings` | `{ testId, collectionType: HOME_COLLECTION\|LAB_VISIT, scheduledDate (ISO), address?, city?, pincode?, phone }` |
| GET | `/app/lab-bookings/:id` | track a booking |

## Enums for UI
- AppointmentStatus: `REQUESTED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW`
- OrderStatus: `PLACED, CONFIRMED, PACKED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED`
- LabBookingStatus: `BOOKED, SAMPLE_COLLECTED, PROCESSING, REPORT_READY, CANCELLED`
- PaymentStatus: `PENDING, PAID, FAILED, REFUNDED`
- PaymentMethod: `COD, ONLINE` (orders carry `paymentMethod`; `ONLINE` is disabled until a gateway is configured)
- MedicineCategory: `OTC, PRESCRIPTION, WELLNESS, DEVICE`

## Product images
`Medicine.imageUrl` may be a hosted URL, an inline `data:` URL set in the admin console, or empty.
Always render it through `ProductImage`, which falls back to a category icon.

> The interactive source of truth is the backend Swagger (dev only). Do not call any path not listed here; if you need one, request it from the backend team.
