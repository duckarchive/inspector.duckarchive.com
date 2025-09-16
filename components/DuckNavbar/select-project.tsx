import { useMemo, useState } from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { IoChevronDown } from "react-icons/io5";
import { Logo } from "@/components/icons";
import { ICONS } from "@/components/DuckNavbar/icons";

interface Project {
  href: string;
  name: string;
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
  const selectedProject = projects.find((p) => p.href === selectedKey);

  return (
    <Dropdown
      triggerScaleOnOpen={false}
      placement="bottom-start"
      radius="sm"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      crossOffset={-17}
    >
      <DropdownTrigger>
        <div className="text-transparent hover:text-warning flex justify-start items-center gap-1 cursor-pointer">
          {selectedProject?.icon || <Logo className="duration-200 stroke-foreground" />}
          <p className="font-bold text-foreground">{selectedProject?.name || label}</p>
          <IoChevronDown className={`${isOpen ? "rotate-180" : ""} transition-transform inline`} />
        </div>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Project selection"
        variant="faded"
        selectionMode="single"
        selectedKeys={new Set(selectedKey ? [selectedKey] : [])}
        onAction={(key) => onSelect(String(key))}
        disabledKeys={projects.filter((p) => p.is_disabled).map((p) => p.href)}
      >
        {projects.map((project) => (
          <DropdownItem
            key={project.href}
            description={project.description}
            startContent={project.icon && ICONS[project.icon]}
            href={project.href}
          >
            {project.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default SelectProject;
