import { useMemo, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import { Logo } from "@/components/icons";
import { DuckIcon } from "@/components/DuckNavbar/icons";
import { NavbarItem } from "@heroui/navbar";
import NextLink from "next/link";
import { Link } from "@heroui/link";
import clsx from "clsx";

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
  selectedKey?: string;
  onSelect: (key: string) => void;
  label?: string;
}

const SelectProject: React.FC<SelectProjectProps> = ({ projects, selectedKey, onSelect, label = "Інспектор" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const filteredProjects = projects.filter((p) => p.href !== selectedKey);
  const selectedProject = projects.find((p) => p.href === selectedKey);

  console.log("Selected project:", filteredProjects);

  return (
    <div className="relative group z-30">
      <style>
        {`
        #projects {
          max-height: 0;
        }
        #logo:hover ~ #projects, #projects:hover {
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
        <DuckIcon name={selectedProject?.icon} className="duration-200 stroke-foreground" />
        <p className="font-bold text-foreground">{selectedProject?.label || label}</p>
      </Link>
      <ul
        id="projects"
        className="absolute top-10 -left-2 flex flex-col opacity-0 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg group-hover:opacity-100 transition-all delay-200"
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
              <DuckIcon name={project.icon} className="duration-200 stroke-foreground" />
              <div>
                <p className="font-medium text-base leading-tight text-foreground">{project.label || label}</p>
                <p className="opacity-80 text-sm leading-none text-foreground">{project.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SelectProject;
