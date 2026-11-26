export function schoolHref(school: string) {
  return `/schools/${encodeURIComponent(school)}`;
}

export function departmentHref(school: string, department: string) {
  return `${schoolHref(school)}/departments/${encodeURIComponent(department)}`;
}

export function instructorHref(school: string, name: string) {
  return `/instructors/${encodeURIComponent(school)}/${encodeURIComponent(name)}`;
}
