import { type CourseLevel, type DepartmentGroup, GRADUATE, UNDERGRADUATE } from './departments';

const GROUPS: Record<CourseLevel, readonly DepartmentGroup[]> = {
  undergraduate: UNDERGRADUATE,
  graduate: GRADUATE,
};

function withoutSpaces(words: string): string {
  return words.replaceAll(/\s/gu, '');
}

// The groups of a course level with the departments that a search finds: those whose name, or whose group's name,
// holds the searched words. Spaces do not count. A group that holds none is left out; no words find everything.
export function searchDepartments(level: CourseLevel, words: string): DepartmentGroup[] {
  const searched = withoutSpaces(words);
  return GROUPS[level]
    .map((group) => ({
      name: group.name,
      departments: withoutSpaces(group.name).includes(searched)
        ? group.departments
        : group.departments.filter((department) => withoutSpaces(department).includes(searched)),
    }))
    .filter((group) => group.departments.length > 0);
}

export function isDepartment(level: CourseLevel, name: string): boolean {
  return GROUPS[level].some((group) => group.departments.includes(name));
}
