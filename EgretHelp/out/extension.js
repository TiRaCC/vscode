"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const util_1 = require("util");
const vscode = require("vscode");
var helpAuthor;
var projectName;
let xml2js = require('xml2js');
var parser = new xml2js.Parser({ explicitArray: false });
function activate(context) {
    projectName = context.workspaceState.get("project");
    if (util_1.isNullOrUndefined(projectName)) {
        projectName = "slagman";
    }
    helpAuthor = context.workspaceState.get("author");
    if (util_1.isNullOrUndefined(helpAuthor)) {
        helpAuthor = "TiRa";
    }
    vscode.window.setStatusBarMessage('Hello ' + helpAuthor);
    let disposable = vscode.commands.registerCommand('HelpTools.CreateNewClass', (url) => {
        vscode.window.showInputBox({
            prompt: "输入生成类名"
        }).then(className => {
            if (className === undefined || className === "") {
                return;
            }
            className = convertUnderline(className, true);
            CreateNewClass(url.path + "/" + className + ".ts", className);
        });
    });
    context.subscriptions.push(disposable);
    let skinFolderUri = vscode.Uri.parse(rootUrl() + "/resource/skins");
    disposable = vscode.commands.registerCommand('HelpTools.CreateNewSkinClass', (url) => {
        vscode.window.showInputBox({ prompt: "输入生成类名" }).then(className => {
            if (className === undefined || className === "") {
                return;
            }
            className = convertUnderline(className, true);
            vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false, defaultUri: skinFolderUri, openLabel: "选择一个exml文件" }).then(function (skinUri) {
                if (skinUri === undefined) {
                    return;
                }
                if (skinUri[0].path.substring(skinUri[0].path.length - 5) !== ".exml") {
                    return;
                }
                let skinName = skinUri[0].path.slice(skinUri[0].path.lastIndexOf("/") + 1);
                skinName = skinName.split(".")[0];
                createNewSkinClass(skinUri[0], skinName, url.path + "/" + className + ".ts", className);
            });
        });
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('HelpTools.setAuthor', (uri) => {
        vscode.window.showInputBox({
            prompt: "输入作者"
        }).then(authorName => {
            if (authorName === undefined) {
                return;
            }
            context.workspaceState.update("author", authorName);
            helpAuthor = authorName;
        });
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('HelpTools.setProject', (uri) => {
        vscode.window.showInputBox({
            value: projectName,
            prompt: "输入项目名"
        }).then(name => {
            if (name === undefined) {
                return;
            }
            context.workspaceState.update("project", name);
            projectName = name;
        });
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
function CreateNewClass(url, className) {
    let date = new Date();
    let dateStr = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    let info = `
/**
 * @author ${helpAuthor}
 * @create ${dateStr}
 */
export class ${className} {

}
`;
    vscode.workspace.fs.writeFile(vscode.Uri.parse(url), stringToUint8Array(info)).then(res => {
        vscode.window.showTextDocument(vscode.Uri.file(url));
    });
}
function createNewSkinClass(url, skinName, classUrl, className) {
    return __awaiter(this, void 0, void 0, function* () {
        let subNodes = {};
        let idNodes = yield analysisTarget(url, false, subNodes);
        let skinItem = { content: "", importItem: [], declareInfo: "", eventInfo: "", funInfo: "", classInfo: "" };
        skinItem = yield traceChild(skinItem, idNodes, false, subNodes);
        let date = new Date();
        let dateStr = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        let info = `import {UIComponent, setSkin${skinItem.importItem.length > 0 ? ", " + skinItem.importItem.join(", ") : ""}} from "solar";
import {box} from "../../common/box";
/**
 * @author ${helpAuthor}
 * @create ${dateStr}
 */
export class ${className} extends UIComponent {
	constructor() {
		super();
		setSkin(this, "${skinName}");
	}
${skinItem.declareInfo}
	onReady() {
${skinItem.eventInfo}
	}
${skinItem.funInfo}

	static show() {
		box(new ${className}());
	}
}

${skinItem.classInfo}
`;
        vscode.workspace.fs.writeFile(vscode.Uri.parse(classUrl), stringToUint8Array(info)).then(() => {
            vscode.window.showTextDocument(vscode.Uri.file(classUrl));
        });
    });
}
function Uint8ArrayToString(fileData) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString;
}
function stringToUint8Array(str) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array;
}
//将下划线命名转换为驼峰式命名
function convertUnderline(str, ucFirst = false) {
    while (str.indexOf("_") !== -1) {
        str = str.slice(0, str.indexOf("_")) + str.slice(str.indexOf("_") + 1, str.indexOf("_") + 2).toUpperCase() + str.slice(str.indexOf("_") + 2);
    }
    if (ucFirst) {
        str = str.slice(0, 1).toUpperCase() + str.slice(1);
    }
    return str;
}
//解析子集
function analysisChild(data, isItem = false, subNodes) {
    let idNodes = [];
    let prevListID;
    let isRender;
    let findChildFun = function (parent, type) {
        if (typeof parent !== "object") {
            return;
        }
        for (var tempProperty in parent) {
            if (tempProperty === "__proto__" ||
                tempProperty === "e:ArrayCollection" ||
                tempProperty === "e:layout" ||
                tempProperty === "solar:skinName") {
                continue;
            }
            if (tempProperty === "e:itemRendererSkinName") {
                isRender = true;
            }
            var tempChild = parent[tempProperty];
            if (tempChild === null || tempChild === undefined) {
                continue;
            }
            if (tempChild.id !== null && tempChild.id !== undefined) {
                if (tempChild.id === "rect" || tempChild.id === "contentNode") {
                    continue;
                }
                let data = { type: type, id: tempChild.id };
                if (!isItem && tempChild.itemRendererSkinName) {
                    data.skin = tempChild.itemRendererSkinName;
                }
                else if (!isItem && (type === "solar:Component" || type === "e:Component") && tempChild.skinName) {
                    data.skin = tempChild.skinName;
                }
                if (isRender && prevListID && subNodes) {
                    subNodes[prevListID] = subNodes[prevListID] || [];
                    subNodes[prevListID].push(data);
                }
                else {
                    idNodes.push(data);
                }
                if (!prevListID && !isItem && (type === "e:List" || type === "solar:List") && !tempChild.itemRendererSkinName) {
                    prevListID = tempChild.id;
                }
            }
            if (tempProperty === "e:List" || tempProperty === "solar:List") {
                prevListID = "";
                isRender = false;
                findChildFun(tempChild, tempProperty);
                prevListID = "";
                isRender = false;
            }
            else if (tempProperty.indexOf('e:') === 0 || tempProperty.indexOf("solar:") === 0 || tempProperty.indexOf("ns1:") === 0) {
                findChildFun(tempChild, tempProperty);
            }
            else {
                findChildFun(tempChild, type);
            }
        }
    };
    findChildFun(data, "e:skin");
    idNodes.sort((a, b) => {
        if (a.skin && !b.skin) {
            return -1;
        }
        else if (!a.skin && b.skin) {
            return 1;
        }
        else {
            return 0;
        }
    });
    return idNodes;
}
function analysisTarget(url, isItem = false, subNodes) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = yield vscode.workspace.fs.readFile(url);
        let json = yield parseString(Uint8ArrayToString(data));
        return analysisChild(json, isItem, subNodes);
    });
}
function parseString(str) {
    return __awaiter(this, void 0, void 0, function* () {
        let resultData;
        yield parser.parseString(str, function (err, result) {
            resultData = result;
        });
        return resultData;
    });
}
function getSkinUrl(skinName) {
    return __awaiter(this, void 0, void 0, function* () {
        let uri = vscode.Uri.parse(rootUrl() + "/resource/default.thm.json");
        let data = yield vscode.workspace.fs.readFile(uri);
        let json = JSON.parse(Uint8ArrayToString(data));
        let arr = json.exmls;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].indexOf(skinName + ".exml") > 0) {
                return vscode.Uri.parse(rootUrl() + "/" + arr[i]);
            }
        }
    });
}
function traceChild(skinItem, idNodes, isItem = false, subNodes) {
    return __awaiter(this, void 0, void 0, function* () {
        let skinArr = [];
        for (let i = 0, len = idNodes.length; i < len; i++) {
            let element = idNodes[i];
            let _arr = [];
            if (element.skin && skinArr.indexOf(element.skin) === -1) {
                skinArr.push(element.skin);
                let _skinUrl = yield getSkinUrl(element.skin);
                if (_skinUrl !== undefined) {
                    let _childNodes = yield analysisTarget(_skinUrl, true);
                    _arr.push(traceChild({ content: "", importItem: [], declareInfo: "", eventInfo: "", funInfo: "", classInfo: "" }, _childNodes, true));
                }
            }
            else if (subNodes && subNodes[element.id]) {
                element.skin = element.id;
                let _childNodes = subNodes[element.id];
                _arr.push(traceChild({ content: "", importItem: [], declareInfo: "", eventInfo: "", funInfo: "", classInfo: "" }, _childNodes, true));
            }
            let _childItem;
            let _arr1 = yield Promise.all(_arr);
            if (_arr1 && _arr1.length > 0 && _arr1[0]) {
                _childItem = _arr1[0];
                for (let i = 0, len = _childItem.importItem.length; i < len; i++) {
                    if (skinItem.importItem.indexOf(_childItem.importItem[i]) === -1) {
                        skinItem.importItem.push(_childItem.importItem[i]);
                    }
                }
            }
            else {
                _childItem = undefined;
            }
            let eType = "";
            if ((element.type === "solar:Component" || element.type === "e:Component") && element.skin) {
                eType = "IExml" + element.skin;
            }
            else if (element.type.indexOf("e:") === 0) {
                eType = "eui." + element.type.substr(2);
                if (skinItem.importItem.indexOf("Item") === -1) {
                    skinItem.importItem.push("Item");
                }
            }
            else if (element.type.indexOf("ns1:") === 0) {
                eType = element.type.substr(4);
            }
            else {
                eType = element.type.substr(6);
                if (skinItem.importItem.indexOf(eType) === -1) {
                    skinItem.importItem.push(eType);
                }
            }
            if (skinItem.declareInfo !== "") {
                skinItem.declareInfo += "\n";
            }
            skinItem.declareInfo += `	private ${element.id}: ${eType};`;
            if (eType === "Button" || eType === "eui.Button") {
                if (skinItem.eventInfo !== "") {
                    skinItem.eventInfo += "\n";
                }
                let FuncName = "on" + convertUnderline(element.id, true) + 'Handler';
                skinItem.eventInfo += `		this.tap(this.${element.id}, this.${FuncName}, this);`;
                if (skinItem.funInfo !== "") {
                    skinItem.funInfo += "\n";
                }
                skinItem.funInfo += `	private ${FuncName}(): void {
				
	}`;
            }
            else if (element.skin) {
                if (element.type === "solar:Component" || element.type === "e:Component") {
                    if (_childItem) {
                        if (skinItem.classInfo !== "") {
                            skinItem.classInfo += "\n";
                        }
                        while (_childItem.declareInfo.indexOf("private ") !== -1) {
                            _childItem.declareInfo = _childItem.declareInfo.replace("private ", "");
                        }
                        skinItem.classInfo += `interface ${eType} {
${_childItem.declareInfo}
}`;
                    }
                }
                else {
                    if (skinItem.eventInfo !== "") {
                        skinItem.eventInfo += "\n";
                    }
                    let className = `${convertUnderline(element.skin, true)}ItemRenderer`;
                    skinItem.eventInfo += `		this.${element.id}.itemRenderer = ${className};`;
                    if (_childItem) {
                        if (skinItem.classInfo !== "") {
                            skinItem.classInfo += "\n";
                        }
                        skinItem.classInfo += `class ${className} extends Item {
${_childItem.declareInfo}
	onDataUpdate(data) {
		if (data) {
								
		}
	}
${_childItem.eventInfo ? `	onReady() {
${_childItem.eventInfo}
	}` : ""}
${_childItem.funInfo}
}`;
                    }
                }
            }
        }
        return skinItem;
    });
}
function rootUrl() {
    let rootUrl = vscode.workspace.rootPath;
    if ((rootUrl === null || rootUrl === void 0 ? void 0 : rootUrl.indexOf(projectName + "/" + projectName)) === -1) {
        rootUrl += "/" + projectName;
    }
    ;
    return rootUrl || "";
}
//# sourceMappingURL=extension.js.map