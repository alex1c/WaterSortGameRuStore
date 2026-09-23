# Solver notes

The solver uses bounded depth-first search. It stores canonical keys with all
tubes sorted by deterministic serialized contents, which safely removes tube
order symmetry because tubes are interchangeable. Search nodes retain their
real board and real indices, so returned moves apply directly to the caller's
board.

It prunes full monochrome tubes, duplicate empty-destination choices, and an
immediate reverse only when that reverse restores the previous canonical state.
These are completeness-preserving reductions. A completed search with no
solution is `solved: false, cutoff: false` (UNSOLVABLE); hitting a state,
depth, or time guard sets `cutoff: true` and is not an unsolvability proof.

The DFS result is intentionally non-optimal (`solutionIsOptimal: false`) except
for an already-solved board. This bounds memory for generation and mobile hint
requests; a future small-board IDDFS can provide minimum-move star ratings.

