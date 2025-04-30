# vs-ex-compress

## Features

`vs-ex-compress` is a VS Code extension designed to help users quickly compress files and folders. Below are the main features of the extension:

### 1. Recent Modified Files View
- Displays recently modified files in the Explorer.
- Supports multi-selection for operations.

### 2. Compress Current Directory
- One-click compression of the root directory of the current workspace.
- Supports ignoring specific files and folders using regular expressions.

### 3. Compress Selected Files or Folders
- Allows selecting multiple files or folders in the recent modified files view for compression.

### 4. Custom Settings
- Provides the `compress.m01.ignore` configuration option to allow users to ignore specific files or directories using regular expressions.

### 5. Internationalization Support
- Offers multi-language support, currently available in English and Chinese.

## How to Use

1. Open a workspace.
2. Locate the "Recent Modified Files" view in the Explorer.
3. Select the files or folders you want to compress, right-click, and choose "Compress Selected Items."
4. Alternatively, click the "Compress Current Directory" button in the view's title bar.

## Configuration

- `compress.m01.ignore`: Ignore files and directories to compress, supports regular expressions.

## Commands

- `vs-ex-compress.refreshRecentFiles`: Refresh recent modified files.
- `vs-ex-compress.compressDirectory`: Compress the current directory.
- `vs-ex-compress.compressSelectedItems`: Compress selected files or folders.
- `vs-ex-compress.openSettings`: Open compression settings.

## Icons

The extension provides intuitive icons for quick recognition of features:
- `zip1.svg`: For compressing the current directory.
- `zip2.svg`: For compressing selected files or folders.

## Feedback and Support

If you encounter any issues or have suggestions for improvement, please submit an issue on GitHub.