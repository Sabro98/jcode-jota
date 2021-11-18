// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ExtensionContext, commands, window } from 'vscode';
import { showDetails } from './function';
import { submitCode } from './submit';
import { getTextFromEditor, getProblemCode, getUserInfo } from './userHandle';

export function activate(context: ExtensionContext) {
  console.log('Start');
  // 커맨드 코드
  const command = 'jcode-jota.submitCode';
  const disposable = commands.registerCommand(command, async () => {
    const userInfo = await getUserInfo();
    if (!userInfo) return;
    const { userID, currentSubmit } = userInfo;
    const problemCode = await getProblemCode(userID, currentSubmit);
    if (!problemCode) return;
    const sourceCode = getTextFromEditor();
    if (!sourceCode) return;

    const submitResultObj = await submitCode(userID, problemCode, sourceCode);
    if (!submitResultObj) return;
    const submitResult = submitResultObj.finalResult;
    const JotaURL = submitResultObj.JotaURL;

    const emoji = submitResult[1].split(' ');
    let displayResult = `${problemCode} → `;
    emoji.forEach((emo, index) => {
      displayResult += `#${index + 1}: ${emo}  `;
    });

    //최종 결과를 보여줄 때 여기에서 JotaURL으로 이동하는 버튼을 같이 보여주면 될듯
    // console.log(JotaURL);
    const buttonText = 'Show Details';
    const click = await window.showInformationMessage(
      displayResult,
      buttonText
    );
    if (!click) return;
    showDetails(JotaURL); // 버튼 누르면 jota 채점 페이지로 이동
  });

  context.subscriptions.push(disposable);

  // // webview view 활성화 코드
  // // 활성화를 위해 package.json의 내용 중
  // // activationEvents: "onView:jcode.submissionView" 추가
  // // contributes:
  // // "views": {
  // //   "explorer": [
  // //     {
  // //       "type": "webview",
  // //       "id": "jcode.submissionView",
  // //       "name": "Submit Code"
  // //     }
  // //   ]
  // // },
  // // 추가 필요

  // const provider = new SubmissionViewProvider(context.extensionUri);
  // context.subscriptions.push(
  //   vscode.window.registerWebviewViewProvider(
  //     SubmissionViewProvider.viewType,
  //     provider
  //   )
  // );
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

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'submit':
          const { id, problemCode } = data;
          if (!problemCode) return;
          if (!id) return;
          const sourceCode = getTextFromEditor();
          if (!sourceCode) return;

          const resultsObj = await submitCode(id, problemCode, sourceCode);
          const results = resultsObj?.finalResult;
          if (results) this.updateResult(results);
      }
    });
  }

  private updateResult(results: string[]) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'updateResult',
        path: results[0],
        emoji: results[1],
        result: results.slice(2),
      });
    }
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
        <form class="submit-form">
          <span>ID</span>
          <input type="text" placeholder="Write ID" class="id-input required"/>
          <span>Problem Code</span>
          <input type="text" placeholder="Write Problem Code" class="problem-input required"/>
          <input type="submit" value="Submit!"/>
        </form>
        <div class="result-div">
        
        </div>
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
