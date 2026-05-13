import {
  Authenticated,
  Refine,
} from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import { useNotificationProvider } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import { authProvider, dataProvider, liveProvider } from "./providers";
import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { App as AntdApp, ConfigProvider } from "antd";
import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import {
  ForgotPassword,
  Home,
  Kanban,
  Login,
  ProjectsCreate,
  ProjectsEdit,
  ProjectsList,
  ProjectsShow,
  Register,
  UpdatePassword,
} from "./pages";
import Layout from "./components/layout/index";
import { appTheme } from "./theme";

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ConfigProvider theme={appTheme}>
          <AntdApp>
            <DevtoolsProvider>
              <Refine
                dataProvider={dataProvider}
                liveProvider={liveProvider}
                notificationProvider={useNotificationProvider}
                routerProvider={routerProvider}
                authProvider={authProvider}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  projectId: "US19gb-DrXOkr-nnZJjn",
                }}
                resources={[
                  {
                    name: "home",
                    list: "/",
                    meta: {
                      label: "Home",
                    },
                  },
                  {
                    name: "projects",
                    list: "/projects",
                    create: "/projects/create",
                    edit: "/projects/edit/:id",
                    show: "/projects/show/:id",
                  },
                  {
                    name: "tasks",
                    list: "/kanban",
                  },
                  {
                    name: "profiles",
                  },
                  {
                    name: "project_members",
                  },
                ]}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="auth-pages"
                        fallback={<Outlet />}
                      >
                        <NavigateToResource resource="home" />
                      </Authenticated>
                    }
                  >
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                  </Route>

                  <Route
                    element={
                      <Authenticated
                        key="authenticated-layout"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <Layout>
                          <Outlet />
                        </Layout>
                      </Authenticated>
                    }
                  >
                    <Route index element={<Home />} />
                    <Route path="/projects" element={<ProjectsList />} />
                    <Route path="/projects/create" element={<ProjectsCreate />} />
                    <Route path="/projects/edit/:id" element={<ProjectsEdit />} />
                    <Route path="/projects/show/:id" element={<ProjectsShow />} />
                    <Route path="/kanban" element={<Kanban />} />
                  </Route>

                  <Route path="*" element={<CatchAllNavigate to="/" />} />
                </Routes>
                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ConfigProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
