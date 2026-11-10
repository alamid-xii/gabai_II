export function roleHome(role) {
  return { admin: "/admin", registrar: "/registrar", teacher: "/teacher", student: "/my-enrollments" }[role] || "/login";
}
