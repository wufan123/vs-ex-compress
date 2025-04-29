import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
// 修改导入方式，使用默认导入
const archiver = require('archiver');

class RecentFilesTreeDataProvider implements vscode.TreeDataProvider<vscode.Uri> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.Uri | undefined | null | void> = new vscode.EventEmitter<vscode.Uri | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.Uri | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
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
			const today = new Date();
			if (mtime.toDateString() === today.toDateString()) {
				treeItem.description = ` \u21BB ${mtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
			} 
			// else {
			// 	treeItem.description = mtime.toISOString().split('T')[0];
			// }
		} catch (error) {
			console.error(`Error getting file stats for ${element.fsPath}:`, error);
		}

		return treeItem;
	}

	async getChildren(element?: vscode.Uri): Promise<vscode.Uri[]> {
		if (!vscode.workspace.workspaceFolders) {
			return [];
		}
		const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
		const files = await this.getFilesRecursively(workspaceRoot);
		const fileStats = await Promise.all(files.map(file => this.getFileStat(file)));
		const sortedFiles = fileStats.sort((a, b) => b.mtimeMs - a.mtimeMs).map(stat => vscode.Uri.file(stat.path));
		return sortedFiles;
	}

	private async getFilesRecursively(dir: string): Promise<string[]> {
		const entries = await fs.promises.readdir(dir, { withFileTypes: true });
		const files = await Promise.all(entries.map(entry => {
			const fullPath = path.join(dir, entry.name);
			return entry.isDirectory() ? this.getFilesRecursively(fullPath) : [fullPath];
		}));
		return files.flat();
	}

	private async getFileStat(filePath: string): Promise<{ path: string; mtimeMs: number }> {
		const stat = await fs.promises.stat(filePath);
		return { path: filePath, mtimeMs: stat.mtimeMs };
	}
}

async function compressDirectory(workspaceRoot: string) {
    // 获取当前工作目录名称作为压缩文件名
    const directoryName = path.basename(workspaceRoot);
    const outputPath = path.join(workspaceRoot, `${directoryName}.zip`);
    const output = fs.createWriteStream(outputPath);

    // 使用默认导入的 archiver 创建实例
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    output.on('close', () => {
        vscode.window.showInformationMessage(`Compression completed. Archive size: ${archive.pointer()} bytes`);
    });

    archive.on('error', (err: any) => {
        vscode.window.showErrorMessage(`Compression error: ${err.message}`);
    });

    archive.pipe(output);

    // 递归添加文件到压缩包，忽略 .zip 文件
    async function addFilesToArchive(dir: string) {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await addFilesToArchive(fullPath); // 递归处理子目录
            } else if (!entry.name.endsWith('.zip')) {
                archive.file(fullPath, { name: path.relative(workspaceRoot, fullPath) });
            }
        }
    }

    await addFilesToArchive(workspaceRoot); // 开始添加文件
    await archive.finalize(); // 完成压缩
}

async function compressSelectedItems(selectedItems: vscode.Uri[], workspaceRoot: string) {
    // 获取压缩文件名
    const outputPath = path.join(workspaceRoot, `selected-items.zip`);
    const output = fs.createWriteStream(outputPath);

    // 使用 archiver 创建实例
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    output.on('close', () => {
        vscode.window.showInformationMessage(`Compression completed. Archive size: ${archive.pointer()} bytes`);
    });

    archive.on('error', (err: any) => {
        vscode.window.showErrorMessage(`Compression error: ${err.message}`);
    });

    archive.pipe(output);

    // 添加选中的文件和文件夹到压缩包
    for (const item of selectedItems) {
        const relativePath = path.relative(workspaceRoot, item.fsPath);
        const stat = await fs.promises.stat(item.fsPath);
        if (stat.isDirectory()) {
            archive.directory(item.fsPath, relativePath);
        } else {
            archive.file(item.fsPath, { name: relativePath });
        }
    }

    await archive.finalize(); // 完成压缩
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "vs-ex-compress" is now active!');

	const treeDataProvider = new RecentFilesTreeDataProvider();
	const treeView = vscode.window.createTreeView('recentFiles', {
		treeDataProvider,
		canSelectMany: true // 启用多选功能
	});

	const disposableRefresh = vscode.commands.registerCommand('vs-ex-compress.refreshRecentFiles', () => {
		treeDataProvider.refresh();
	});

	const disposableCompress = vscode.commands.registerCommand('vs-ex-compress.compressDirectory', async () => {
		if (!vscode.workspace.workspaceFolders) {
			vscode.window.showErrorMessage('No workspace is open.');
			return;
		}
		const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
		await compressDirectory(workspaceRoot); 
	});

	// 在 activate 函数中注册新命令
	const disposableCompressSelected = vscode.commands.registerCommand('vs-ex-compress.compressSelectedItems', async () => {
	    if (!vscode.workspace.workspaceFolders) {
	        vscode.window.showErrorMessage('No workspace is open.');
	        return;
	    }

	    // 获取当前选中的 TreeItem
	    const selectedItems = [...treeView.selection]; // 将 readonly Uri[] 转换为普通数组
	    if (selectedItems.length === 0) {
	        vscode.window.showErrorMessage('No files or folders selected for compression.');
	        return;
	    }

	    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
	    await compressSelectedItems(selectedItems, workspaceRoot);
	});

	context.subscriptions.push(disposableRefresh);
	context.subscriptions.push(disposableCompress);
	context.subscriptions.push(disposableCompressSelected);
	context.subscriptions.push(treeView);
}

export function deactivate() { }