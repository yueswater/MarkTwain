# Typst build baseline

Measured with `locust` against `src/server.ts`, which wraps `buildTypst` from `@marktwain/build`.
Template `tw-thesis-typ` v1.0.0, typst 0.15.1, MacBook with Apple silicon and 8 cores, 2026-10-14.

| Scenario | Users | Request | Requests | Median | p95 | Failures |
|---|---|---|---|---|---|---|
| LongThesisUser | 1 | long thesis, 185 pages | 18 | 510 ms | 540 ms | 0 |
| ConcurrentUsers | 8 | small thesis, 23 pages | 207 | 270 ms | 320 ms | 0 |
| ConcurrentUsers | 8 | medium thesis, 71 pages | 115 | 340 ms | 410 ms | 0 |
| ConcurrentUsers | 8 | long thesis, 185 pages | 32 | 540 ms | 870 ms | 0 |

Throughput with 8 concurrent users was about 6 builds per second.

## Budgets

`budgets.json` holds the limits that `check_budgets.py` enforces. They sit about 5 to 10 times above the baseline
so a slower CI runner does not fail the check, while a real regression such as a build that takes seconds does.

| Request | p95 budget |
|---|---|
| small thesis | 2000 ms |
| medium thesis | 3000 ms |
| long thesis | 5000 ms |

## Running it

```bash
pnpm templates:fetch typ
pnpm --filter @marktwain/bench server &
pip install locust
locust -f tools/bench/locustfile.py LongThesisUser --headless -u 1 -r 1 -t 1m --csv out/long
python3 tools/bench/check_budgets.py out/long_stats.csv
```
