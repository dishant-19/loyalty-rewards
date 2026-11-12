# AI interaction log

This log records representative prompts and implementation decisions. The project owner should update it to match the actual tools and interactions used during their own development.

## Key prompts / interactions

1. **Prompt:** “Build a simple PHP customer loyalty rewards system for a factory selling boxed products.”  
   **Outcome:** Chose plain PHP, MySQL, customer/admin roles, and one-time box codes to keep the setup beginner-friendly.

2. **Prompt:** “How can a customer prove they bought a product?”  
   **Outcome:** Proposed a unique code inside each box, inserted by the factory during packaging. This is possession-based proof and avoids asking customers to upload receipts.

3. **Prompt:** “Prevent fraud and code reuse.”  
   **Outcome:** Use cryptographically random codes, store only SHA-256 hashes, unique constraints, and atomic conditional updates.

4. **Prompt:** “Add a modern responsive dark/light UI with animation.”  
   **Outcome:** Added CSS variables, theme persistence, responsive layouts, a floating box illustration, hover depth, and reduced-motion handling.

5. **Prompt:** “Add an admin view for factory monitoring.”  
   **Outcome:** Added code batch generation, counts, redemption rate, recent activity, and a pending redemption review area.

6. **Incorrect AI suggestion noticed:** An early implementation idea was to store the raw box code in the database so staff could search it.  
   **How it was noticed:** A database leak would expose every unused code, allowing attackers to claim them.  
   **Fix:** Store only `SHA-256(code)` and show the clear-text code only once at generation time.

7. **Incorrect AI suggestion noticed:** A simple “check code, then update code” sequence without a transaction could allow two requests to race and both award points.  
   **How it was noticed:** Two customers could submit the same code nearly simultaneously.  
   **Fix:** Use a transaction and `UPDATE ... WHERE status='unused'`, then require exactly one affected row before crediting points.

8. **Prompt:** “Document assumptions, architecture, and tests.”  
   **Outcome:** Added `ASSUMPTIONS.md`, `ARCHITECTURE.md`, and a repeatable manual test plan with expected outcomes.

## Review note

AI-generated code must be reviewed and tested by the repository owner. The two corrections above are intentionally recorded as examples of risks identified during review; do not claim tests were run unless they were actually executed.
