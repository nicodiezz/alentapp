import { createBrowserRouter } from "react-router";

import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import Layout from "./Layout";
import { MedicalCertificatesView } from "./views/MedicalCertificates";

export let router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      {
        path: "/",
        Component: HomeView,
      },
      {
        path: "/members",
        Component: MembersView,
      },
      {
        path: "/medical-certificates",
        Component: MedicalCertificatesView,
      },
    ],
  },
]);
