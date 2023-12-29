import { escapeHTML, cleanHTML } from "./helpers.js";



const injectHTML = (filePath, output, name) => {
  fetch(filePath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.text();
    })
    .then((html) => {
      const pureHTML = cleanHTML(html);
      const codeScaped = escapeHTML(pureHTML);
      const tpl = `
  <article data-cai-tag="card" id="${name}">
      <header>
          <hgroup>
          <h2>${name}</h2>
          </hgroup>
      </header>
      <main data-cai-tag="demo">${pureHTML}</main>
      <footer>
  <pre><code>${codeScaped}</code></pre>
      </footer>
  </article>
                  `;

      output.insertAdjacentHTML("beforeend", tpl);
   
    })
    .catch((error) => {
      console.error(
        `There was a problem with the fetch operation: ${name}`,
        error
      );
    });
};

const htmlFolderInnerCard = (arrayComponents, outputContainer) => {
  arrayComponents.map((component) => {
    injectHTML(`../html/${component}.html`, outputContainer, component);
  });
};

export default htmlFolderInnerCard;
