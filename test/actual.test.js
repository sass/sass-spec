const tap = require("tap")

tap.test("getActualResult", async (t) => {
  t.todo("does not print to stderr")
  t.todo("populates only `output` on successful execution")
  t.todo("populates only `error` on execution failure")
  t.todo(
    "populates both `output` and `warning` on execution success with stderr content"
  )
  t.test("options", () => {
    t.todo("passes precision argument correctly")
    t.todo("passes indented argument correctly")
    t.todo("passes indented argument correctly for dart-sass/libsass")
    t.end()
  })
  t.end()
})
