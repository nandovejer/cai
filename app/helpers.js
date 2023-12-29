const setAndReplaceCode = () => {
  const codeInput = document.querySelectorAll("details article");
  codeInput.forEach((section) => {
    const codeOutput = section
      ?.querySelector("main")
      .innerHTML.replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const codeContainer = section?.querySelector("code");
    codeContainer.innerHTML = codeOutput;
  });
};

/*   const demoGenerateNavigationMenu = (data, outputSelector) => {
    if (!outputSelector) return;
  
    let menuHtml = "<ul>";
  
    for (const category in data) {
      if (data[category].length > 0) {
        menuHtml += `<li><strong>${category}</strong><ul>`;
        data[category].forEach((item) => {
          menuHtml += `<li><a href="#${item}">${item}</a></li>`;
        });
        menuHtml += "</ul></li>";
      }
    }
  
    menuHtml += "</ul>";
  
    outputSelector.innerHTML = menuHtml;
  }; */

const escapeHTML = (htmlString) =>
  htmlString.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();


const cleanHTML = (htmlString) => {
  let parser = new DOMParser();
  let doc = parser.parseFromString(htmlString, "text/html");
  doc.querySelectorAll("script").forEach((script) => script.remove());
  doc.querySelectorAll("link").forEach((link) => link.remove());
  return doc.querySelector("body").innerHTML;
};

export { setAndReplaceCode,  escapeHTML, cleanHTML };