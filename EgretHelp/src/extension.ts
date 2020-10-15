import * as vscode from 'vscode';
import { Uri } from 'vscode';
var helpAuthor: string | undefined;
var projectName: string | undefined;
let xml2js = require('xml2js');
var parser = new xml2js.Parser({ explicitArray: false });
export function activate(context: vscode.ExtensionContext) {
	projectName = context.workspaceState.get("project");
	if (!projectName) {
		projectName = "slagman";
	}
	helpAuthor = context.workspaceState.get("author");
	if (!helpAuthor) {
		helpAuthor = "TiRa";
	}
	vscode.window.setStatusBarMessage('Hello ' + helpAuthor);
	let disposable = vscode.commands.registerCommand('HelpTools.CreateNewClass', (url) => {
		vscode.window.showInputBox({ prompt: "InputClassName" }).then(className => {
			if (className === undefined || className === "") {
				return;
			}
			className = convertUnderline(className, true);
			CreateNewClass(url.path + "/" + className + ".ts", className);
		});
	});

	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('HelpTools.CreateNewSkinClass', (url: vscode.Uri) => {
		vscode.window.showInputBox({ prompt: "InputClassName" }).then(className => {
			if (className === undefined || className === "") {
				return;
			}
			className = convertUnderline(className, true);
			let modName = url.path.substr(url.path.lastIndexOf("/") + 1);
			let skinFolderUri = vscode.Uri.parse(rootUrl() + "/resource/skins/" + modName);
			vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false, defaultUri: skinFolderUri, openLabel: "选择一个exml文件" }).then(function (skinUri?: Uri[]): void {
				if (skinUri === undefined) {
					return;
				}
				if (skinUri[0].path.substring(skinUri[0].path.length - 5) !== ".exml") {
					return;
				}
				let skinName: string = skinUri[0].path.slice(skinUri[0].path.lastIndexOf("/") + 1);
				skinName = skinName.split(".")[0];
				createNewSkinClass(skinUri[0], skinName, url.path + "/" + className + ".ts", className);
			});
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('HelpTools.setAuthor', () => {
		vscode.window.showInputBox({ value: helpAuthor, prompt: "InputAuthor" }).then(authorName => {
			if (authorName === undefined) {
				return;
			}
			context.workspaceState.update("author", authorName);
			helpAuthor = authorName;
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('HelpTools.setProject', () => {
		vscode.window.showInputBox({ value: projectName, prompt: "InputProjectName" }).then(name => {
			if (name === undefined) {
				return;
			}
			context.workspaceState.update("project", name);
			projectName = name;
		});
	});
	context.subscriptions.push(disposable);
}

export function deactivate() { }
function CreateNewClass(url: string, className: string): void {
	let info = `
/**
 * @author ${helpAuthor}
 * @create ${getDateInfo()}
 */
export class ${className} {

}
`;
	vscode.workspace.fs.writeFile(vscode.Uri.parse(url), stringToUint8Array(info)).then(() => {
		vscode.window.showTextDocument(vscode.Uri.file(url));
	});
}

async function createNewSkinClass(url: vscode.Uri, skinName: string, classUrl: string, className: any): Promise<void> {
	let idNodes: IChildNodes[] = await analysisTarget(url);
	let skinItem: ISkinItem = await traceChild(idNodes);
	let info = `import {UIComponent, setSkin${skinItem.importItem.length > 0 ? ", " + skinItem.importItem.join(", ") : ""}} from "solar";
import {box} from "../../common/box";
/**
 * @author ${helpAuthor}
 * @create ${getDateInfo()}
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
}

function Uint8ArrayToString(fileData: Uint8Array) {
	var dataString = "";
	for (var i = 0; i < fileData.length; i++) {
		dataString += String.fromCharCode(fileData[i]);
	}
	return dataString;
}

function stringToUint8Array(str: string) {
	var arr = [];
	for (var i = 0, j = str.length; i < j; ++i) {
		arr.push(str.charCodeAt(i));
	}

	var tmpUint8Array = new Uint8Array(arr);
	return tmpUint8Array;
}
//将下划线命名转换为驼峰式命名
function convertUnderline(str: string, ucFirst = false): string {
	while (str.indexOf("_") !== -1) {
		str = str.slice(0, str.indexOf("_")) + str.slice(str.indexOf("_") + 1, str.indexOf("_") + 2).toUpperCase() + str.slice(str.indexOf("_") + 2);
	}
	if (ucFirst) {
		str = str.slice(0, 1).toUpperCase() + str.slice(1);
	}
	return str;
}
//解析子集
async function analysisJson(data: any, isMain: boolean = false) {
	let idNodes: IChildNodes[] = [];
	if (data["e:Skin"]) {
		data = data["e:Skin"];
	}
	for (let key in data) {
		if (key === "__proto__" ||
			key === "$" ||
			key === "e:ArrayCollection" ||
			key === "e:layout" ||
			key === "solar:skinName") {
			continue;
		}
		let item = data[key];
		if (item === null || item === undefined) {
			continue;
		}
		let _comType: number;
		if (Boolean(key === "e:Group" || key === "solar:Group" || key === "e:Scroller" || key === "solar:Scroller")) {
			_comType = comType.group;
		} else if (Boolean(key === "e:Component" || key === "solar:Component")) {
			_comType = comType.component;
		} else if (Boolean(key === "e:Button" || key === "solar:Button")) {
			_comType = comType.button;
		} else if (Boolean(key === "e:List" || key === "solar:List")) {
			_comType = comType.list;
		} else if (Boolean(key === "e:TabBar" || key === "solar:TabBar")) {
			_comType = comType.tab;
		} else {
			_comType = comType.normal;
		}
		let isArrItem: boolean = Boolean(item instanceof Array && item[0]);
		let items: Array<any>;
		if (isArrItem) {
			items = item;
		} else {
			items = [item];
		}
		for (let i = 0; i < items.length; i++) {
			let oneItem = items[i];
			if (oneItem && oneItem["$"] && oneItem["$"]["id"]) {
				let nodes: IChildNodes = { type: key, id: oneItem["$"]["id"], comType: _comType };
				if (nodes.id === "rect" || nodes.id === "contentNode") {
					continue;
				}
				if (_comType === comType.button && oneItem["$"]["notice"]) {
					continue;
				}
				if ((_comType === comType.list || _comType === comType.tab) && oneItem["$"]["itemRendererSkinName"]) {
					nodes.className = oneItem["$"]["itemRendererSkinName"];
					// if (nodes.className === "CommonItemIconSkin") {
					// 	nodes.className = "";
					// }
				} else if (_comType === comType.component && oneItem["$"]["skinName"]) {
					nodes.className = oneItem["$"]["skinName"];
					if (nodes.className === "CommonPlayerHeadSkin") {
						nodes.className = "";
					}
				} else if ((_comType === comType.list || _comType === comType.tab) && oneItem["e:itemRendererSkinName"]) {
					nodes.className = nodes.id;
					nodes.nodes = await analysisJson(oneItem["e:itemRendererSkinName"], true);
				} else if (_comType === comType.component && oneItem["solar:skinName"]) {
					nodes.className = nodes.id;
					nodes.nodes = await analysisJson(oneItem["solar:skinName"], true);
				} else if (_comType === comType.component && oneItem["e:skinName"]) {
					nodes.className = nodes.id;
					nodes.nodes = await analysisJson(oneItem["e:skinName"], true);
				}
				if (nodes.className) {
					if (!nodes.nodes) {
						let _skinUrl = await getSkinUrl(nodes.className);
						if (_skinUrl !== undefined) {
							nodes.nodes = await analysisTarget(_skinUrl);
						}
					}
					nodes.className = convertUnderline(nodes.className);
					if (_comType === comType.component) {
						nodes.className = "IExml" + nodes.className;
						nodes.type = nodes.className;
					} else {
						nodes.className = nodes.className + "ItemRenderer";
					}
				}
				nodes.type = nodes.type.replace("ns1:", "");
				nodes.type = nodes.type.replace("e:", "eui.");
				nodes.type = nodes.type.replace("solar:", "solar.");
				idNodes.push(nodes);
			}
			if (_comType === comType.group && oneItem) {
				idNodes = idNodes.concat(await analysisJson(oneItem));
			}
		}
	}
	if (isMain) {
		idNodes.sort((a: IChildNodes, b: IChildNodes) => {
			if (a.className && !b.className) {
				return -1;
			} else if (!a.className && b.className) {
				return 1;
			} else {
				return 0;
			}
		});
	}
	return idNodes;
}

async function analysisTarget(url: vscode.Uri) {
	let data = await vscode.workspace.fs.readFile(url);
	let json = await parseString(Uint8ArrayToString(data));
	return analysisJson(json, true);
}

async function parseString(str: string) {
	let resultData: any;
	await parser.parseString(str, function (err: any, result: any) {
		resultData = result;
	});
	return resultData;
}

async function getSkinUrl(skinName?: string) {
	let uri: vscode.Uri = vscode.Uri.parse(rootUrl() + "/resource/default.thm.json");
	let data = await vscode.workspace.fs.readFile(uri);
	let json = JSON.parse(Uint8ArrayToString(data));
	let arr: Array<string> = json.exmls;
	for (let i = 0; i < arr.length; i++) {
		if (arr[i].indexOf(skinName + ".exml") > 0) {
			return vscode.Uri.parse(rootUrl() + "/" + arr[i]);
		}
	}
}

function traceChild(idNodes: IChildNodes[]) {
	let skinItem: ISkinItem = { importItem: [], declareInfo: "", eventInfo: "", funInfo: "", classInfo: "" };
	for (let i: number = 0, len: number = idNodes.length; i < len; i++) {
		let element: IChildNodes = idNodes[i];
		if (skinItem.declareInfo !== "") {
			skinItem.declareInfo += "\n";
		}
		skinItem.declareInfo += `	private ${element.id}: ${element.type};`;
		if (element.comType === comType.button) {
			if (skinItem.eventInfo !== "") {
				skinItem.eventInfo += "\n";
			}
			if (skinItem.funInfo !== "") {
				skinItem.funInfo += "\n";
			}
			let FuncName = "on" + convertUnderline(element.id, true) + 'Handler';
			skinItem.eventInfo += `		this.tap(this.${element.id}, this.${FuncName}, this);`;
			skinItem.funInfo += `	private ${FuncName}(): void {
				
	}`;
		} else if (element.nodes) {
			let childItem: ISkinItem = traceChild(element.nodes);
			for (let j = 0; j < childItem.importItem.length; j++) {
				if (skinItem.importItem.indexOf(childItem.importItem[i])) {
					skinItem.importItem.push(childItem.importItem[i]);
				}
			}
			if (skinItem.classInfo !== "") {
				skinItem.classInfo += "\n";
			}
			if (element.comType === comType.component) {
				while (childItem.declareInfo.indexOf("private ") !== -1) {
					childItem.declareInfo = childItem.declareInfo.replace("private ", "");
				}
				skinItem.classInfo += `interface ${element.className} {
${childItem.declareInfo}
}`;
			} else {
				if (skinItem.importItem.indexOf("Item")) {
					skinItem.importItem.push("Item");
				}
				if (skinItem.eventInfo !== "") {
					skinItem.eventInfo += "\n";
				}
				skinItem.eventInfo += `		this.${element.id}.itemRenderer = ${element.className};`;
				skinItem.classInfo += `class ${element.className} extends Item {
${childItem.declareInfo}
	onDataUpdate(data) {
		if (data) {
								
		}
	}
${childItem.eventInfo ? `	onReady() {
${childItem.eventInfo}
	}`: ""}
${childItem.funInfo}
}`;

			}
			if (childItem.classInfo) {
				skinItem.classInfo += "\n";
				skinItem.classInfo += childItem.classInfo;
			}
		}
	}
	return skinItem;
}

function rootUrl(): string {
	let rootUrl = vscode.workspace.rootPath;
	if (rootUrl?.indexOf(projectName + "/" + projectName) === -1) {
		rootUrl += "/" + projectName;
	};
	return rootUrl || "";
}

function getDateInfo(): string {
	let date = new Date();
	let M: any = date.getMonth() + 1;
	let D: any = date.getDate();
	let H: any = date.getHours();
	let Min: any = date.getMinutes();
	let S: any = date.getSeconds();
	M = M >= 10 ? M : "0" + M;
	D = D >= 10 ? D : "0" + D;
	H = H >= 10 ? H : "0" + H;
	Min = Min >= 10 ? Min : "0" + Min;
	S = S >= 10 ? S : "0" + S;
	return date.getFullYear() + "-" + M + "-" + D + " " + H + ":" + Min + ":" + S;
}

enum comType {
	normal,
	group,
	component,
	button,
	list,
	tab,
}



interface IChildNodes {
	type: string;
	id: string;
	comType: number;
	className?: string;
	nodes?: IChildNodes[];
}

interface ISkinItem {
	importItem: Array<string>;//进入项
	declareInfo: string;//声明变量
	eventInfo: string;//事件内容
	funInfo: string;//方法内容
	classInfo: string;//新加类内容
}