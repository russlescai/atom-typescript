var path = require('path');
var fs = require('fs');
var apd = require('../../apd');
var errorView = require('./atom/errorView');
var autoCompleteProvider = require('./atom/autoCompleteProvider');
var tooltipManager = require('./atom/tooltipManager');
var atomUtils = require('./atom/atomUtils');
var commands = require('./atom/commands');
var onSaveHandler = require('./atom/onSaveHandler');
var debugAtomTs = require('./atom/debugAtomTs');
var typescriptGrammar = require('./atom/typescriptGrammar');
var _atom = require('atom');
var statusBar;
var statusBarMessage;
var editorWatch;
var autoCompleteWatch;
var parent = require('../worker/parent');
var atomConfig = require('./atom/atomConfig');
exports.config = atomConfig.schema;
function activate(state) {
    var linter = apd.require('linter');
    var acp = apd.require('autocomplete-plus');
    var projectManager = apd.require('project-manager');
    if (!projectManager) {
        atom.notifications.addInfo('AtomTS: project-manager not found. Running "apm install project-manager" for you.');
    }
    if (!linter || !acp || !projectManager) {
        apd.install(function () {
            atom.notifications.addSuccess("Some dependent packages were required for atom-typescript. These are now installed. Best you restart atom just this once.", { dismissable: true });
        });
        return;
    }
    parent.startWorker();
    atom.grammars.addGrammar(new typescriptGrammar.TypeScriptSemanticGrammar(atom.grammars));
    atom.workspace.onDidChangeActivePaneItem(function (editor) {
        if (atomUtils.onDiskAndTs(editor)) {
            var filePath = editor.getPath();
            parent.errorsForFile({ filePath: filePath }).then(function (resp) { return errorView.setErrors(filePath, resp.errors); });
        }
    });
    editorWatch = atom.workspace.observeTextEditors(function (editor) {
        var editorView = _atom.$(atom.views.getView(editor));
        tooltipManager.attach(editorView, editor);
        var filePath = editor.getPath();
        var ext = path.extname(filePath);
        if (ext == '.ts') {
            try {
                var onDisk = false;
                if (fs.existsSync(filePath)) {
                    onDisk = true;
                }
                errorView.start();
                debugAtomTs.runDebugCode({ filePath: filePath, editor: editor });
                var changeObserver = editor.onDidStopChanging(function () {
                    if (!onDisk) {
                        var root = { line: 0, ch: 0 };
                        errorView.setErrors(filePath, [{ startPos: root, endPos: root, filePath: filePath, message: "Please save file for it be processed by TypeScript", preview: "" }]);
                        return;
                    }
                    var text = editor.getText();
                    parent.updateText({ filePath: filePath, text: text }).then(function () { return parent.errorsForFile({ filePath: filePath }); }).then(function (resp) { return errorView.setErrors(filePath, resp.errors); });
                });
                var saveObserver = editor.onDidSave(function (event) {
                    onDisk = true;
                    filePath = event.path;
                    onSaveHandler.handle({ filePath: filePath, editor: editor });
                });
                var destroyObserver = editor.onDidDestroy(function () {
                    errorView.setErrors(filePath, []);
                    changeObserver.dispose();
                    saveObserver.dispose();
                    destroyObserver.dispose();
                });
            }
            catch (ex) {
                console.error('Solve this in atom-typescript', ex);
                throw ex;
            }
        }
    });
    commands.registerCommands();
}
exports.activate = activate;
function deactivate() {
    if (statusBarMessage)
        statusBarMessage.destroy();
    if (editorWatch)
        editorWatch.dispose();
    if (autoCompleteWatch)
        autoCompleteWatch.dispose();
    parent.stopWorker();
}
exports.deactivate = deactivate;
function serialize() {
    return {};
}
exports.serialize = serialize;
function deserialize() {
}
exports.deserialize = deserialize;
function provide() {
    return { providers: [autoCompleteProvider.provider] };
}
exports.provide = provide;
