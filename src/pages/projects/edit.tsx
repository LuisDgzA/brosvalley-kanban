import { useParams } from "react-router";

import { ProjectFormPage } from "./ProjectForm";

export const ProjectsEdit = () => {
  const { id } = useParams();

  if (!id) {
    return null;
  }

  return <ProjectFormPage action="edit" projectId={id} />;
};
