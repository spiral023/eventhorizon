// frontend/src/utils/greeting.ts

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) {
    return "Guten Morgen";
  }
  if (hour < 18) {
    return "Guten Tag";
  }
  return "Guten Abend";
}
