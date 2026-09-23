# ForestMusic game engine

Phase 2 keeps the game engine independent from React Native, Expo, storage,
and advertising. The Phase 1 UI is intentionally not integrated yet.

## Core

`Tube` is a color array with index `0` at the bottom and the last element at
the top. Capacity is four. A pour always transfers the maximum contiguous
top-color group that fits. Invalid moves are immutable no-ops. A board is
solved only when every tube is empty or full monochrome; a partial monochrome
tube is not solved.

Use the public barrel in `src/game` or the focused modules:

```ts
getLegalMoves(board)
applyMove(board, move)
isSolved(board)
solve(board, options)
getHint(board, options)
generateLevel(config)
```

`serializeBoard` is deterministic JSON. `deserializeBoard` validates the
capacity and color values and returns a defensive copy.

## Solver

The solver is bounded depth-first search with a visited set. Tube-order
symmetry is removed by sorting deterministic tube serializations for the
canonical key, while search nodes retain real tube indices so returned moves
are directly executable. It also skips full monochrome sources, duplicate
empty destinations, and only an immediate reverse that restores the exact
parent state.

The result is non-optimal by design (`solutionIsOptimal: false`) except for an
already-solved board. If search exhausts the finite state space,
`solved: false, cutoff: false` means UNSOLVABLE. If a state, depth, or time
guard fires, `cutoff: true` means SEARCH CUTOFF and must not be treated as an
unsolvable result.

## Generator and difficulty

The seeded RNG is a small integer PRNG and never uses `Math.random()`. A
candidate is built from an exact multiset of four layers per color, packed into
full tubes with the requested empty tubes. The candidate pipeline is:

`candidate → structural validation → solver → difficulty/trivial checks → accept`

No candidate is playable unless the solver confirms it solved without cutoff.
The generator rejects solved/almost-empty decisions, excess completed tubes,
short solutions, duplicates only at the batch layer, and solver cutoffs.

`DifficultyMetrics` records color/tube/empty counts, solution length, explored
states, initial branching, average branching, dead ends, completed tubes, and a
deterministic heuristic score. BEGINNER/EASY/MEDIUM/HARD/EXPERT thresholds are
an initial calibration heuristic, not a scientific player-skill model.

`runBulkGenerationQa` reports attempted candidates, accepted/rejected levels,
cutoffs, solution-length statistics, explored-state statistics, and worst-case
search cost for deterministic seed batches.

