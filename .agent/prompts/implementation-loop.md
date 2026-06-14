# Prompt Template: Implementation Loop

1. restate the requested outcome in concrete engineering terms
2. list assumptions, ambiguities, and tradeoffs that materially affect the change
3. define the success criteria as checks, tests, evals, or observable behavior
4. choose the smallest credible implementation that can satisfy those criteria
5. break the work into short steps
6. after each step, run or describe the next verification check
7. keep the diff surgical and remove only the unused artifacts created by your change
8. if a critical fact cannot be verified safely, stop and record what still needs confirmation
