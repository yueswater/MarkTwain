"""Load scenarios for the Typst build and for the versions.

Run the server first:  pnpm --filter @marktwain/bench server
Then, for one scenario:
    locust -f tools/bench/locustfile.py LongThesisUser --headless -u 1 -r 1 -t 2m --csv out/long
    locust -f tools/bench/locustfile.py ConcurrentUsers --headless -u 8 -r 8 -t 2m --csv out/concurrent
    locust -f tools/bench/locustfile.py MergeUser --headless -u 1 -r 1 -t 45s --csv out/merge
    locust -f tools/bench/locustfile.py SnapshotUser --headless -u 1 -r 1 -t 150s --csv out/snapshot
"""
from locust import HttpUser, between, task


class BuildUser(HttpUser):
    abstract = True
    host = "http://localhost:8787"

    def build(self, shape: str, name: str):
        with self.client.post(f"/build?shape={shape}", name=name, catch_response=True, timeout=600) as response:
            if response.status_code != 200:
                response.failure(f"{response.status_code}: {response.text[:200]}")


class LongThesisUser(BuildUser):
    """One writer compiling a thesis of about 100 pages."""

    wait_time = between(1, 2)

    @task
    def long_thesis(self):
        self.build("long", "long-thesis")


class ConcurrentUsers(BuildUser):
    """Many writers compiling at the same time, mostly small edits and some long builds."""

    wait_time = between(0.5, 1.5)

    @task(6)
    def small(self):
        self.build("small", "small-thesis")

    @task(3)
    def medium(self):
        self.build("medium", "medium-thesis")

    @task(1)
    def long_thesis(self):
        self.build("long", "long-thesis")


class MergeUser(HttpUser):
    """Scenario 3: a merge of two branches that each change 1, 10 and 50 percent of the blocks of a document of 1000, 10000 and 50000 blocks.

    The server checks the result as the unit tests do and answers 500 when it is wrong, so a wrong merge is a failure of the request.
    """

    host = "http://localhost:8787"
    wait_time = between(0.1, 0.3)

    def merge(self, blocks: int, percent: int):
        with self.client.post(f"/merge?blocks={blocks}&percent={percent}", name=f"merge-{blocks}-{percent}", catch_response=True, timeout=600) as response:
            if response.status_code != 200:
                response.failure(f"{response.status_code}: {response.text[:200]}")

    @task
    def merges(self):
        for blocks in (1000, 10000, 50000):
            for percent in (1, 10, 50):
                self.merge(blocks, percent)


class SnapshotUser(HttpUser):
    """Scenario 4: versions saved one after the other in one project, up to several thousand of them.

    Every request is one save. After every 500 saves the growth of the time of a save is asked for, and it counts as a failure when the last
    tenth of the saves is much slower than the first tenth, which would mean that a save reads the whole history.
    """

    host = "http://localhost:8787"
    wait_time = between(0, 0.05)
    max_ratio = 3.0
    check_every = 500

    def on_start(self):
        self.saves = 0
        self.client.post("/snapshot/reset", name="snapshot-reset")

    @task
    def save(self):
        self.client.post("/snapshot?blocks=1000", name="snapshot-save")
        self.saves += 1
        if self.saves % self.check_every == 0:
            with self.client.get("/snapshot/summary", name="snapshot-growth", catch_response=True) as response:
                ratio = response.json().get("ratio") if response.status_code == 200 else None
                if ratio is None or ratio > self.max_ratio:
                    response.failure(f"the last saves took {ratio} times as long as the first, the limit is {self.max_ratio}")
