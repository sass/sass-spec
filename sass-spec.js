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

const impl = "dart-sass"
const rootDir = path.resolve("spec")
const testDir = "spec"
const bin = bins[impl]
// TODO this might ignore TODOs in a higher directory
iterateDir(testDir, { impl, rootDir, bin }, async (dir, opts) => {
  await runSpec(tap, dir, opts)
})

// async function timeTest() {
//   const start = Date.now()
//   await iterateDir(testDir, { impl, rootDir }, executeSpec)
//   const end = Date.now()
//   console.log((end - start) / 1000)
// }

// timeTest()
