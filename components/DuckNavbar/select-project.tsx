import { useMemo } from "react";
import { DuckIcon } from "@/components/DuckNavbar/icons";
import NextLink from "next/link";
import { Link } from "@heroui/link";

interface Project {
  href: string;
  label: string;
  description?: string;
  icon?: string;
  is_disabled?: boolean;
  is_authorized?: boolean;
}

interface SelectProjectProps {
  projects: Project[];
  siteUrl: string;
}

const SelectProject: React.FC<SelectProjectProps> = ({ projects, siteUrl }) => {
  const filteredProjects = useMemo(
    () => projects.filter((p) => p.href !== siteUrl),
    [projects, siteUrl]
  );
  const selectedProject = useMemo(
    () => projects.find((p) => p.href === siteUrl),
    [projects, siteUrl]
  );

  return (
    <>
      <style>
        {`
        #projects {
          opacity: 0;
          max-height: 0;
        }
        #logo:hover ~ #projects, #projects:hover {
          opacity: 1;
          max-height: 1000px;
        }
      `}
      </style>
      <Link
        as={NextLink}
        id="logo"
        className="flex justify-start items-center gap-2 text-transparent hover:text-[#F97316]"
        href="/"
      >
        {selectedProject?.icon && <DuckIcon name={selectedProject.icon} className="duration-200 stroke-foreground" />}
        <p className="font-bold text-foreground">{selectedProject?.label}</p>
      </Link>
      <ul
        id="projects"
        className="absolute top-14 -left-2 flex flex-col overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:opacity-100 transition-all delay-200"
      >
        <li className="text-sm leading-none p-2">інші проєкти:</li>
        {filteredProjects.map((project) => (
          <li key={project.href}>
            <Link
              as={NextLink}
              className="flex justify-start items-center p-2 gap-2 text-transparent hover:text-[#F97316] hover:bg-gray-100 dark:hover:bg-gray-800 py-2 rounded-lg"
              href={project.href}
              isDisabled={project.is_disabled}
            >
              {project.icon && <DuckIcon name={project.icon} className="duration-200 stroke-foreground" />}
              <div>
                <p className="font-medium text-base leading-tight text-foreground">{project.label}</p>
                <p className="opacity-80 text-sm leading-none text-foreground">{project.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};

export default SelectProject;
