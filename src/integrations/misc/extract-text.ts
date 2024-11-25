import * as path from "path";
import fs from "fs/promises";
import { isBinaryFile } from "isbinaryfile";

/**
 * Reads the content of any file and returns it as a string.
 * Throws an error if the file is binary or cannot be read.
 *
 * @param filePath - The path to the file.
 * @returns The content of the file as a string.
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
    try {
        // Check if the file exists
        await fs.access(filePath);
    } catch (error) {
        throw new Error(`File not found: ${filePath}`);
    }

    // Get the file extension (not strictly necessary but might be useful for debugging/logging)
    const fileExtension = path.extname(filePath).toLowerCase();

    try {
        // Check if the file is binary
        const isBinary = await isBinaryFile(filePath).catch(() => false);

        if (!isBinary) {
            // Read and return the content of the file as text
            return await fs.readFile(filePath, "utf8");
        } else {
            throw new Error(`Cannot read text from binary file type: ${fileExtension}`);
        }
    } catch (error) {
        throw new Error(`Error reading file '${filePath}': ${error.message}`);
    }
}
