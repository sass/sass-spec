const { execSync } = require("child_process")

// get the binary to execute
const bin = process.argv[2]

const input = `
.button {
  color black;
}
`
// TODO lol this is probably unsafe
console.log(execSync(`${bin} -s`, { input, encoding: "utf-8" }))