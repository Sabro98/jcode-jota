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

  // const command = 'jcode-jota.submitCode';

  // const disposable = commands.registerCommand(command, () => {
  //   getProblemCode().then((problemCode) => {
  //     if (!problemCode) return;
  //     const sourceCode = getTextFromEditor();
  //     if (!sourceCode) return;
  //     const userId = getUserId();
  //     if (!userId) return;

  //     submitCode(userId, problemCode, sourceCode);
  //   });
  // });

  const provider = new SubmissionViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SubmissionViewProvider.viewType,
      provider
    )
  );
  // context.subscriptions.push(disposable);
}

class SubmissionViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'jcode.submissionView';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // ?
    webviewView.webview.onDidReceiveMessage((data) => {
      console.log('HI');
      switch (data.type) {
        case 'colorSelected': {
          vscode.window.activeTextEditor?.insertSnippet(
            new vscode.SnippetString(`#${data.value}`)
          );
          break;
        }
        default:
          console.log('HI');
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
    );

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css')
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css')
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css')
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>Submission Code</title>
			</head>
			<body>
				<ul class="color-list">
				</ul>
        <form class="submit-code">
          <span>ID</span>
          <input name="ID" type="text" placeholder="Write your ID"/>
          
          <span>ProblemCode</span>
          <input name="ID" type="text" placeholder="Write problem code"/>
        </form>
        <button class="submit-code"> Submit! </button>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// this method is called when your extension is deactivated
export function deactivate() {}
