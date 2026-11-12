# Manual test plan

## Test environment

- PHP 8.1+ with `pdo_mysql` enabled.
- Fresh checkout, MySQL 8.0+ running, and `database.sql` imported (or database created).
- Run `php -S localhost:8000` and open `http://localhost:8000`.

## Test cases

| ID | Test | Steps | Expected result |
|---|---|---|---|
| T01 | Customer registration | Register with valid name, email, and password | Account is created and customer dashboard opens |
| T02 | Invalid email | Register using `not-an-email` | Validation message; no account created |
| T03 | Weak password | Register using fewer than 8 chars or without uppercase/digit | Validation message; no account created |
| T04 | Duplicate email | Register twice using same email | Second registration is rejected |
| T05 | Admin login | Sign in with demo admin credentials | Factory control centre opens |
| T06 | Customer access control | Sign in as customer and open `admin.php` | HTTP 403 Access denied |
| T07 | Generate codes | Admin generates 3 codes at 10 points each | Three random 12-character codes display once; totals update |
| T08 | Valid claim | Customer submits one newly generated code | Code is accepted and customer balance increases by 10 |
| T09 | Reuse prevention | Submit the same code again (same or another customer) | Claim is rejected; points do not increase |
| T10 | Invalid code | Submit a random 12-character code | “Code is not valid” message; no points added |
| T11 | Code format | Submit fewer/more than 12 alphanumeric characters | Client/server validation rejects the value |
| T12 | Theme toggle | Toggle theme, refresh page | Selected theme persists in browser local storage |
| T13 | Responsive UI | Open on a narrow mobile viewport | Cards stack, forms fit viewport, table can scroll horizontally |
| T14 | CSRF | Remove or alter hidden CSRF token then submit | Request rejected with HTTP 419 |
| T15 | Reward threshold | Customer has earned 0–99 new points since their previous request | Reward request is disabled and remaining points are shown |
| T16 | Submit reward request | Customer has earned at least 100 new points since their previous request and submits the ₹50 voucher request | Exactly 100 points are deducted; a pending request and activity entry are created |
| T17 | Admin approval | Admin approves a pending request | Request becomes approved; no points are refunded |
| T18 | Admin rejection | Admin rejects a pending request | Request becomes rejected; exactly 100 points are refunded and the previous reward progress is restored |
| T19 | Repeated admin action | Submit approve/reject twice for the same request | Second action is rejected; no duplicate refund occurs |
| T20 | Request history | Customer opens dashboard after a request is processed | Pending/approved/rejected status appears in reward request history |
| T21 | Request notifications | Customer submits a reward request | Customer inbox and admin inbox each receive a new-request notification; unread badge increments |
| T22 | Approval notification | Admin approves a pending request | Customer receives an approval notification; points remain deducted |
| T23 | Rejection notification | Admin rejects a pending request | Customer receives a rejection notification and a separate points-refunded notification; 100 points and progress are restored |
| T24 | Mark notifications read | Customer and admin each use “Mark all read” | Only that inbox's unread notifications are marked read and its badge clears |
| T25 | Notification access isolation | Sign in as a different customer | Customer cannot see another customer's notifications; admin inbox only shows admin notifications |
| T26 | Live field validation | Type an invalid name/email, then tab away | Red inline message, shake animation, `aria-invalid`; valid values show a green tick |
| T27 | Password strength + confirm | Type a password on Register; type a different confirmation | Strength bar and checklist update live; "Passwords do not match." shown |
| T28 | Show/hide + Caps Lock | Click SHOW; type with Caps Lock on | Password becomes visible; Caps Lock warning appears |
| T29 | Password length cap | Register with a 73+ byte password | Rejected: "Password must be 72 bytes or fewer." |
| T30 | Name rule | Register with `J0hn <script>` | Rejected with the name-characters message |
| T31 | Code input normalisation | Paste `ab12-cd34-ef56` into the claim box | Becomes `AB12CD34EF56`, meter full, accepted |
| T32 | Short code | Enter 7 characters and submit | "Code needs 12 characters — you entered 7." inline and in the summary |
| T33 | Admin number validation | Generate with quantity `0`, `101`, `1.5`, `abc`; points `0`/`1001` | Per-field messages; no codes created |
| T34 | Server-side only | Disable JavaScript and submit invalid data | Same errors returned by the server |
| T35 | Double-submit guard | Click Redeem/Generate/Approve twice quickly | Button shows spinner and locks; only one action is processed |
| T36 | Array injection | POST `name[]=x` / `code[]=x` via a tool | Treated as empty/invalid; no PHP warning or crash |
| T37 | Reduced motion | Enable OS "reduce motion" | No cube/tilt/confetti/entrance animation; layout intact |
| T38 | Theme crossfade | Toggle the theme | Smooth colour transition; 3D scene follows the theme colours |
| T39 | Global 3D world | Open any page; scroll and move the mouse | Boxes/coins drift behind content; camera follows scroll and mouse |
| T40 | 3D coin | Dashboard: drag then click the coin | Coin spins with inertia; click gives an extra flip |
| T41 | 3D gauge | Admin: reload; drag the gauge | Bars build up to the redemption %; ring rotates on drag |
| T42 | 3D gift box | Login/Register: click the box | Lid opens/closes; drag rotates it |
| T43 | Celebration | Redeem a valid code | 3D coins burst in the background plus confetti |
| T44 | Page transition | Click a nav link | Page tilts away in 3D, camera warps, next page loads |
| T45 | WebGL fallback | Block cdn.jsdelivr.net or disable WebGL | Pages work; CSS cubes and CSS gift box are shown instead |

## Results recording

This repository provides the test cases and expected results as a manual test plan. No test execution is claimed in this starter archive. Record actual date, browser/PHP version, pass/fail, and evidence here after running the cases.

## Known limitations

- No automated test runner is included.
- Customers can request the ₹50 shopping voucher for 100 points. Points are deducted when submitted, requests appear in the admin queue, and rejected requests automatically refund the points.
- In-app notifications are created transactionally for the customer and admin when a request is submitted; customers receive approval, rejection, and separate points-refunded notices. Each inbox has an unread badge and a mark-all-read action.
- Login and code-claim rate limiting, email verification, password reset, and admin password change are required before public production use.
