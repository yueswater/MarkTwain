"""Load scenarios for the Typst build.

Run the server first:  pnpm --filter @marktwain/bench server
Then, for one scenario:
    locust -f tools/bench/locustfile.py LongThesisUser --headless -u 1 -r 1 -t 2m --csv out/long
    locust -f tools/bench/locustfile.py ConcurrentUsers --headless -u 8 -r 8 -t 2m --csv out/concurrent
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
