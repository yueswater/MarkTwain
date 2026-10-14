"""Fails when a Locust run is over the budgets.

Usage:  python3 tools/bench/check_budgets.py out/long_stats.csv
"""
import csv
import json
import pathlib
import sys

budgets = json.loads((pathlib.Path(__file__).parent / "budgets.json").read_text())
failed = False
with open(sys.argv[1], newline="") as handle:
    for row in csv.DictReader(handle):
        name = row["Name"]
        budget = budgets.get(name)
        if not budget:
            continue
        requests = int(row["Request Count"])
        p95 = float(row["95%"])
        failure_rate = int(row["Failure Count"]) / requests if requests else 0
        ok = p95 <= budget["p95"] and failure_rate <= budget["failures"]
        print(f"{'ok ' if ok else 'FAIL'} {name}: p95 {p95:.0f} ms of {budget['p95']}, failures {failure_rate:.1%}, requests {requests}")
        failed |= not ok
sys.exit(1 if failed else 0)
