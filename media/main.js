//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  const oldState = vscode.getState() || { id: '', problemCode: '' };

  /** @type {Array<{ value: string }>} */
  let id = oldState.id,
    problemCode = oldState.problemCode;

  const idInput = document.querySelector('.id-input');
  const problemInput = document.querySelector('.problem-input');
  const resultDiv = document.querySelector('.result-div');

  init();

  function init() {
    idInput.value = id;
    problemInput.value = problemCode;
  }

  document.querySelector('.submit-form').addEventListener('submit', (event) => {
    submit(event);
  });

  function submit(event) {
    event.preventDefault();
    id = idInput.value;
    problemCode = problemInput.value;

    vscode.postMessage({ type: 'submit', id, problemCode });
    vscode.setState({ id, problemCode });
  }

  // Handle messages sent from the extension to the webview
  window.addEventListener('message', (event) => {
    const message = event.data; // The json data that the extension sent
    const { type } = message;

    while (resultDiv.firstChild) {
      resultDiv.removeChild(resultDiv.firstChild);
    }

    switch (type) {
      case 'updateResult': {
        const { path, emoji, result } = message;
        const pathSpan = document.createElement('span');
        pathSpan.innerHTML = `<bold>${path}</bold>`;
        resultDiv.append(pathSpan);

        const emojiSpan = document.createElement('span');
        emojiSpan.innerText = emoji;
        resultDiv.append(emojiSpan);

        result.forEach((/** @type {string} */ result) => {
          const span = document.createElement('span');
          span.innerText = result;
          resultDiv.appendChild(span);
        });
        break;
      }
    }
  });
})();
