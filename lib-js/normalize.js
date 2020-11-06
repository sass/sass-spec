// Functions for normalizing the string output from spec results

function escape(text) {
  return text.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
}

// TODO move these to another file
// Run a particular spec and print the results as a tap test
function normalizeOutput(output = "") {
  return (
    output
      .replace(/\r?\n+/g, "\n")
      // Normalize paths
      // TODO what is expected here?
      .replace(/[-_/a-zA-Z0-9]+input\.scss/g, "input.scss")
      .trim()
  )
}

function extractErrorMessage(msg, impl) {
  if (impl === "dart-sass") {
    return normalizeOutput(msg)
  }
  return normalizeOutput(msg)
    .split("\n")
    .find((line) => line.startsWith("Error:"))
}

function extractWarningMessages(msg) {
  if (impl === "dart-sass") {
    return normalizeOutput(msg)
  }
  // FIXME this (kinda) replicates behavior in the ruby runner, which is broken right now
  // and only prints out the first warning
  return normalizeOutput(msg)
    .split("\n")
    .find((line) => /^\s*(DEPRECATION )?WARNING/.test(line))
}

module.exports = {
  normalizeOutput,
  extractErrorMessage,
  extractWarningMessages,
}
