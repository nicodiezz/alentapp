import { createBrowserRouter } from "react-router";

import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { DisciplinesView } from "./views/Disciplines";
import { SportsView } from "./views/Sports";
import Layout from "./Layout";

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
        path: "/sports",
        Component: SportsView,
      },
      {
        path: "/disciplines",
        Component: DisciplinesView,
      },
    ],
  },
]);
