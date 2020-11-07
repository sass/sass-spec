const path = require("path")
const tap = require("tap")

const { iterateDir } = require("./lib-js/directory")
const { runSpec } = require("./lib-js/spec")

const bins = {
  "dart-sass": `${path.resolve(
    process.cwd(),
    "../dart-sass/bin/sass.exe"
  )} --no-unicode`,
  libsass: `${path.resolve(
    process.cwd(),
    "../libsass/sassc/bin/sassc"
  )} --style expanded`,
}

const impl = "libsass"
const rootDir = path.resolve("spec")
const testDir = "spec"
const bin = bins[impl]

function printResult(counts) {
  if (counts.fail > 0) {
    process.stdout.write("X")
  } else if (counts.todo > 0) {
    process.stdout.write("-")
  } else if (counts.skip > 0) {
    // do nothing
  } else {
    process.stdout.write(".")
  }
}
// TODO this might ignore TODOs in a higher directory
async function runAllTests() {
  const t = new tap.Test()

  const start = Date.now()
  await iterateDir(testDir, { impl, rootDir, bin }, async (dir, opts) => {
    const res = await runSpec(t, dir, opts)
    printResult(res.counts)
  })
  const end = Date.now()
  const time = (end - start) / 1000
  console.log(t.counts)
  // TODO how to just access this from the test object
  console.log(`Finished in ${time}s`)
}

runAllTests()
