# Security Policy

## Scope

Sign Tools is a monorepo of reference implementations (currently `sign-ingest`
and `sign-draft`) that read documents and emit SIGN. Relevant issue classes
include:

* Path traversal or arbitrary file read/write in importers/CLIs
* Crashes, hangs, or unbounded resource use on crafted input documents
* Injection or code-execution risks in document parsing
* Insecure handling of any credentials or network calls a tool may add

## Supported Versions

Security fixes target the `main` branch and the latest published version of each
affected package. Pre-release `0.x` packages are supported on a best-effort
basis.

## Reporting a Vulnerability

Please **do not open a public issue** for security-sensitive reports.

Use GitHub's private vulnerability reporting: go to the **Security** tab of this
repository and choose **"Report a vulnerability."** This opens a private
advisory visible only to the maintainers.

If you cannot use GitHub Security Advisories, email **info@careerhighways.com**.

Please include:

* Which package is affected (`sign-ingest`, `sign-draft`, shared, ...)
* A description of the issue and its impact
* Steps to reproduce (a minimal input document is ideal)
* The version or commit you tested against

## What to Expect

* We aim to acknowledge reports within a few business days.
* We will confirm the issue, keep you updated on remediation, and credit you in
  the release notes unless you prefer to remain anonymous.
