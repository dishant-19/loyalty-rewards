# Assumptions

1. **One code per physical box.** Each sealed box contains a 12-character alphanumeric code printed on a tamper-evident insert. The code is the proof of purchase; a receipt upload is not required for this first version because the code is only available after opening the box.
2. **Ten points per box by default.** The factory can choose a point value when generating a batch. The customer-facing dashboard explains the earn flow.
3. **Factory creates the codes.** Only an authenticated admin can generate up to 100 codes per batch. Codes are generated using a cryptographically secure random generator, shown once, and must be printed/injected into packaging by factory staff.
4. **Codes are case-insensitive.** Spaces and punctuation are removed before validation to make entry easier. Exactly 12 alphanumeric characters are accepted.
5. **A code can be redeemed once globally.** The SHA-256 hash is stored instead of the raw code. A database unique constraint, conditional status update, and transaction prevent concurrent double redemption.
6. **Customers need an account.** Email is the unique login identifier. Email verification and password reset are not included in this local demo and should be added before a public launch.
7. **Admin demo credentials are seeded.** `admin@example.com` / `Admin@12345` are for local evaluation only and must be changed/removed before deployment.
8. **Rewards are illustrative.** The dashboard shows sample reward ideas and point thresholds. A full reward catalogue and customer redemption request UI are a next iteration; the admin screen includes the approval workflow for records if added.
9. **Admin monitoring is aggregate and recent.** The factory can see customer count, code volume, redemption rate, pending reward requests, and recent activity. This starter does not include CSV export or charts.
10. **MySQL is chosen for easy setup.** It avoids requiring a database server for an assignment/demo. For high-volume production, migrate to MySQL/PostgreSQL and add backups, rate limiting, email verification, audit retention, and deployment secrets.
11. **Single factory / single currency context.** Rewards and point values are global; multi-brand, multi-factory, dealer hierarchies, and geographic restrictions are outside this brief.
12. **English interface and INR examples.** The sample voucher is displayed in Indian rupees as a contextual example; actual reward fulfilment is controlled by the factory.
