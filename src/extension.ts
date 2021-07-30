// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ExtensionContext, commands } from 'vscode';

import {
  getProblemCode,
  getTextFromEditor,
  submitCode,
  getUserId,
} from './submit';

export function activate(context: ExtensionContext) {
  console.log('Congratulations, your extension "jcode-jota" is now active!');

  const command = 'jcode-jota.submitCode';

  const disposable = commands.registerCommand(command, () => {
    getProblemCode().then((problemCode) => {
      if (!problemCode) return;
      const sourceCode = getTextFromEditor();
      if (!sourceCode) return;
      const userId = getUserId();
      if (!userId) return;

      submitCode(userId, problemCode, sourceCode);
    });
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
