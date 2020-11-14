// Functions for normalizing the string output from spec results

export function escape(text: string) {
  return text.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
}

// Run a particular spec and print the results as a tap test
export function normalizeOutput(output = "") {
  return (
    output
      .replace(/\r?\n+/g, "\n")
      // Normalize paths
      // TODO what is expected here?
      .replace(/[-_/a-zA-Z0-9]+input\.scss/g, "input.scss")
      .trim()
  )
}

export function extractErrorMessage(msg: string, impl: string) {
  if (impl === "dart-sass") {
    return normalizeOutput(msg)
  }
  return (
    normalizeOutput(msg)
      .split("\n")
      .find((line) => line.startsWith("Error:")) ?? ""
  )
}

export function extractWarningMessages(msg: string, impl: string) {
  if (impl === "dart-sass") {
    return normalizeOutput(msg)
  }
  // FIXME this (kinda) replicates behavior in the ruby runner, which is broken right now
  // and only prints out the first warning
  return (
    normalizeOutput(msg)
      .split("\n")
      .find((line) => /^\s*(DEPRECATION )?WARNING/.test(line)) ?? ""
  )
}
