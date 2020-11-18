import { fromContents } from "../../lib-js/spec-directory"

describe("SpecDirectory options", () => {
  it("works in the basic case", async () => {
    const dir = await fromContents(
      `
<===> options.yml
:todo:
  - dart-sass
:ignore_for:
  - libsass
:precision: 3
`.trimStart()
    )
    expect(await dir.options()).toMatchObject({
      ":todo": ["dart-sass"],
      ":ignore_for": ["libsass"],
      ":precision": 3,
    })
  })

  it("overrides parent options correctly", async () => {
    const dir = await fromContents(
      `
<===> options.yml
:todo:
  - dart-sass
:ignore_for:
  - libsass
:precision: 3
<===> child/options.yml
:todo:
  - sass-mock
:ignore_for:
  - dart-sass
:warning_todo:
  - libsass
:precision: 4
`.trimStart()
    )
    const childDir = await dir.atPath("child")
    expect(await childDir.options()).toMatchObject({
      ":todo": ["dart-sass", "sass-mock"],
      ":ignore_for": ["libsass", "dart-sass"],
      ":warning_todo": ["libsass"],
      ":precision": 4,
    })
  })

  it("overrides more than one layer deep", async () => {
    const dir = await fromContents(
      `
<===> options.yml
:precision: 3
<===> deep/child/options.yml
:precision: 4
`.trimStart()
    )
    const noOptsChild = await dir.atPath("deep")
    expect(await noOptsChild.options()).toMatchObject({ ":precision": 3 })
    const deepChild = await dir.atPath("deep/child")
    expect(await deepChild.options()).toMatchObject({ ":precision": 4 })
  })
})
