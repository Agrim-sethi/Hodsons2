# Athletics 2026 Firebase Backend

The Athletics page uses the Firebase project already configured by `utils/firebase.ts` and stores its live snapshot in Firestore at:

`athletics_2026_v1 / data`

The frontend keeps a local cache for fast startup/offline resilience, but Firestore is the cloud source of truth once the listener connects.

## 1. Enable Firebase Authentication

In Firebase Console:

1. Open the `hodsons-848af` project.
2. Go to **Authentication → Sign-in method**.
3. Enable **Email/Password**.
4. In **Authentication → Users**, create the staff account whose email matches `VITE_FIREBASE_STAFF_EMAIL`.
5. The UI still uses the staff-facing ID `SNA`; internally that ID is mapped to the configured Firebase Auth email.

Do not put a password in Vite environment variables or source code.

## 2. Create the staff permission document

After creating the Auth user, copy that user's Firebase **UID**.

In **Firestore Database**, create:

- Collection: `staff`
- Document ID: `<AUTH_USER_UID>`
- Fields:
  - `active`: `true`
  - `displayName`: `Sanawar Athletics Admin`
  - `role`: `staff`

The client may read its own profile, but the rules prevent the client from creating or changing staff permissions.

## 3. Deploy Firestore rules

The repository contains `firestore.rules` and `firebase.json`.

Deploy the rules from a trusted machine with the Firebase CLI:

```bash
firebase login
firebase use hodsons-848af
firebase deploy --only firestore:rules
```

The important policy is:

- Everyone can read public Athletics and Hodson's results.
- Only an authenticated user with `staff/{uid}.active == true` can write results.
- Staff permission documents cannot be edited from the web app.
- Unrecognised Firestore collections remain denied by the catch-all rule.

## 4. Vercel environment variable

Set this environment variable in Vercel if you want to use an Auth email different from the default:

`VITE_FIREBASE_STAFF_EMAIL=<firebase-auth-email>`

The existing Firebase web configuration remains in `utils/firebase.ts` and can be overridden by the existing `VITE_FIREBASE_*` environment variables.

## 5. Athletics data model

The current page's snapshot remains backward-compatible:

```text
athletics_2026_v1
└── data
    ├── enrollments[]
    ├── finals[]
    └── results[]
```

Each result contains an event ID, student ID, stage, status, timing, position, and qualification flag. This keeps the live listener simple and ensures the Summary, Leaderboard, and event-management views all consume the same backend state.

## 6. Migration note

The existing Athletics Firestore document at `athletics_2026_v1/data` is intentionally preserved. No client migration or destructive rewrite is required for this authentication hardening pass.
