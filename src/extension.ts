import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
const archiver = require('archiver');
const { init, localize } = require("vscode-nls-i18n");

class RecentFilesTreeDataProvider implements vscode.TreeDataProvider<vscode.Uri> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.Uri | undefined | null | void> = new vscode.EventEmitter<vscode.Uri | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.Uri | undefined | null | void> = this._onDidChangeTreeData.event;

	private refreshTimeout: NodeJS.Timeout | undefined;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	// 添加节流刷新方法
	throttledRefresh(): void {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = setTimeout(() => {
			this.refresh();
		}, 1000); // 1 秒节流
	}

	async getTreeItem(element: vscode.Uri): Promise<vscode.TreeItem> {
		const treeItem = new vscode.TreeItem(
			element.fsPath.split(path.sep).pop() || '',
			vscode.TreeItemCollapsibleState.None
		);
		treeItem.command = {
			command: 'vscode.open',
			title: 'Open File',
			arguments: [element]
		};

		try {
			const stat = await fs.promises.stat(element.fsPath);
			const mtime = new Date(stat.mtimeMs);
			const now = new Date();
			const diffMs = now.getTime() - mtime.getTime();
			const diffDays = diffMs / (1000 * 60 * 60 * 24);
			if (mtime.toDateString() === now.toDateString()) {
				treeItem.description = ` \u21BB ${mtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
			} else if (diffDays < 7) {
				treeItem.description = ` \u21BB ${mtime.toLocaleDateString([], { month: '2-digit', day: '2-digit' })}`;
			}
		} catch (error) {
			console.error(`Error getting file stats for ${element.fsPath}:`, error);
		}

		return treeItem;
	}

	async getChildren(element?: vscode.Uri): Promise<vscode.Uri[]> {
		if (!vscode.workspace.workspaceFolders) {
			return [];
		}

		// 获取 compress.m01.ignore 配置
		const config = vscode.workspace.getConfiguration('compress');
		const ignorePattern = config.get<string>('m01.ignore', '');
		const regex = ignorePattern ? new RegExp(ignorePattern) : null;

		const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
		const files = await this.getFilesRecursively(workspaceRoot, regex); // 传递正则表达式
		const fileStats = await Promise.all(files.map(file => this.getFileStat(file)));
		const sortedFiles = fileStats.sort((a, b) => b.mtimeMs - a.mtimeMs).map(stat => vscode.Uri.file(stat.path));
		return sortedFiles;
	}

	private async getFilesRecursively(dir: string, regex: RegExp | null): Promise<string[]> {
		const entries = await fs.promises.readdir(dir, { withFileTypes: true });
		const files = await Promise.all(entries.map(entry => {
			const fullPath = path.join(dir, entry.name);

			// 忽略符合正则规则的文件或目录
			if (regex && regex.test(entry.name)) {
				console.log(`Ignoring file or directory: ${entry.name}`);
				return [];
			}

			return entry.isDirectory() ? this.getFilesRecursively(fullPath, regex) : [fullPath];
		}));
		return files.flat();
	}

	private async getFileStat(filePath: string): Promise<{ path: string; mtimeMs: number }> {
		const stat = await fs.promises.stat(filePath);
		return { path: filePath, mtimeMs: stat.mtimeMs };
	}
}

async function compressSelectedItems(selectedItems: vscode.Uri[], workspaceRoot: string) {
	const timestamp = new Date().toLocaleString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).replace(/[/,:]/g, '').replace(/[ ]/g, '_');
	const directoryName = path.basename(workspaceRoot);
	const outputPath = path.join(workspaceRoot, `${directoryName}_${timestamp}.zip`);
	const output = fs.createWriteStream(outputPath);

	const archive = archiver('zip', {
		zlib: { level: 9 }
	});

	output.on('close', () => {
		const sizeInBytes = archive.pointer();
		let sizeString = getSizeString(sizeInBytes);
		vscode.window.showInformationMessage(
			localize('compress.completed', outputPath, sizeString),
			localize('compress.openFolder', 'Open Folder')
		).then(selection => {
			if (selection === localize('compress.openFolder', 'Open Folder')) {
				vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
			}
		});
	});

	archive.on('error', (err: any) => {
		vscode.window.showErrorMessage(localize('compress.error', err.message));
	});

	archive.pipe(output);

	for (const item of selectedItems) {
		const relativePath = path.relative(workspaceRoot, item.fsPath);
		const stat = await fs.promises.stat(item.fsPath);
		if (stat.isDirectory()) {
			archive.directory(item.fsPath, relativePath);
		} else {
			archive.file(item.fsPath, { name: relativePath });
		}
	}

	await archive.finalize();
}
function getSizeString(sizeInBytes: number): string {
	let sizeString;
	if (sizeInBytes >= 1e9) {
		sizeString = (sizeInBytes / 1e9).toFixed(2) + ' GB';
	} else if (sizeInBytes >= 1e6) {
		sizeString = (sizeInBytes / 1e6).toFixed(2) + ' MB';
	} else if (sizeInBytes >= 1e3) {
		sizeString = (sizeInBytes / 1e3).toFixed(2) + ' KB';
	} else {
		sizeString = sizeInBytes + ' B';
	}
	return sizeString;
}

async function compressDirectoryWithIgnore(workspaceRoot: string) {
	const config = vscode.workspace.getConfiguration('compress');
	const ignorePattern = config.get<string>('m01.ignore', '');
	const regex = ignorePattern ? new RegExp(ignorePattern) : null;

	const directoryName = path.basename(workspaceRoot);
	const timestamp = new Date().toLocaleString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).replace(/[/,:]/g, '').replace(/[ ]/g, '_');
	const outputPath = path.join(workspaceRoot, `${directoryName}_${timestamp}.zip`);
	const output = fs.createWriteStream(outputPath);

	const archive = archiver('zip', {
		zlib: { level: 9 }
	});

	output.on('close', () => {
		const sizeInBytes = archive.pointer();
		let sizeString = getSizeString(sizeInBytes);
		vscode.window.showInformationMessage(
			localize('compress.completed', outputPath, sizeString),
			localize('compress.openFolder', 'Open Folder')
		).then(selection => {
			if (selection === localize('compress.openFolder', 'Open Folder')) {
				vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
			}
		});
	});

	archive.on('error', (err: any) => {
		vscode.window.showErrorMessage(localize('compress.error', err.message));
	});

	archive.pipe(output);

	async function addFilesToArchive(dir: string) {
		const entries = await fs.promises.readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (regex && regex.test(entry.name)) {

				continue;
			}

			if (entry.isDirectory()) {
				await addFilesToArchive(fullPath);
			} else {
				archive.file(fullPath, { name: path.relative(workspaceRoot, fullPath) });
			}
		}
	}

	await addFilesToArchive(workspaceRoot);
	await archive.finalize();
}

export function activate(context: vscode.ExtensionContext) {
	// 检查是否安装并启用了 waslong.vs-ex-ftp 插件
	const ftpExt = vscode.extensions.getExtension('waslong.vs-ex-ftp');
	if (ftpExt && ftpExt.isActive) {
		// 动态隐藏 recentFiles 视图
		vscode.commands.executeCommand('setContext', 'vs-ex-compress.hideRecentFiles', true);
		return;
	} else {
		vscode.commands.executeCommand('setContext', 'vs-ex-compress.hideRecentFiles', false);
	}

	init(context.extensionPath);
	const treeDataProvider = new RecentFilesTreeDataProvider();
	const treeView = vscode.window.createTreeView('recentFiles', {
		treeDataProvider,
		canSelectMany: true // 启用多选功能
	});

	// 监听文件系统更改事件
	const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*');
	fileSystemWatcher.onDidChange(() => treeDataProvider.throttledRefresh());
	fileSystemWatcher.onDidCreate(() => treeDataProvider.throttledRefresh());
	fileSystemWatcher.onDidDelete(() => treeDataProvider.throttledRefresh());

	const disposableRefresh = vscode.commands.registerCommand('vs-ex-compress.refreshRecentFiles', () => {
		treeDataProvider.refresh();
	});

	const disposableCompress = vscode.commands.registerCommand('vs-ex-compress.compressDirectory', async () => {
		if (!vscode.workspace.workspaceFolders) {
			vscode.window.showErrorMessage('No workspace is open.');
			return;
		}
		const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
		await compressDirectoryWithIgnore(workspaceRoot);
	});

	// 在 activate 函数中注册新命令
	const disposableCompressSelected = vscode.commands.registerCommand('vs-ex-compress.compressSelectedItems', async (item) => {
		if (!vscode.workspace.workspaceFolders) {
			vscode.window.showErrorMessage('No workspace is open.');
			return;
		}

		// 获取当前选中的 TreeItem
		let selectedItems = [...treeView.selection]; // 将 readonly Uri[] 转换为普通数组
		if (selectedItems.length <= 0) {
			selectedItems = [item];
		}
		const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
		await compressSelectedItems(selectedItems, workspaceRoot);
	});

	const disposableOpenSettings = vscode.commands.registerCommand('vs-ex-compress.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'compress');
	});
	context.subscriptions.push(disposableOpenSettings);

	context.subscriptions.push(disposableRefresh);
	context.subscriptions.push(disposableCompress);
	context.subscriptions.push(disposableCompressSelected);
	context.subscriptions.push(treeView);
	context.subscriptions.push(fileSystemWatcher);
}

export function deactivate() { }