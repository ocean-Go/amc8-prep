# AMC8 Prep — Public Release Security Blockers

**Status: BLOCKED until every item below is independently verified.**

## Discovery

The public repository previously tracked `amc8-prep/.env.local`. Do **not** read, copy, echo, archive, quote, or paste the file content into issues, PRs, logs, or chats. We cannot safely assume its values were placeholders. Removing the file from the latest Git tree **does not remove it from previous commits or forks/caches**.

The application currently accepts a client-provided `user_id` and some routes may use a service-role database credential. A frontend user selector is not authentication; users and history must be protected server-side before any student data is collected on the internet.

## Required manual containment (operator)

- [ ] **Identify the owner of every potentially exposed credential** using the provider dashboards, without posting the values anywhere.
- [ ] **Revoke/rotate any real exposed tokens** (Supabase database URL + anon key are usually public configuration, but `SUPABASE_SERVICE_ROLE_KEY`, database passwords, third-party API tokens, and any signing secrets are confidential). Reissue secrets outside GitHub, test services, and verify old keys no longer work.
- [ ] **Purge Git history where feasible**, with an explicit backup, coordinated history rewrite, and developer notification. Use GitHub's official sensitive-data-removal process as applicable; rewrite alone cannot recall copies already cloned or cached. Do not force-push production history without explicit approval.
- [ ] Re-check all GitHub Actions settings, deployment hosts, and connected services for old credentials; move new values to appropriate secret managers.

## Required code and content gates

- [ ] Remove the tracked local env file from HEAD; ensure .gitignore covers future local env files.
- [ ] Verify session authentication, authorized role and ownership on **every** read/write API. Reject unauthenticated and cross-child access. Never trust user_id supplied by browser; enforce RLS/minimal privileges on Supabase.
- [ ] Verify all student-facing questions are curated and complete, with referenced figures/images present. Unverified OCR text and placeholder questions are not approved.
- [ ] Verify full 25-question / 40-minute mock and scheduled wrong-book review on server-backed persistent records.
- [ ] Test iPad Safari operation without exposing adult account or administration pages.

## Programmatic release guard

`node scripts/check-public-release.mjs` fails by default. It checks the tracked file paths in the current Git repository but **does not inspect secret values**.

After independently completing and recording the required manual validations, an operator may run:

```bash
AMC8_RELEASE_SECRETS_ROTATED=yes \
AMC8_RELEASE_AUTH_VERIFIED=yes \
AMC8_RELEASE_CONTENT_QA_VERIFIED=yes \
node scripts/check-public-release.mjs
```

**Do not set these flags until verified.** The command is an attestation gate, not proof of rotation, Git history cleanup, authentic access controls, or content QA. It does not replace a real CI build / integration tests.

## Deployment

Do not merge or deploy a student-accessible build before the blockers above are resolved. Keep this security PR unmerged until reviewed; follow up with a separate dedicated auth/RLS issue. Existing historical commits may continue to expose the original file until the operator remediates them.
