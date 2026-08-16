# 2026-05-01 Drive Digest

## Summary
Drive's strongest May 1 signal is implementation progress on Lightspeed R-Series OAuth for The Scuba Dive booking/onboarding work. The date-bounded search also surfaced noisy synced dependency documentation, which was ignored. A recent Scuba transcript was reviewed as supporting context because it directly explains the business workflow being automated.

## Documents Reviewed

### server.log
**Source:** https://drive.google.com/file/d/1E-i75SoJK8sXCtBs3Tjzk9ZcrHlvEEzb  
**Date Signal:** created 2026-05-02T00:55:09Z; modified 2026-05-02T00:48:13Z, which falls on May 1 local time.  
**Type:** delivery

Log from a local Lightspeed OAuth utility. It shows the utility starting, generating authorization URLs, completing an OAuth token exchange, saving token material locally, and warning not to commit refresh-token data.

**Toprock Relevance**
- Confirms Lightspeed authentication work is no longer purely research; a token exchange succeeded in local tooling.
- Supports the next engineering step: implement durable refresh-token handling and verify read access before attempting write operations.
- Sensitive OAuth details should remain out of the vault and repository.

**Open Items**
- [ ] Add/verify a safe token-refresh workflow for the Lightspeed integration.
- [ ] Confirm read-only Lightspeed API calls for customers, products/e-learning codes, and class-related data.

### server.err.log
**Source:** https://drive.google.com/file/d/1jNw2Uj_nY3t2el5bfIDA17dqgB_sC0_T  
**Date Signal:** created 2026-05-02T00:55:09Z; modified 2026-05-02T00:45:01Z, which falls on May 1 local time.  
**Type:** delivery

The error log was visible in Drive, but fetch returned no readable body content.

**Toprock Relevance**
- No actionable error details were available from Drive.

**Open Items**
- [ ] Check the local Lightspeed OAuth workspace if runtime errors are suspected.

### Scuba Dive Transcript 4/11
**Source:** https://docs.google.com/document/d/1q7vsEe9wa_KR98L-IY23dbg-9N_v4a-PBasUWuYguNo  
**Date Signal:** created/modified 2026-04-11; reviewed as recent Scuba context because May 1 Drive results were mostly sparse/noisy.  
**Type:** transcript

Transcript context reinforces the May 1 booking-flow direction. The Scuba team wants to reduce manual course onboarding, automate class-specific emails, collect waivers/medical forms earlier, track proof/certification materials, reduce missed steps from staff interruption, and eventually replace RentItBiz because it is costly and split from Lightspeed.

**Toprock Relevance**
- Classes are a customer-acquisition path for equipment sales, so the course booking flow matters beyond class revenue.
- Lightspeed should remain the source of truth for customers, products/SKUs, e-learning codes, and payment/accounting records where feasible.
- Pacific Scuba Repair remains a related priority because national advertising requires a trustworthy site, but domain/hosting access is still the blocker.

**Open Items**
- [ ] Convert course onboarding steps into a data model and automation map.
- [ ] Confirm which data should live in Lightspeed versus Toprock's custom booking layer.
- [ ] Get Pacific Scuba domain/hosting access.

## Cross-Links To Create Or Update
- [[The Scuba Dive Riverton]]
- [[The Scuba Dive Website and Automation]]
- [[Pacific Scuba Repair]]
- [[Pacific Scuba Repair Website]]
- [[Kate Larson]]
- [[Preston Larson]]
- [[Alex Larson]]

## Gaps
- Most May 1 Drive search results were synced code/dependency files rather than client documents.
- Sensitive OAuth authorization URLs and token-adjacent details were intentionally summarized rather than copied.
