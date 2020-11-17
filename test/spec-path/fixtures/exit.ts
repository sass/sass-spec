// A test script that exits in the middle of a a withRealFiles callback

import path from "path"
import { fromPath } from "../../../lib-js/spec-path"

console.log(process.argv)
const arg = process.argv[2] || "exit"

async function run() {
  const dir = await fromPath(path.resolve(__dirname, "./basic.hrx"))

  await dir.withRealFiles(async () => {
    console.log(arg)
    switch (arg) {
      case "SIGINT": {
        process.kill(process.pid, "SIGINT")
        break
      }
      case "exit": {
        process.exit(0)
      }
    }
  })
}

run()
