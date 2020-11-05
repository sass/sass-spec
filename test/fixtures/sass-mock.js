const yaml = require("js-yaml")
const fs = require("fs")
// A mock sass spec that:
// - takes the input as yaml
// - prints to stdout and stderr
// - returns `status` as the error code
if (process.argv.length <= 2) {
  console.error("Invalid number of arguments")
  process.exit(1)
}

const filename = process.argv[process.argv.length - 1]
const contents = fs.readFileSync(filename, { encoding: "utf-8" })
const opts = yaml.safeLoad(contents)

if (opts.stdout) {
  process.stdout.write(opts.stdout)
}
if (opts.stderr) {
  process.stderr.write(opts.stderr)
}
process.exit(opts.status || 0)
