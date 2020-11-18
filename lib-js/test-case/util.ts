import { SpecDirectory } from "../spec-directory"
import { Compiler } from "../compiler"

interface SuccessResult {
  isSuccess: true
  output: string
  warning?: string
}

interface ErrorResult {
  isSuccess: false
  error: string
}

/** A result of executing a sass compiler */
export type SassResult = SuccessResult | ErrorResult

export function getExpectedFiles(impl?: string) {
  return impl
    ? [`output-${impl}.css`, `warning-${impl}`, `error-${impl}`]
    : ["output.css", "warning", "error"]
}

// Overwrite the set of results to be equal to the provided result
export async function overwriteResults(
  dir: SpecDirectory,
  actual: SassResult,
  impl?: string
) {
  const [outputFile, warningFile, errorFile] = getExpectedFiles(impl)
  if (actual.isSuccess) {
    await Promise.all([
      dir.writeFile(outputFile, actual.output),
      actual.warning
        ? dir.writeFile(warningFile, actual.warning)
        : dir.removeFile(warningFile),
      dir.removeFile(errorFile),
    ])
  } else {
    await Promise.all([
      dir.writeFile(errorFile, actual.error),
      dir.removeFile(outputFile),
      dir.removeFile(warningFile),
    ])
  }
}
