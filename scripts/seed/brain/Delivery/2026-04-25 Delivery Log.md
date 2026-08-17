# 2026-04-25 Delivery Log

## Summary
Delivery discussion focused on Coatary's live website, deployment ownership, and how to integrate the AI product-selection tool into a more professional architecture.

## Coatary
- Website is live through Vercel/DNS rather than WordPress.
- WordPress may no longer be needed for the live site, but domain/DNS ownership still matters.
- Adding extra users to Toprock's Vercel can create per-user cost, so ownership/access should be decided deliberately.
- Flint's current coding process is too manual; moving him to Claude Code should save substantial time.
- Discord backfill added late-April-25 implementation detail: Austin built a preview that merges Flint's Coaty agent with the website. Preview access was fixed after turning off the Vercel preview gate, but chat functionality still needs the correct Claude API token.

## Technical Workstreams
- Product-selection AI tool cleanup and integration.
- Vercel/GitHub deployment workflow.
- Purchase-order-style output from AI recommendations.
- Possible Stripe/payment and distributor access model.
- Social media automation from Coatary photo library.
- Toprock CRM MRR/account/opportunity tracking.
- Sport Recruiting multi-school architecture and coach registration flow.

## Open Items
- [ ] Decide whether Coatary stays hosted/deployed under Toprock or moves to a Coatary-owned Vercel account.
- [ ] Create a handoff/training flow for Amelia if she will manage updates.
- [ ] Review Flint's repository and align it with Toprock's preferred architecture.
- [ ] Get or define runtime credentials for the Coatary agent before demoing chat behavior.
- [ ] Add MRR and one-time implementation fields to Toprock CRM.
