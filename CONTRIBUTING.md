# TIP
Before doing any meaningful work or even investigating [please create an issue for discussion](https://github.com/TypeStrong/atom-typescript/issues) so we don't have duplicate work and I don't step on your toes.

# Grunt Tasks
## Building
`grunt build`

## Developing
`grunt`

## Publishing
`apm publish minor`

# Setup Dev Machine
Best solution I have found is to simply clone at your packages directory. On Windows:

```bash
cd %HOMEPATH%\.atom\packages
git clone https://github.com/TypeStrong/atom-typescript.git
```

# Various

## Architecture
We wrap the `languageService` + our custom `languageServiceHost` + [`projectFile`](https://github.com/TypeStrong/atom-typescript/blob/master/docs/tsconfig.md) into a `Project` (code in `Project.ts` in the `lang` folder). The functions that interact with this `project` are exposed from `projecService` ([the query / response section](https://github.com/TypeStrong/atom-typescript/blob/6fbf860eaf971baa3aca939626db553898cb40db/lib/main/lang/projectService.ts#L58-L244)). `projectService` is where you would add new features that interact with the language service. All this code is `sync` and can be tested / run on any node instance. Be careful not to *leave* `console.log` in this code (as we use `stdio` to make this code `async`) or use `atom` specific APIs (as it may not be in the UI thread).

We make this code `async`(and promise based) by:
* **Single line:** (e.g. `export var echo = childQuery(projectService.echo);`) for every new call to get good compile time safety ([see the code in `parent.ts`](https://github.com/TypeStrong/atom-typescript/blob/b0a862cf209d18982875d5c38e3a655594316e9a/lib/worker/parent.ts#L148-L158)).

### Additional Notes:
* `childQuery` takes the signature of the `sync` function from `projectService` of the form `Query->Response` and automatically creates an `async` function of the form `Query->Promise<Response>`. The function body from `projectService` is not used, just the function *name* and the *type information* is.
* We automatically add all functions exported from `projectService` in the list of functions that the child uses to respond to by name. ([see code in `child.ts`](https://github.com/TypeStrong/atom-typescript/blob/b0a862cf209d18982875d5c38e3a655594316e9a/lib/worker/child.ts#L48-L51)). Here we are not concerned with the *type information*. Instead we will actively *call the function* added to responders by *name*.
* We spawn a separate `atom` (or `node` on windows) instance and use `ipc` ([see code in `parent.ts`](https://github.com/TypeStrong/atom-typescript/blob/b0a862cf209d18982875d5c38e3a655594316e9a/lib/worker/parent.ts#L4-L141)). Also [reason for not using WebWorkers](https://github.com/atom/atom-shell/issues/797).

Advantage: you only need to define the query/response interface once (in `projectService.ts`) and write it in a testable `sync` manner. The parent code is never out of sync from the function definition (thanks to `childQuery`). Adding new functions is done is a typesafe way as you would write any other sync function + additionally using only one additional line of code in `parent.ts` (`childQuery`).

## Debugging
There are *lots of ways* to do this. All of these are equivalent IMHO:

* You can call `projectService` in `sync` from the UI thread if you need to and debug using atom's built in tools (`ctrl+alt+i`). That's what we've been doing.
* As mentioned the code in `projectService` is sync and testable *very* easily using just a node testing framework or simple node `require` scripts.
* You can spawn the child with `node` (don't use `atom` although it might work) with `--debug` flag enabled ([see code](https://github.com/TypeStrong/atom-typescript/blob/a90bd067bba8656e41c6e1ed3c1bdea06118274f/lib/worker/parent.ts#L24)) and use something like `node-inspector`.

## Getting the language service
The TypeScript Language service : https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API

## Depending upon other atom packages
There isn't a documented way : https://discuss.atom.io/t/depending-on-other-packages/2360/16

So using https://www.npmjs.com/package/atom-package-dependencies

```js
var apd = require('atom-package-dependencies');

var mdp = apd.require('markdown-preview');
mdp.toggle();

// Also
apd.install();
```

## Showing errors in atom
Done using the `linter` plugin. If you think about it. TypeScript is really just a super powerful version of `jshint` and that is the reason to use `linter` for errors.

You need to inherit from `Linter` class from the `linter`: http://atomlinter.github.io/Linter/
```js
var linterPath = atom.packages.getLoadedPackage("linter").path
var Linter:LinterClass = require linterPath+"/lib/linter"
```
Just look at `linter.ts` in our code.
