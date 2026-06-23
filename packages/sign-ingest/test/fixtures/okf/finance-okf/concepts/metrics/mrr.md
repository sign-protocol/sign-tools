---
type: metric
title: Monthly Recurring Revenue
description: Normalized recurring revenue booked in a calendar month.
tags: [revenue, saas]
timestamp: 2026-03-01T12:00:00Z
---

# Monthly Recurring Revenue

MRR is the normalized monthly value of all active recurring subscriptions. It is computed
from the [ledger](../../sources/ledger.md) and excludes one-time fees.

See also the [missing source](../sources/does-not-exist.md) for the deprecated feed.

## Method

Sum each active subscription's monthly-normalized amount as of month end.
