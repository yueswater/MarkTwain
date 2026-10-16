# Load baseline: the Typst build and the versions

## Typst build

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

## Versions

Measured with Locust against the same server on the same machine (MacBook with Apple silicon), 2026-10-16.

### Scenario 3: a merge of two branches

`POST /merge` merges two branches that each change a share of the blocks of one document, then checks the result as the unit tests do: with no conflict
every change of both sides is in, and with conflicts there is one for each run of changed blocks and choosing the main line gives the main line back.
A wrong answer is a failed request. The two sides change blocks next to each other but never the same one.

| Blocks | 1% changed by each | 10% | 50% |
|---|---|---|---|
| 1 000 | 6 ms | 6 ms | 35 ms |
| 10 000 | 4 ms | 65 ms | 68 ms |
| 50 000 | 32 ms | 100 ms | 130 ms |

The figures are the 95th percentile of the request, with no failures. Memory stays within 35 MB of growth of the heap at 50 000 blocks.
The budgets are 200, 500 and 1500 ms for 1 000, 10 000 and 50 000 blocks, so a merge that takes seconds, or one that is wrong, fails.

### Scenario 4: versions saved one after the other

`POST /snapshot` makes one edit to a paragraph and saves a version, in a project in a file, with the real version service.
The document keeps its size, so a save that takes longer is slowed by the history and not by the text. (A first run that added a paragraph
with each save went from 11 ms to 32 ms. That was the document growing from 1 000 to 3 900 blocks, and not the history.)

| Saves | First tenth, median | Last tenth, median | Ratio | p95 of a save |
|---|---|---|---|---|
| 3 667 | 10.0 ms | 10.3 ms | 1.03 | 17 ms |

The time of a save does not grow with the history. After every 500 saves `snapshot-growth` asks for the summary and fails when the last tenth is more than 3 times slower than the first.
The budget of a save is 200 ms at the 95th percentile.

```bash
pnpm --filter @marktwain/bench server &
locust -f tools/bench/locustfile.py MergeUser --headless -u 1 -r 1 -t 45s --csv out/merge
python3 tools/bench/check_budgets.py out/merge_stats.csv
locust -f tools/bench/locustfile.py SnapshotUser --headless -u 1 -r 1 -t 150s --csv out/snapshot
python3 tools/bench/check_budgets.py out/snapshot_stats.csv
```
