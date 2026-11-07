// Shared whole-app limits. The separate read-only diagnostic keeps its own cap.
export const MAX_FILE_MB = 200;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_SELECTION_MB = 200;
export const MAX_SELECTION_BYTES = MAX_SELECTION_MB * 1024 * 1024;
