// The parts of the package that work on sequences and need nothing of Node, so that the front end can use them without bringing in the hashing.
export { align, type Match } from "./align";
export { diffBlocks, type BlockChange } from "./diff";
export { applyHunks, hunksBetween, type Hunk } from "./hunks";
