# vs-ex-compress README

This is the README for your extension "vs-ex-compress". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**

# vs-ex-compress

## 插件功能

`vs-ex-compress` 是一个 VS Code 插件，旨在帮助用户快速压缩文件和文件夹。以下是插件的主要功能：

### 1. 最近修改文件视图
- 在资源管理器中显示最近修改的文件。
- 支持多选文件进行操作。

### 2. 压缩当前目录
- 一键压缩当前工作区的根目录。
- 支持通过正则表达式忽略特定文件和文件夹。

### 3. 压缩选定文件或文件夹
- 支持在最近修改文件视图中选择多个文件或文件夹进行压缩。

### 4. 自定义设置
- 提供 `compress.m01.ignore` 配置项，允许用户通过正则表达式忽略特定文件或目录。

### 5. 国际化支持
- 提供多语言支持，目前支持中文和英文。

## 使用方法

1. 打开工作区。
2. 在资源管理器中找到“最近修改的文件”视图。
3. 选择需要压缩的文件或文件夹，右键选择“压缩选定的项目”。
4. 或者，点击视图标题栏中的“压缩当前目录”按钮。

## 配置项

- `compress.m01.ignore`: 忽略需要压缩的文件和目录，支持正则表达式。

## 快捷命令

- `vs-ex-compress.refreshRecentFiles`: 刷新最近修改的文件。
- `vs-ex-compress.compressDirectory`: 压缩当前目录。
- `vs-ex-compress.compressSelectedItems`: 压缩选定的文件或文件夹。
- `vs-ex-compress.openSettings`: 打开压缩设置。

## 图标

插件提供了直观的图标，方便用户快速识别功能：
- `zip1.svg`: 用于压缩当前目录。
- `zip2.svg`: 用于压缩选定的文件或文件夹。

## 反馈与支持

如果您在使用过程中遇到问题或有改进建议，请通过 GitHub 提交 issue。
