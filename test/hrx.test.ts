import path from "path"
import fs from "fs"
import tap from "tap"
import { withArchive } from "../lib-js/hrx"

tap.test("withArchive", (t) => {
  t.test("success case", async (t) => {
    let directory: string
    await withArchive(
      // TODO handle relative paths?
      path.resolve(__dirname, "./fixtures/basic.hrx"),
      async (dir) => {
        directory = dir
        t.ok(fs.existsSync(dir), "creates directory")
        t.ok(
          fs.existsSync(path.resolve(dir, "input.scss")),
          "creates input file"
        )
        t.ok(
          fs.existsSync(path.resolve(dir, "output.css")),
          "creates output file"
        )
      }
    )
    t.notOk(fs.existsSync(directory!), "directory is deleted at the end")
    t.end()
  })

  t.test("error case", async (t) => {
    let directory: string
    // TODO do we expect it to propagate on error?
    try {
      await withArchive(
        path.resolve(__dirname, "./fixtures/basic.hrx"),
        async (dir) => {
          directory = dir
          throw new Error("Error in archive callback")
        }
      )
    } catch (e) {}
    t.notOk(fs.existsSync(directory!), "directory is deleted on error")
    t.end()
  })

  t.todo("deletes the directory if the process exits", (t) => {
    t.end()
  })

  t.todo("works even if the directory exists already", (t) => {
    t.end()
  })

  t.todo(
    "writes contents to archive file if a `write` option is enabled",
    (t) => {
      t.end()
    }
  )

  t.end()
})
