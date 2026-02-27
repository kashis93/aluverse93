import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { getDatabase } from "firebase/database";
const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
