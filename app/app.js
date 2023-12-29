import { CORE_ELEMENTS } from "./constants.js";
// import { demoGenerateNavigationMenu } from "./helpers.js";
import htmlFolderInnerCard from "./htmlFolderInnerCard.js";

/* INIT */
const init = () => {
  Object.entries(CORE_ELEMENTS).forEach(([key, value]) => {
    htmlFolderInnerCard(value, document.querySelector(`#demo-${key} > details`));
  });


};

document.addEventListener("DOMContentLoaded", init);
