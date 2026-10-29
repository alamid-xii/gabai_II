import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Independent of the shell's working directory; override only for isolated tests/storage mounts.
export const documentPublicDirectory = path.resolve(process.env.DOCUMENT_PUBLIC_DIR || fileURLToPath(new URL('../public/', import.meta.url)));
