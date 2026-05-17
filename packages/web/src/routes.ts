import { createBrowserRouter } from "react-router";

import { MembersView } from "./views/Members";
import { PaymentsView } from "./views/Payments";
import { HomeView } from "./views/Home";
import { DisciplinesView } from "./views/Disciplines";
import { SportsView } from "./views/Sports";
import { LockersView } from "./views/Lockers";
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
        path: "/payments",
        Component: PaymentsView,
      },
      {
        path: "/sports",
        Component: SportsView,
      },
      {
        path: "/lockers",
        Component: LockersView,
      },
      {
        path: "/disciplines",
        Component: DisciplinesView,
      },
      {
       path: "/medical-certificates",
        Component: MedicalCertificatesView,
      },
    ],
  },
]);
