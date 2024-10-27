import fs from "fs/promises"
import * as path from "path"

export async function fileExistsAtPath(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath)
		return true
	} catch (error) {
        console.error(error)
		return false
	}
}