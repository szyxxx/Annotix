import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { NameGate } from "./components/NameGate";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectPage } from "./pages/ProjectPage";
import { EditorPage } from "./pages/EditorPage";

const router = createBrowserRouter([
  { path: "/", element: <ProjectsPage /> },
  { path: "/p/:projectId", element: <ProjectPage /> },
  { path: "/p/:projectId/annotate/:imageId", element: <EditorPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NameGate>
      <RouterProvider router={router} />
    </NameGate>
  </StrictMode>,
);
